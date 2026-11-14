# USTIL 社区网站

开放原子 USTIL（University Student Technology & Innovation Lab）学生开源社区的官网 / 门户。本质是一个 **RBAC 权限系统**：五角色（`VISITOR` / `MEMBER` / `ALUMNI` / `WHEEL` / `ADMIN`），提供文章、作业、Issue 讨论、管理后台（邀请码、用户管理）等能力，敏捷迭代——先上线最小可用版本，再持续演进。

本仓库为 **monorepo**，存储前后端全部项目代码与部署设施（原 `ustil-hub` / `ustil-front` 仓库已并入本仓库并保留提交历史，仅作归档）。

## 仓库结构

```
ustil/
├── ustil-hub/        后端：NestJS + Drizzle + PostgreSQL + Redis
├── ustil-front/      前端：Vue 3 + Vite + TypeScript + Pinia
├── deploy/           部署：docker compose 编排、nginx 反代
└── 社团网站技术栈学习路线.md    新人学习路线
```

## 技术栈

| 层 | 选型 |
|---|---|
| 运行时 | Node.js 24 LTS（`.nvmrc` 锁定）+ pnpm |
| 后端 | NestJS（CJS + TS strict）、Drizzle ORM、Argon2id、JWT 双 token（httpOnly cookie） |
| 数据库 | PostgreSQL 16（迁移由部署 job 幂等执行） |
| 缓存 / 限流 | Redis 7（登录限流、refresh token 白名单） |
| 前端 | Vue 3（Composition API）、Vite、Pinia、marked + DOMPurify |
| 部署 | Docker Compose（pg + redis + api + web/nginx + migrate）、GitHub Actions |

## 本地开发

前置：Node 24、pnpm；数据库与 Redis 可用 `docker compose up -d pg redis`（见 `deploy/`）。

```bash
# 后端
cd ustil-hub
pnpm install
cp .env.example .env        # 按需修改 DATABASE_URL / REDIS_URL 等
pnpm start:dev              # 本地开发（watch）

# 前端
cd ustil-front
pnpm install
pnpm dev                    # Vite 开发服务器
```

常用命令：

| 位置 | 命令 | 说明 |
|---|---|---|
| ustil-hub | `pnpm lint` / `pnpm test` / `pnpm test:e2e` | 质量门（43 单测 + 22 e2e） |
| ustil-hub | `pnpm db:generate` / `pnpm db:migrate` | 生成 / 执行迁移 |
| ustil-hub | `pnpm seed:admin` | 初始 ADMIN 种子（幂等，读 `ADMIN_EMAIL` / `ADMIN_PASSWORD`） |
| ustil-front | `pnpm typecheck` / `pnpm lint` / `pnpm build` | 质量门 |

## Docker 部署

```bash
cd deploy
cp .env.example .env        # 填 JWT 密钥、POSTGRES_PASSWORD 等真实值
bash init-certs.sh          # 生成自签 TLS 证书（生产换成 CA 签发，放 nginx/certs/）
docker compose up -d --build
docker compose --profile migrate run --rm migrate   # 部署前执行（幂等）
docker compose --profile seed run --rm seed         # 初始 ADMIN 种子（幂等，可选）
```

访问 `https://localhost`：nginx 托管前端静态文件并把 `/api/` 反代到后端；80 强制跳转 HTTPS（自签证书浏览器会告警，生产换 CA 证书即消失）。

反代地址识别：当前链路为“浏览器 → web/nginx → api”。Compose 默认注入 `TRUST_PROXY_HOPS=1`，后端按一跳代理读取客户端 IP；Nginx 使用 `$remote_addr` 覆盖 `X-Forwarded-For`，防止客户端伪造地址。登录限流、登录日志和请求日志均使用后端解析的 IP。`api` 必须保持没有公网端口映射；本地直连使用 `ustil-hub/.env.example` 中的 `TRUST_PROXY_HOPS=0`。

如果入口前增加 CDN、负载均衡或宿主机反代，需先在 Nginx 配置 `set_real_ip_from`（仅填写实际可信上游网段）及其真实 IP 请求头，并阻止外部绕过入口访问源站，再继续向后端传递校验后的 `$remote_addr`。不要直接信任所有转发头，也不要仅增加代理跳数。

注册保护：后端在密码哈希前使用 Redis 原子计数，同一客户端 IP 每 15 分钟最多 10 次注册尝试（失败也计数），超限返回 429。Nginx 对注册入口另设每分钟 5 次、突发 5 次的入口限流；直连后端仍受 Redis 计数保护。同一 NAT 出口共享 IP 预算。

反代或注册限流配置变更后：在 `deploy/` 执行 `docker compose up -d --build api`，再执行 `docker compose exec web nginx -t` 和 `docker compose exec web nginx -s reload`。只修改 Nginx 配置不会启用后端的代理信任。

> 迁移红线：启动命令不跑迁移，迁移只由部署 job 幂等执行（避免多实例并发）。

## CI/CD（GitHub Actions）

| 工作流 | 触发 | 内容 |
|---|---|---|
| `.github/workflows/ci.yml` | PR、push main | 质量门：后端 lint / test / e2e，前端 typecheck / lint / build（PR 页可直接看 check 状态） |
| `.github/workflows/release.yml` | push main、手动 | 构建 api / api-migrate / web 三镜像并推送到 GHCR（`ghcr.io/<owner>/ustil-*:sha` 与 `latest`） |

部署在目标主机执行（拉取 CI 产物镜像即可，无需现场构建）：

```bash
cd deploy
cp .env.example .env                       # 填真实密钥
export REGISTRY=ghcr.io/<owner>            # 使用 GHCR 镜像
docker compose pull
docker compose --profile migrate run --rm migrate   # 幂等迁移
docker compose up -d
```

## API 约定（摘要）

前后端联调的唯一事实来源是 [`ustil-hub/AGENTS.md`](ustil-hub/AGENTS.md) §4：

- 前缀 `/api/v1`；成功直接返回业务体，失败固定结构 `{ statusCode, error, message, path, timestamp }`
- 分页 `?page=1&pageSize=20` → `{ items, total, page, pageSize }`（pageSize 上限 100）
- 时间一律 ISO 8601 UTC；JSON `camelCase`；主键 uuid v7

## 文档索引

| 文档 | 内容 |
|---|---|
| [ustil-hub/AGENTS.md](ustil-hub/AGENTS.md) | 后端规格 + 跨端契约（**唯一事实来源**）、权限矩阵、安全红线 |
| [ustil-front/AGENTS.md](ustil-front/AGENTS.md) | 前端红线（唯一请求出口、鉴权状态、上传与倒计时规则） |
| [社团网站技术栈学习路线.md](社团网站技术栈学习路线.md) | 新人学习路线 |
