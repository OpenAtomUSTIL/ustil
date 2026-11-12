# AGENTS.md — ustil-hub 前端红线

> 本文件锁「不可协商的红线与契约」，不规定具体页面实现。
> 目录结构、UI 库、状态管理等选型已落地，见 §10 —— **`MUST NOT` 擅自更换**。
>
> 后端细则见仓库根 `AGENTS.md`。两边冲突时以根文件为准（跨端契约的唯一事实来源）。

---

## 1. 技术栈锁定

| 项 | 选型 | 说明 |
|---|---|---|
| 框架 | **Vue 3**（Composition API + `<script setup>`） | `MUST NOT` 用 Options API 写新组件 |
| 语言 | TypeScript，`strict: true` | `MUST NOT` 用 `as any` 绕过类型 |
| 构建 | Vite | `MUST NOT` 换成 webpack |
| 包管理器 | pnpm | `MUST NOT` 用 npm / yarn |

`MUST NOT` 混入 React 写法（JSX 组件、hooks 命名如 `useEffect` 语义、React 风格的状态管理）。

## 2. 唯一请求出口

- 全站 http 请求 `MUST` 只经过 `src/api/request.ts` 一个文件。
- 组件、页面、store 内 **`MUST NOT`** 直接 `fetch` / `axios` / `XMLHttpRequest`。
- 统一封装 `MUST` 负责：
  - 拼接 baseURL（`import.meta.env.VITE_API_BASE_URL`）与 `/api/v1` 前缀
  - `credentials: 'include'`（鉴权走 httpOnly cookie，不带这个参数等于没登录）
  - 非 2xx → 解析错误体 `{ statusCode, error, message, path, timestamp }` 并抛出统一 `ApiError`
  - 401 → 统一尝试续期并最多重试一次，续期失败才触发重新登录；普通请求、上传、下载共用同一机制，`MUST NOT` 在每个页面各写一遍
  - `pageSize` 上限 100 的本地校验（和后端约定一致，提前拦住而不是靠后端报错）

## 3. 接口类型不许猜

- 请求/响应类型 `MUST` 与后端 DTO 契约严格对齐。
- **`MUST NOT`** 凭想象力手写接口字段（这是前端 AI 最高频的跑偏方式）。
- 拿不到类型时：先看后端 `AGENTS.md` 的跨端契约，再问，`MUST NOT` 猜一个然后写 `// TODO 确认`。

## 4. 跨端契约摘要（与根 `AGENTS.md` §4 逐字一致，改动需同步）

| 项 | 约定 |
|---|---|
| 前缀 | `/api/v1`，版本在 URL |
| 成功 | 直接返回数据体，**没有** `{ code, message, data }` 包装 |
| 失败 | `{ statusCode, error, message, path, timestamp }`，`message` 可能是 `string[]` |
| 分页请求 | `?page=1&pageSize=20` |
| 分页响应 | `{ items, total, page, pageSize }`，`pageSize` 上限 100 |
| 时间 | ISO 8601 UTC 字符串，展示时本地格式化，`MUST NOT` 假设它是本地时区 |
| 字段名 | JSON 一律 `camelCase` |
| 主键 | `uuid` 字符串，`MUST NOT` 当 `number` 处理 |

## 5. 鉴权状态

- token 存在 **httpOnly cookie**，JS 读不到 —— 这是设计意图，`MUST NOT` 试图读 `document.cookie` 拿 token。
- `MUST NOT` 把 token 存进 `localStorage` / `sessionStorage` / Pinia 持久化。
- 登录态只有一个来源（后续选定的 store 或用 `GET /api/v1/auth/me` 恢复），`MUST NOT` 组件各自判断。
- 页面刷新后 `MUST` 能通过 `/auth/me` 恢复登录态，`MUST NOT` 依赖内存状态判断是否已登录。

## 6. 权限"前端不判、只隐藏"

- 角色枚举五值（与后端 `AGENTS.md` §3 一致）：`VISITOR` / `MEMBER` / `ALUMNI` / `WHEEL` / `ADMIN`。
- 按钮/入口的显隐可以按 `role` 做，但**`MUST NOT`** 把前端隐藏当权限控制。
- 所有权限由后端 service 层拦截；前端只是一个 `v-if` 的体验优化。
- 收到 403 时 `MUST` 展示"无权访问"，`MUST NOT` 静默吞掉或自动重试。

## 7. 文件上传

- 前端 `MUST` 先校验：扩展名白名单 `doc / docx / pdf / png / jpg / jpeg / zip`、单文件 ≤ 10MB。
- 前端校验只是**提前提示**，`MUST NOT` 因为前端过了就当后端会过；后端仍会拒。
- `MUST` 展示上传进度与失败原因，`MUST NOT` 上传失败后无反馈。

## 8. 截止时间与倒计时

- **能否提交以接口返回为准**（如 `canSubmit` 字段），倒计时只用于展示。
- `MUST NOT` 用本地 `Date.now()` 和 `deadlineAt` 比较后直接决定按钮可用性。设备时间可以改。

## 9. 提交前自检清单

- [ ] 所有请求都走了 `src/api/request.ts`，没有裸 `fetch` / `axios`
- [ ] 没有手写猜测的接口字段，类型与后端契约对齐
- [ ] 没有读取或持久化 token（cookie 已 httpOnly）
- [ ] 没有把前端 `v-if` 当成权限控制
- [ ] 提交按钮可用性来自接口返回，不是本地时间比较
- [ ] 没有实现根 `AGENTS.md` §2 里标 🔴/❌ 的后续功能（私信、关注、积分等）
- [ ] 没有自行选定 UI 库 / 状态管理 / 路由方案（见 §10）

## 10. 选型现状（已落地，`MUST NOT` 擅自更换）

- **UI 组件库**：自研组件 + 手写 CSS（设计令牌见 `src/styles/tokens.css`），`MUST NOT` 引入 Element Plus / Naive UI 等 UI 库
- **状态管理**：Pinia（登录态唯一来源 `src/stores/auth.ts`）
- **路由守卫**：`src/router/index.ts` 全局 `beforeEach`，`meta.requiresAuth` / `meta.guestOnly` / `meta.requiresRole` 约定，一文件一路由（`_public.*` / `_guest.*` / `_authenticated.*` / `_admin.*`）
- **目录结构**：`src/views`（按业务模块分目录）/ `src/components` / `src/api` / `src/stores` / `src/router`
- **页面清单与路由表**：见 `src/router/`（文章、作业、issue、个人主页 `/users/:id`、管理后台）
- **Markdown 渲染方案**：前端渲染（`src/utils/markdown.ts`，marked + DOMPurify 过滤 XSS）
- **前端仓库位置**：monorepo `ustil-front/`
