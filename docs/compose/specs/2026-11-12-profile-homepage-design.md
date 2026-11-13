# 个人主页（个人中心优化）设计

> 日期：2026-11-12 ｜ 来源：PLAN.md v3.0「P1 个人中心优化」｜ 布局选型：方案 A（GitHub 式双栏）
> 已确认决策：正式成员互访（MEMBER+ 互访，VISITOR 仅看自己）；主页取代抽屉；短 bio + 长 README 双层简介。

## [S1] 背景与目标

现状「个人中心」是侧拉抽屉（`ProfileDrawer.vue`），仅本人可用，无个人主页概念。目标：

1. 个人中心升级为独立个人主页（GitHub 式个人 profile）。
2. 允许查看其他人的个人主页。
3. 页面参照 GitHub 主页：资料栏 + README 介绍 + 置顶内容 + 活跃热力图 + 内容分类 Tab。

## [S2] 路由与可见性

- 新路由 `/users/:id`（name `user-profile`，路由文件 `_public.user-profile.ts`，组件 `views/profile/UserProfileView.vue`）。
- `/profile` 保留并重定向到自己的 `/users/:id`；AppHeader「个人中心」入口直跳自己主页，旧书签不断链。
- 可见性由后端 service 层强制（前端仅隐藏入口）：
  - **本人**：全量可见（含联系方式、编辑/设置区）。
  - **MEMBER / ALUMNI / WHEEL / ADMIN 互访**：可见公开资料（头像、昵称、角色、bio、README、统计、置顶、热力图、标签云、内容 Tab）；**不可见**邮箱/手机与编辑/设置区。
  - **VISITOR**：仅能访问自己的主页，访问他人 403 → 前端跳 403 页。
  - 未登录：沿用全站策略跳登录页。
- Tab 内容沿用现有内容权限（如 VISITOR 禁作业类），本次不放宽任何内容权限。

## [S3] 数据模型与后端接口

迁移 0013：

- `users` 加列：`bio` varchar(100) 可空、`profile_readme` text 可空、`pinned_items` jsonb（数组元素 `{type: 'ARTICLE'|'ISSUE'|'RESOURCE', id: uuid}`）。
- `pinned_items` 由 service 校验：≤6 项、目标存在且属于本人、去重；**数组顺序即展示顺序**；软删目标不展示（恢复后重现）。不建独立 pin 表（单用户少量条目，jsonb 足够，避免多态 FK）。

接口（不动现有 `GET /users/:id`，避免波及各列表的作者字段）：

- `GET /api/v1/users/:id/profile` → 一次返回：公开资料（UserPublic）+ `bio` + `profileReadme` + `createdAt` + `stats {articles, issues, replies, submissions}` + `topTags [{name,count}]`（Top10）+ `pinnedItems`（复用现有各列表项视图）+ `isSelf`；`isSelf=true` 时追加 `email`、`phone`。
- `PUT /api/v1/users/me/profile-page` `{bio?, profileReadme?, pinnedItems?}`：长度契约 bio ≤100、README ≤10000、置顶 ≤6；写入失败保留输入并展示原因。
- `GET /api/v1/users/:id/activity` → `{days: [{date: 'YYYY-MM-DD', count}]}`，近一年按日聚合。
- `GET /api/v1/users/:username/stats-badge` → shields.io endpoint 协议 JSON `[{schemaVersion:1, label, message, color}]`（六枚：文章/讨论/回复/提交/近一年贡献/站内连击），README 经 `img.shields.io/endpoint?url=…` 引用；`GET /api/v1/users/:username/stats-badge.svg` → 站内自绘同款 SVG（shields.io 不可达时备用）。两者按用户名 handle 寻址、`@Public`（2026-11-13 增量），仅聚合计数、无私有字段，`Cache-Control: public, max-age=300`。
- `GET /api/v1/users/:username/snake.svg?theme=light|dark` → 贡献贪吃蛇动画 SVG（@platane/snk 同款 vendored 求解/渲染，见 hub `users/snake/vendor/NOTICE.txt`）。数据 = 近一年五类事件聚合；每日 03:20 定时任务（SchedulerService）为全员预生成深浅两套存 storage（key 为确定性 uuid，`image/svg+xml`），接口仅读取、`@Public`、`Cache-Control: public, max-age=3600`；未生成时 404。

