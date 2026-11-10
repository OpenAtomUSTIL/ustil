# USTIL 社区网站

开放原子 USTIL（University Student Technology & Innovation Lab）学生开源社区的官网 / 门户。本质是一个 **RBAC 权限系统**：三级角色（`ADMIN` / `ALUMNI` / `MEMBER`），提供文章、作业、Issue 讨论等能力，敏捷迭代——先上线最小可用版本，再持续演进。

本仓库为 **monorepo**，存储前后端全部项目代码与部署设施（原 `ustil-hub` / `ustil-front` 仓库已并入本仓库并保留提交历史，仅作归档）。

## 仓库结构

```
ustil/
├── ustil-hub/        后端：NestJS + Drizzle + PostgreSQL + Redis
├── ustil-front/      前端：Vue 3 + Vite + TypeScript + Pinia
├── deploy/           部署：docker compose 编排、nginx 反代、Jenkins 流水线
├── 初期需求及技术栈.md          产品需求与技术选型
└── 社团网站技术栈学习路线.md    新人学习路线
```

## 技术栈

| 层 | 选型 |
|---|---|
| 运行时 | Node.js 20 LTS（`.nvmrc` 锁定）+ pnpm |
| 后端 | NestJS（CJS + TS strict）、Drizzle ORM、Argon2id、JWT 双 token（httpOnly cookie） |
| 数据库 | PostgreSQL 16（迁移由部署 job 幂等执行） |
| 缓存 / 限流 | Redis 7（登录限流、refresh token 白名单） |
| 前端 | Vue 3（Composition API）、Vite、Pinia、marked + DOMPurify |
| 部署 | Docker Compose（pg + redis + api + web/nginx + migrate）、Jenkins |

## 本地开发

前置：Node 20、pnpm；数据库与 Redis 可用 `docker compose up -d pg redis`（见 `deploy/`）。

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
| ustil-hub | `pnpm lint` / `pnpm test` / `pnpm test:e2e` | 质量门（19 单测 + 8 守卫冒烟） |
| ustil-hub | `pnpm db:generate` / `pnpm db:migrate` | 生成 / 执行迁移 |
| ustil-front | `pnpm typecheck` / `pnpm lint` / `pnpm build` | 质量门 |

## Docker 部署

```bash
cd deploy
cp .env.example .env        # 填 JWT 密钥、POSTGRES_PASSWORD 等真实值
docker compose up -d --build
docker compose --profile migrate run --rm migrate   # 部署前执行（幂等）
```

访问 `http://localhost`：nginx 托管前端静态文件并把 `/api/` 反代到后端。

> 迁移红线：启动命令不跑迁移，迁移只由部署 job 幂等执行（避免多实例并发）。

## CI/CD（Jenkins）

流水线定义在 `deploy/Jenkinsfile`，控制器镜像与初始化脚本在 `deploy/jenkins/`（含凭据与 `ustil-deploy` 任务的幂等初始化）。

阶段：**质量门**（后端 lint/test/e2e、前端 typecheck/lint/build）→ **构建镜像**（api / api-migrate / web）→ **幂等迁移** → **compose 部署**。

- 手动触发部署；参数 `REGISTRY` / `IMAGE_TAG` / `PUSH_IMAGES`（本地部署无需推送镜像时留默认）
- 有正式镜像仓库时：`REGISTRY=<仓库前缀>` + `PUSH_IMAGES=true` 即可推送

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
| [初期需求及技术栈.md](初期需求及技术栈.md) | 产品需求与技术选型 |
| [社团网站技术栈学习路线.md](社团网站技术栈学习路线.md) | 新人学习路线 |
