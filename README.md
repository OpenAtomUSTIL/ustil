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

前置：Node 24（`.nvmrc` 锁定）、pnpm、Docker。

**1）数据库与 Redis（dev 容器）**：`deploy/docker-compose.yml` 的 `pg` / `redis` 不映射宿主端口（只服务 compose 内部网络），宿主机上直接跑的后端连不上。本地开发起独立 dev 容器，映射到宿主高位端口：

```bash
docker run -d --name ustil-dev-pg \
  -e POSTGRES_USER=ustil -e POSTGRES_PASSWORD=change-me -e POSTGRES_DB=ustil \
  -p 55432:5432 -v ustil-dev-pgdata:/var/lib/postgresql/data \
  postgres:16-alpine

docker run -d --name ustil-dev-redis \
  -p 56379:6379 -v ustil-dev-redisdata:/data \
  redis:7-alpine
```

**2）后端**：

```bash
cd ustil-hub
pnpm install
cp .env.example .env        # 替换 JWT / APP_ENCRYPTION_KEY 占位值；端口已对齐 dev 容器：
                            #   DATABASE_URL=postgres://ustil:change-me@localhost:55432/ustil
                            #   REDIS_URL=redis://localhost:56379
pnpm db:migrate             # 首次 / 结构变更后执行（幂等，读 .env 的 DATABASE_URL）
pnpm seed:admin             # 初始 ADMIN 种子（幂等，读 ADMIN_EMAIL / ADMIN_PASSWORD）
pnpm start:dev              # 本地开发（watch，默认 :3000）
```

**3）前端**：

```bash
cd ustil-front
pnpm install
pnpm dev                    # Vite 开发服务器（:5173，/api 代理到 :3000）
```

常用命令：

| 位置 | 命令 | 说明 |
|---|---|---|
| ustil-hub | `pnpm lint` / `pnpm test` / `pnpm test:e2e` | 质量门（43 单测 + 22 e2e） |
| ustil-hub | `pnpm db:generate` / `pnpm db:migrate` | 生成 / 执行迁移 |
| ustil-hub | `pnpm seed:admin` | 初始 ADMIN 种子（幂等，读 `ADMIN_EMAIL` / `ADMIN_PASSWORD`） |
| ustil-front | `pnpm typecheck` / `pnpm lint` / `pnpm build` | 质量门 |

本地开发常见坑（实测）：

- **端口别配错**：dev 库在宿主 **55432** / **56379**（不是 5432 / 6379）。`.env.example` 已对齐；沿用旧 `.env` 的记得改端口，或启动时用环境变量覆盖 `DATABASE_URL` / `REDIS_URL`。端口不对的典型症状：连不上库；验证码、登录限流、refresh token 白名单等 Redis 功能失效。
- **3000 端口冲突**：本机常有旧 hub 进程占用 3000（连的可能还是失效配置）；另起实例验证时错开端口，如 `PORT=3010 pnpm start:dev`。
- **全局只能有一个 ADMIN**：users 表有 `users_admin_role_key` 部分唯一约束，`pnpm seed:admin` 在已存在其他 ADMIN 时拒绝新建。需要多套后台验证账号时，用 SQL 把测试用户临时提为 `WHEEL`（WHEEL 可进管理后台），用完降回。
- **敏感操作带图形验证码**：登录 / 注册 / 改密等均需图形验证码（Redis 存 sha256、5 分钟 TTL、3 次失败作废）；自动化登录需处理验证码。
- **会话 cookie 为 `secure: true`**：浏览器把 localhost 视为安全上下文，正常使用没问题；curl 在 http 下既不存也不回传 cookie。自动化请用浏览器会话（如 Playwright），或从登录响应头捕获 Set-Cookie 后注入浏览器上下文。

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