热力图/统计口径（软删不计）：文章创建、发起讨论、讨论回复、作业提交、资源创建五类事件。聚合按 UTC 日；前端渲染时按本地时区展示 tooltip。

## [S4] 页面结构（方案 A 双栏）

`UserProfileView.vue`，两栏布局（窄屏降级为上下堆叠）：

左栏 · 资料卡：

- 头像、昵称、角色徽章；bio（灰字一行）。
- 统计行：`N 文章 · N 讨论 · N 回复 · N 提交`，数字点击跳右栏对应 Tab。
- 加入时间（本地化展示）。
- 擅长标签云（Top10，点击进全站列表 `?tag=` 筛选）。
- **仅本人**底部块：邮箱/手机 + 「编辑资料」「设置」按钮。

右栏 · 自上而下：

1. **README 个人介绍**：Markdown + LaTeX 渲染（复用 v3.0「md 输入优化」的渲染链路；其落地前用现有 `MarkdownBody` 渲染）。空时：本人见写作引导，访客隐藏卡片。
2. **置顶内容**：卡片网格，跨 文章/讨论/资源，≤6，类型 chip 区分，点击进详情；本人编辑态可取消置顶/排序。
3. **活跃热力图**：近一年 53 周格子（绿阶），hover 显示当日次数；不做点击钻取。
4. **内容 Tab**：文章 | 讨论 | 回复 | 资源；分页 10/页，按创建时间倒序；复用 `ArticleCard` / `IssueCard` 等现有卡片组件。

访客视角：移除本人专属块与一切编辑入口，其余相同。

## [S5] 设置与编辑迁移（取代抽屉）

- 删除 `ProfileDrawer.vue` 与 `ui.profileOpen` 抽屉状态；头部入口改跳主页。
- 「编辑资料」（页内编辑态/面板）：昵称、bio、头像上传（复用 `FileUploader` + `usersApi.uploadAvatar`）、README 编辑（textarea + 预览；v3.0 md 编辑器落地后换用）、置顶管理。
- 「设置」页内区（原抽屉功能原样迁移）：修改密码（成功 → 清登录态跳登录页，沿用既有逻辑）、邮箱/手机换绑、VISITOR 邀请码转正。
- 表单长度沿用 `utils/limits.ts` 常量体系，新增 `BIO_MAX=100`、`README_MAX=10000`。

## [S6] 错误处理与边界

- 401 → 跳登录；403 → forbidden 页；404（用户不存在）→ not-found 页。
- 加载失败：区块级失败重试（不拖垮整页）；空态：无内容时的引导文案（本人/访客区分）。
- `pinnedItems` 指向已软删目标：静默跳过不渲染；恢复后自动重现。
- 别人的主页永不展示联系方式；`profile` 接口响应体不泄漏 `passwordHash`/`sessionVersion` 等私有字段。

## [S7] 测试与验收

- hub 单测：profile 权限矩阵（本人 / MEMBER 互访 / VISITOR 访他人 403）、bio/README 长度校验、置顶归属与 ≤6 校验、activity 聚合口径。
- 前端：lint / typecheck / build 全绿；新增路由守卫行为（VISITOR 访他人 403）不回归。
- 独立本地集成回归：互访可见性、置顶校验、热力图数据、设置迁移后（改密/换绑/邀请码转正）行为不变。
- 验收对照 PLAN：① 个人中心独立界面为个人主页 ② 允许查看其他人主页 ③ 参照 GitHub 主页（双栏 + README + 置顶 + 热力图 + Tab）。

## [S8] 非目标（YAGNI）

- 不做：主页访客留言/私信、关注、主页装扮（背景/音乐）、自定义 CSS、贡献图点击钻取、pin 他人内容。
- 不放宽内容权限；不做未登录可见；不改造 `/users/:id` 旧接口语义。
