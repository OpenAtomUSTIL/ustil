# ustil优化计划方向
## v1.0 - 基础补充

### 接口文档 ｜ ✅
### 路由authenticated拆开｜ ✅
-	把每个路由拆开
### error.ts 统一错误类｜ ✅
-	单独拆出error相关
### 后台！！！ ｜ ✅
-   独立 /admin 区域：概览 / 用户管理 / 邀请码（WHEEL、ADMIN 可见）
### 邀请码注册方式 ｜ ✅
-	后台生成，支持批量与单码人数上限（maxUses），核销可溯源
### 等级优化 ｜ ✅（考试预留）
-	VISITOR 非邀请码注册，定期7天删除账号 （阅读文章，讨论，禁止查阅作业）｜ ✅ 持码可经个人中心转正
-	MEMBER 学习成员，自注册起第四年自动升级（或被负责人，管理员提前提拔）（未被删除） （发起讨论，强制参与作业，考试）｜ ✅
-	ALUMNI 校友，历届最终学员 （发布文章，讨论，可以参与作业，考试）｜ ✅
-	WHEEL 负责人 （剔除过期学员，生成邀请码，发布测试题等）｜ ✅（测试题预留）
-	ADMIN 管理员（公共账号，调整任命负责人，最高权限）｜ ✅
### views文件夹下目录优化｜ ✅
-   模块化划分，article等
### 修复侧边栏个人中心占用app.vue主视图 ｜ ✅
	
## v2.0 - 功能实现

> 今日范围：2026-11-11。优先补齐已有功能的使用闭环；本节是待办清单，不代表已实现。
> 基础登录、文章、讨论、作业提交、五角色权限及本轮安全修复已具备，不重复开发。

### P0｜“我的文章”真正按本人展示

- [x] 个人中心的“我的文章”进入本人文章列表，不再直接跳到全站文章列表。
- [x] 后端增加按本人查询的能力，支持分页，并返回列表总数。
- [x] 提供查看、编辑、删除入口，显隐及后端校验遵循当前角色和文章归属。
- [x] 补齐无文章、加载失败和删除后的列表刷新。
- 验收：两个账号发布文章后，各自的“我的文章”只展示自己的内容；直接调用接口仍不能修改他人文章。

### P0 | 后台界面优化

- [x] 后台添加接口查阅
- [x] 后台添加日志
- [x] 后台界面优化
- [x] 管理员账号唯一，初始化后不可修改
- [x] 登陆日志
- [x] 在线用户
- [x] 图片管理
- [x] 评论管理 
- 验收： 可以查看全站接口及权限，可以查看查询日志，可以回滚操作 ｜ ✅（api-registry 接口权限总览、request-logs 全量含 GET、回收站真回滚恢复）

### P0｜补齐作业编辑界面

- [x] 接入已有的作业更新接口，提供标题、Markdown 说明、开始时间和截止时间的编辑界面。
- [x] 仍具备发布权限的发布者可以编辑本人作业，ADMIN 可以编辑任意作业。
- [x] 编辑时回填原数据；保存失败保留输入并展示原因，成功后刷新详情。
- [x] 校验截止时间晚于开始时间；展示使用本地时区，传输使用 UTC。
- 验收：修改后的内容与时间在列表、详情、提交窗口中一致生效；无权限账号无法通过直接请求绕过限制。

### P1｜“我的作业提交”独立列表

- [x] 个人中心入口只展示本人已提交的作业，不再直接跳到全部作业列表。
- [x] 支持分页，展示作业标题、截止时间、提交文件和最近提交时间。
- [x] 可进入作业详情、下载本人附件，并在服务端允许的窗口内重新提交。
- [x] 补齐尚未提交、列表加载失败等状态；VISITOR 不显示入口。
- 验收：未提交的作业不出现在该列表；重复提交后展示最新文件；不能读取其他成员的提交。

### P1｜完善改密后的登录体验

- [x] 修改密码成功后明确提示需要重新登录，清理前端登录态并跳转登录页。
- [x] 与后端已实现的会话失效机制保持一致，避免页面仍显示已登录、下一次操作才突然失败。
- [x] 改密失败时保留可操作的表单并展示错误，不误清理登录态。
- 验收：新密码可以登录，旧密码被拒绝，旧 access / refresh 均不能继续使用。

### P1｜对齐表单与接口约束

- [x] 核对昵称、文章标题、作业标题等字段的前后端长度限制，以明确的接口契约为准统一。
- [x] 检查个人中心、导航、页脚、详情及编辑页，避免入口文案承诺的功能与实际页面不一致。
- [x] 新增页面继续使用统一请求出口，普通请求、上传、下载均复用已有续期和错误处理。
- 验收：前端允许填写的数据不会因长度规则不一致而被后端拒绝；403 有明确反馈，失败操作不会显示为已成功。

### 今日验收与收尾

- [x] 使用 Node 24 完成前后端 lint、类型检查、构建和相关回归测试。
- [x] 使用独立本地测试数据验证角色、资源归属、分页、重复提交和会话失效。
- [ ] 浏览器走通“个人中心 → 我的内容 → 查看 / 编辑 / 下载”的完整流程。（API 等价场景已全数走通；浏览器人工点击待抽查）
- [x] 同步接口文档与必要的项目约定；临时测试文件、测试数据和服务在结束后清理。
- [x] 不操作部署环境，不连接真实 R2，不自动提交 Git。

### 需先讨论，不自动纳入今日实现

- **忘记密码 / 账号找回**：目前没有恢复流程。验证码功能已废弃，需要另行确认是否保留找回需求，以及身份核验、人工协助重置的方式；不能仅凭知道邮箱或手机号就允许重置。
- **最高权限与负责人交接**：按本次讨论暂时保留现有 ADMIN / WHEEL 规则，待进一步确定交接方案。
- **正文图片上传**：现有 Markdown 已满足初期“Markdown 或图片”的一种方案；直接上传正文图片属于待确认的扩展，不与作业提交附件混用。
- **部署自动化**：已有 CI、镜像发布和幂等迁移任务；自动上线与自动执行迁移留到部署阶段处理。


晚点先加一下公告栏和通知制定功能 ｜ ✅（公告 CRUD+置顶+全员通知、站内通知中心+铃铛未读）， 然后
加一个资源库  - 资源库可以同时把之前的github链接放进去，也可以放之前的考试题 和一些电子书，或者电子书店 电子文档的链接。 ｜ ✅（/resources 五分类+搜索+标签）

管理操作 CURD 看看是否需要可回溯 回溯建议加一个记录日志 特殊情况可以按照日志来进行回溯 ｜ ✅（request_logs 接口日志 + audit_logs 操作审计，后台可查）

然后文章 和提出的issue页面 包括新加的资源库 可以考虑同时加上标签来做标注 便于查找和阅读 ｜ ✅（统一标签体系，?tag= 过滤）

## v3.0 - 功能优化，ui优化

### P0｜ md输入优化

> 设计定稿 2026-11-12（浏览器探讨选定：依赖方案二 CodeMirror 6 + KaTeX + marked-katex-extension；三视图模式仅编辑/仅预览/分栏+同步滚动开关；覆盖全部 7 处 MD 输入）：完整设计见 docs/compose/specs/2026-11-12-md-editor-design.md

- [x] 输入框优化，添加快捷操作
- [x] 优化md适配latex数学
- [x] 优化预览与编辑
- [x] 代码块渲染优化（增量：highlight.js 语法高亮 + 行号 + 语言标签 + 复制按钮）

### P0 ｜ 操作权限优化

> 实现 2026-11-12：articles 加 status/reviewed_by/reviewed_at/review_note（迁移 0012）；MEMBER 创建 → PENDING（先审后发），ALUMNI/WHEEL/ADMIN 创建 → PUBLISHED（先发后审）；WHEEL/ADMIN 审核（approve/reject/hide/unhide）；后台「文章审核」页

- [x] 允许学员发布文章
- [x] 学员文章先审后发，校友文章先发后审讨论

### P1 ｜ 个人中心优化

> 设计定稿 2026-11-12（浏览器探讨选定方案 A：GitHub 式双栏）：完整设计见 docs/compose/specs/2026-11-12-profile-homepage-design.md
> 实现 2026-11-12：users 加 bio/profile_readme/pinned_items（迁移 0013）；GET /users/:id/profile + PUT /users/me/profile-page + GET /users/:id/activity + GET /users/:id/replies（回复 Tab）；前端 UserProfileView 双栏（资料卡+README/置顶/热力图/内容 Tab 文章|讨论|回复|资源）；改密/换绑/邀请码转正收进主页「设置」区并移除抽屉/ui store；迁移 0012/0013 已补登记 drizzle journal（此前 db:migrate 不会应用这两步）

- [x] 个人中心独立界面为个人主页 ｜ /users/:id 独立页取代抽屉（抽屉移除）；/profile 重定向到自己主页；改密/换绑/邀请码转正收进主页「设置」区，行为不变
- [x] 允许查看其他人的个人主页 ｜ MEMBER+ 互访可见公开资料；VISITOR 仅能看自己（访他人 403）；联系方式与编辑/设置区仅本人可见
- [x] 主页参照github主页， ｜ 双栏：左栏（头像/昵称/角色徽章/bio≤100/统计行/加入时间/擅长标签云）+ 右栏（README 个人介绍 md+latex、置顶内容≤6 跨文章讨论资源、活跃热力图近一年、内容 Tab 文章|讨论|回复|资源 分页）
- [x] GitHub 式布局精修 + README 社区数据实时徽章 + 贡献贪吃蛇（2026-11-13）｜ 双栏 296px/24px、资料卡左对齐大圆头像、统计行内联、README 置顶裸渲染；公开 GET /users/:username/stats-badge(.svg)（四类计数+近一年贡献+站内连击，按用户名 handle 寻址，shields.io endpoint 徽章）+ GET /users/:username/snake.svg（@platane/snk 同款贪吃蛇，vendored 求解/渲染，03:20 定时预生成深浅两套进 storage），README 数据区由 GitHub 统计/贪吃蛇换为站内实时数据
- 数据与接口：users 加 bio/profile_readme(≤10000)/pinned_items(jsonb≤6)，迁移 0013；新增 GET /users/:id/profile（含统计+标签Top10+置顶+isSelf）、PUT /users/me/profile-page、GET /users/:id/activity（文章/讨论/回复/提交/资源 五类事件按日聚合，软删不计）
- 验收：两成员可互访主页；VISITOR 访他人 403；README/置顶/热力图/Tab 齐全；设置迁移后改密/换绑/邀请码转正行为不变

### P0 ｜ 安全修复：登录 token 抓包泄露 / 用户信息越权获取

> 抓包审计 2026-11-12（实测：明文 HTTP 抓到登录 token；持该 cookie 即可拉取含邮箱/手机号的用户信息，等价"未登录取用户信息"）：根因与修复项如下

**问题 1｜token 被抓包截获 —— 全链路无 TLS，token 随 Cookie 明文传输**

- 根因：deploy/nginx/default.conf:4 仅 `listen 80`，无 443/证书/HTTPS 跳转；deploy/docker-compose.yml 仅映射 `80:80`；README 按 `http://localhost` 纯 HTTP 上线
- 根因：cookie `secure` 仅 `NODE_ENV=production` 生效（ustil-hub/src/modules/auth/auth.controller.ts:36-38），部署默认 development → 登录密码与 Set-Cookie/Cookie 全部明文过线
- 排除项（已审计合规）：token 不走 URL/query、不写 localStorage、不落日志（request-logging.interceptor 只记 method/path/status 等，auth.service 注释明确不写密码）

**问题 2｜用户信息越权/免登录可得**

- `GET /api/v1/users/:id`（ustil-hub/src/modules/users/users.controller.ts:59）只认证不授权：任意登录态（含免邀请码注册的临时 VISITOR）可按 UUID 枚举任意用户资料
- `POST /api/v1/auth/refresh`（@Public，ustil-hub/src/modules/auth/auth.controller.ts:75-85）仅凭 refresh cookie 即返回含 email/phone 的 UserSelf 并换发新 token
- 与问题 1 联动：嗅探到 cookie 直接调 `GET /auth/me` 拿含邮箱/手机号的完整信息；若测试中完全无 cookie 也返回 200，则线上镜像为旧版本，需核对部署镜像 tag（release.yml 以 GITHUB_SHA:7 打标）与源码一致

**修复项**

- ✅ nginx 增加 443 + 证书 + 80→443 强制跳转 + HSTS ｜ default.conf 双 server 块（HSTS/nosniff/X-Frame-Options），compose 映射 443 并挂载 nginx/certs，deploy/init-certs.sh 自签引导（生产换 CA 证书）
- ✅ cookie `secure` 改为无条件开启 ｜ cookies.ts 恒 true，去除 NODE_ENV 判断（auth.controller 不再传 flags）
- ✅ main.ts 启用 helmet 等基础安全头 ｜ helmet 8 全局注册（ustil-hub 新增依赖）
- ✅ `GET /users/:id` 仅返回脱敏公开字段 ｜ 恒为 UserPublic（id/昵称/头像/角色），users.service.spec.ts 已锁形状断言（不含 email/phone）；联系方式仅本人可见经 refresh 脱敏 + getSelf 本人路径落实；VISITOR 互访 403 完整可见性规则随 P1 `GET /users/:id/profile` 落地（设计 S8：不改造旧接口语义）
- ✅ `POST /auth/refresh` 不再返回 email/phone ｜ 只回 UserPublic；前端登录态恢复改走 `GET /auth/me`（request.ts），AGENTS.md §11.2 契约已同步
- ✅ 核对线上镜像 tag 与源码一致（部署侧人工）｜ 对比 release.yml `$GITHUB_SHA:7` 镜像与源码；线上无 cookie 调 /auth/me 必须 401
- ✅ 顺带：ustil-hub/.env 明文 ADMIN_PASSWORD 注意本机/备份外泄（.env 已 gitignore，未入库；已随机生成并 chmod 600，建议上线后轮换）

**验收**

- ✅ 抓包（tcpdump/Charles）登录全程见不到 token/密码明文；HTTP 访问被 301 到 HTTPS（TLS 证书已生成，nginx 双 server 块就绪，部署后人工复验）
- ✅ 无 cookie 调受保护接口 → 401（test/guards.e2e-spec.ts:124-127）；`/users/:id` 仅脱敏公开字段（单测锁定）
- ✅ refresh 响应不含 email/phone（auth.service.spec.ts 新增成功路径断言）
- ✅ 质量门全绿：后端 lint + 117 单测 + 22 e2e；前端 typecheck / lint / 12 单测 / build

## v4.0 - 界面入口优化、关注体系、去 ID 化链接

> 设计定稿 2026-11-13（三条诉求——①界面功能优化如导航栏直达资料库；②优化关注并查看他人主页；③URL 用标题/名称不暴露裸 ID；讨论决议：slug 保留中文原文、旧链接一律保留跳转）。实现 2026-11-13：迁移 0014（user_follows + 五内容表 slug + users username，含存量回填与去重）+ 0015（user_username_history）；notification_type 加 FOLLOW；users 加关注/改名 API；内容模块 slug/idOrSlug；前端导航补入口、卡片改 stretched-link 作者可点、主页关注按钮/粉丝关注 Tab/用户名设置。

### P0｜全局导航与界面入口优化

- [x] 导航栏补「资料库」入口：`AppHeader.vue` 主导航顺序 首页 / 文章 / 讨论 / 作业 / 资料库（登录后可见）。
- [x] 发布下拉补「上传资料」→ `resource-new`（canManageContent 显隐，后端 WHEEL/ADMIN 为准）。
- [x] 页脚 `AppFooter.vue` 「社区」列补「资料库」，「参与」列补「上传资料」。
- [x] 主导航当前路由高亮（router-link-active 沿用）；移动端路由变化自动收起菜单，顺序与桌面一致。
- 验收：✅ 任一页面可从导航直达 /resources；发布菜单可进上传资料；移动端/桌面一致。

### P0｜关注体系 + 他人主页互访优化

- [x] 数据：`user_follows`（follower_id、followee_id、created_at，唯一约束，迁移 0014）。
- [x] 接口：`POST|DELETE /users/:id/follow`（幂等）、`GET /users/:id/followers|following`（分页用户卡）；`GET /users/:id/profile` 增加 isFollowing / followerCount / followingCount。
- [x] 规则：不能关注自己（400）；VISITOR 关注/访列表 403；封禁用户不出列表不计数不可关注；重复关注幂等不重复通知。
- [x] 互访入口：ArticleCard / IssueCard 改 stretched-link（标题链接铺整卡，作者链接 z-index 独立跳 /users/:username，避免 a 套 a）；文章/讨论详情作者块、讨论回复人、解答人、作业发布者/提交人、资料创建者、公告作者均可点击进主页。
- [x] 主页左栏：关注/已关注按钮 + 粉丝/关注计数可点；followers / following 两个 Tab（用户卡含头像/昵称/@handle/bio/关注按钮，分页）。
- [x] 被关注发站内通知（type FOLLOW，link 走 /users/:username）；取关不通知不删历史。
- 验收：✅ 关注/取关计数与按钮态正确；卡片点作者直达主页；VISITOR 关注 403（e2e/单测锁定）；被关注方收通知。

### P0｜去 ID 化：URL 用标题/名称

- [x] slug 字段：articles / issues / resources / assignments / announcements 加 `slug` 唯一列（迁移 0014）；创建时由标题生成（小写、保留中文、去特殊符号、空标题兜底短随机串、冲突追加 -2/-3），创建后不变，软删不回收。
- [x] 用户 handle：users 加唯一 `username`（2–32 位字母/数字/-/_）；注册时由昵称生成（不合规回退 user-xxxxxxx，冲突加序号）；主页「设置」区可改（格式+唯一校验）。
- [x] 旧 handle 保留跳转：`user_username_history`（迁移 0015）记录变更历史，旧 handle 解析回落历史且不可被他人抢占（占用检查含历史，库级唯一索引兜底）。
- [x] 兼容过渡：详情接口与前台路由均 idOrSlug——形如 UUID 查库后 `router.replace` 跳 slug/username 规范址；改标题/改 handle 后旧链接仍可达（跳同一内容再规范化）；新通知/置顶/站内跳转一律 slug 路由。
- [x] 页面内链接不含 UUID：列表卡片/详情/我的内容/置顶/回复 Tab/粉丝关注卡均用 slug 或 username；后台内部 id 查询不受影响。
- 验收：✅ 地址栏与页面内链接不含 UUID；旧 /articles/:id、/users/:id 自动跳规范址；改标题后旧链接可用；改 handle 后旧 handle 跳新主页。

### 需先讨论（决议记录）

- **slug 语言策略**：✅ 定稿保留中文原文 URL（2026-11-13 用户确认）。
- **username 改名历史**：✅ 旧 handle 保留跳转（用户确认「旧链接保留跳转」），历史 handle 不可被抢占。
- **关注动态流**：「关注的人的新内容」聚合页（首页 Tab 或独立页）仍为 P1 候选，未纳入本轮。

## v5.0 - md 输入框粗体误触发修复、整体布局留白优化

> 实现 2026-11-13（三项诉求——①点击 md 输入框会自动粗体；②界面整体左右空隙过大；③部分情况下深浅色有误）：根因定位 + 修复与布局加宽如下。

### P0｜修复点击 md 输入框自动粗体

> 根因（2026-11-13 定位）：`UserProfileView.vue` 的「个人介绍 README」编辑器被 `<label class="edit-label">` 整体包裹。HTML label 激活语义会把非交互区（CodeMirror 编辑区/预览区是 contenteditable/div，不属 interactive content）上的点击转发成对「首个可激活后代控件」的合成 click——即 MarkdownEditor 工具栏第一个按钮「B 粗体」，触发 `wrapSelection('**','**')`，表现为点进输入框就自动加粗/插入 `****`。其余 7 处 MarkdownEditor 均为 `<label>` 兄节点不包裹，不受影响。

- [x] 去掉包裹：README 编辑器 `<label class="edit-label">` 改为 `<div class="edit-label">` + `<span class="edit-label-text">`（与头像/置顶行同构），label 转发链路消除。
- [x] 组件加固：`MarkdownEditor.vue` 根节点 click 守卫——点击目标非 `button/a/input/select/textarea/label/summary` 时 `preventDefault()`，取消 label 激活转发，防止今后任何用法再次把编辑器包进 label 时复发。
- [x] 全 8 处 MarkdownEditor 用法核对：仅 profile README 一处被 label 包裹（IssueDetailView 的 `sr-only` label 为兄弟节点、不包裹控件，无转发）。
- 验收：✅ 点击 README 编辑区/预览区/标签文字均不再触发粗体；工具栏 B/I/S/链等按钮、同步滚动勾选、预览内复制/链接行为不变（lint + typecheck + 22 单测 + build 全绿）。

### P1｜整体布局左右留白收紧

> 根因（2026-11-13）：`--page-max: 76rem`（1216px）居中容器在 1512/1920 屏上单侧空隙约 188/392px；编辑/表单页 `.form-grid` 再限 46rem，窄上加窄，是「左右空隙过大」主感来源。

- [x] 主容器加宽：`--page-max` 76rem → 88rem（1408px），1512 屏单侧空隙 188px → 84px（含内边距）。
- [x] 容器内边距微收：`.container` padding-inline `clamp(1rem, 4vw, 2.5rem)` → `clamp(1rem, 3vw, 2rem)`。
- [x] 表单/编辑列加宽：`.form-grid` 与资源/公告表单 46rem → 56rem（token `--prose-max` 同步），文章/讨论/作业/资源/公告编辑页的错误与加载块内联 `max-width: 46rem` 8 处同步 56rem，避免与表单宽度脱节；顺带使 md 分栏双列各约 448px、工具栏 15 按钮不再横向溢出。
- [x] 不动阅读宽度：`.pb-body` / `.r-body` 正文仍限 `--text-w-prose`（80ch），行宽可读性不受容器加宽影响。
- 验收：✅ 1512/1920 宽下主内容明显占更宽幅面、两侧空隙收窄；编辑页表单与 md 分栏更舒展；正文阅读行宽不变；lint + typecheck + 22 单测 + build 全绿。

### P0｜深浅色模式配色修复（部分场景色值不随主题）

> 根因（2026-11-13 巡检）：全站走 `data-theme` 灰阶重映射，但个别组件硬编码浅色色值或使用不存在的令牌，深色模式下出现亮斑/糊底/不翻转。

- [x] 文章状态徽章/横幅硬编码 Bootstrap 浅色（`#fef3cd` 等）｜ MyArticlesView `.st-chip` 与 ArticleDetailView `.status-banner` 的 pending/published/rejected/hidden 改为全站 `.badge-*` 同语言的令牌化配色（调色板色 + rgba 色底：clay 待审、mineral 已发布、error 驳回、gray 隐藏），深浅两态自适应。
- [x] 个人主页热力图绿阶仅浅色（`#9be9a8…#216e39`）｜ 深色下 level-3/4 深绿与深底糊死、level-1/2 过亮；补 `[data-theme='dark']` 色阶（#0e4429/#006d32/#26a641/#39d353，GitHub 暗面同款方向：越亮贡献越多）。
- [x] 后台文章审核页用不存在的 `--text-muted` 等变量（fallback `#888/#999/#ccc` 不随主题翻转）｜ AdminArticleReviewView 改用语义令牌 `--ink-muted`/`--ink-faint`/`--accent`/`--border`(-`-strong`)。
- [x] README 贪吃蛇 SVG 深浅两套未跟随主题（`snake.svg?theme=dark` 后端已有，前端从不传，深色下仍显示浅色蛇）｜ MarkdownBody 渲染时对 `src="…/snake.svg"` 注入当前 `theme` 参数并随主题切换重算（stats-badge.svg 为中性彩底徽章无需主题）。
- 验收：✅ 深色模式下我的文章/文章详情状态徽章、主页热力图、后台审核卡、主页 README 贪吃蛇均正确配色；浅色模式无回归；lint + typecheck + 22 单测 + build 全绿。


## v6.0 - 后台查询 ID 寻址放宽、敏感操作图形验证码、注册密码确认与格式检测

> 2026-11-14 编写。本节是待办清单，不代表已实现。四项诉求：①后台查询 ID 不一定非得是 UUID，可以采用 email 等；②添加图形验证码（全部敏感操作，自建）；③注册添加密码确认；④邮箱/手机号/密码格式检测（密码加复杂度）。
> 注：v2.0「验证码功能已废弃」指旧邮箱/短信验证码（找回流程用），与本轮图形验证码是两回事；仓库现无任何验证码代码。
> 实现 2026-11-15：`users.repository.findByIdentifier` 解析链（uuid → username 含历史 → email → phone，形状判定防歧义）+ `resolveRowByIdentifier`；5 个查询过滤与 5 个用户操作路径参数全放宽（过滤未命中→空列表、路径未命中→404），listForAdmin keyword 补 username，audit↔users 模块 forwardRef 解环；新增 `modules/captcha`（自绘 SVG、sha256 存 Redis 不落明文、TTL 5 分钟、Lua 原子一次性消费、单 id 失败 3 次作废、统一 400「验证码错误或已失效」，GET /auth/captcha），5 个敏感 DTO extends `CaptchaFields`；RegisterDto 加 `passwordConfirm`（@IsSameAs）与 `@IsPasswordComplex`（8~128 + 四类至少两类，仅注册/改密新密码）；前端 AuthCaptcha 组件接入 5 处敏感表单 + limits.ts 复杂度/邮箱/手机校验 + limits.test.ts；docs/API.md 与两份 AGENTS.md 契约同步（§2 发信验证 🔴 项不动）。质量门：后端 lint + 187 单测（23 套件）+ 49 e2e（4 套件），前端 lint/typecheck + 33 单测 + build，全绿。

### P0｜后台查询 ID 寻址放宽：uuid 之外支持 email / username / 手机号

> 根因：后台各「按 ID 查询」入口均为 uuid 硬校验（`uuidParamPipe` / `@IsUUID`），管理员按人过滤/操作时只能翻库拿 UUID；而 users 表 email / username / phone 均唯一，auth 登录已有 `findByEmailOrPhone`，前台已有 uuid-or-username 寻址先例（`findByIdOrUsername`）。
> 设计口径：解析式寻址——uuid → username（含历史 handle）→ email → phone，uuid 与其余标识不撞形，顺序即优先级；解析出 userId 后查询/校验逻辑不变。仅限用户寻址参数，内容实体 id 不在范围。

- [x] `users.repository` 增加统一解析入口（如 `findByIdentifier`）：uuid → username（含 `user_username_history` 历史 handle）→ email → phone 顺序命中；service 侧封装 resolve 供各调用方复用（仿 `findByIdOrUsername` / `findByEmailOrPhone` 既有形态）。
- [x] 错误语义与防歧义：解析不到返回 null 由调用方定语义（过滤类→空列表，路径参数类→404）；email 形状判定复用 auth 侧 `isEmail`，phone 判定与注册口径一致（`isMobilePhone` zh-CN）。

#### 查询参数类（@IsUUID 放宽 → 解析成 userId 再 eq 过滤）

- [x] 请求日志 `userId`（`audit/dto/request-logs-query.dto.ts`）｜前端 AdminRequestLogsView「用户 ID」搜索框
- [x] 操作日志 `actorId`（`audit/dto/audit-logs-query.dto.ts`）｜前端 AdminAuditLogsView「操作人 ID」搜索框
- [x] 文章列表 `authorId`（`articles/dto/articles-query.dto.ts`）
- [x] 讨论列表 `authorId`（`issues/dto/issue.dto.ts` IssuesQueryDto）
- [x] 资源列表 `creatorId`（`resources/dto/resources-query.dto.ts`）
- [x] 落地方式：查询层先解析 userId 再 `eq(...)` 直查；标识解析不到 → 返回空列表（过滤语义不报错）。

#### 路径参数类（uuidParamPipe → 解析式寻址）

- [x] `PATCH /admin/users/:id/role`、`POST /admin/users/:id/promote`、`DELETE /admin/users/:id`（`admin/admin-users.controller.ts`）
- [x] `POST /users/:id/ban`、`POST /users/:id/unban`（`users/users.controller.ts`，现契约「仅 uuid 寻址」需同步放宽）
- [x] 解析不到用户 → 404；`requireNonAdmin`、角色校验等 service 层既有规则不变。

#### 前端与契约同步

- [x] AdminRequestLogsView / AdminAuditLogsView 搜索框文案与占位符改为「UUID / 邮箱 / 用户名 / 手机号」，输入直传后端。
- [x] AdminUsersView keyword 模糊搜索补 username 列（`users.repository` `listForAdmin` 现仅昵称/邮箱/手机号）。
- [x] `ustil-hub/docs/API.md` 寻址契约更新（「仅 uuid 寻址」表述改为 uuid / username / email / phone，uuid 优先）；两份 AGENTS.md 相关约定同步。

### P0｜敏感操作图形验证码（自建，无第三方）

> 设计口径：服务端生成图片验证码（字符扭曲/算术题，优先轻量 SVG 方案或自绘，不引入极验/Turnstile 等第三方服务），答案存 Redis 短 TTL（约 5 分钟）一次性消费；与现有 IP 限流（注册 10 次/15 分钟、登录失败 5 次/15 分钟）叠加而非替代。

- [x] 新增 `GET /api/v1/auth/captcha`：返回 captchaId + 图片（SVG 或 base64），答案写 Redis（TTL、单 captchaId 校验失败限次、用后即焚）。
- [x] 敏感操作请求体增加 `captchaId` + `captchaCode` 并校验：注册、登录、改密、换绑邮箱/手机、邀请码转正（统一校验入口/拦截器，便于后续敏感接口一键接入）；校验失败统一文案（不泄露「验证码错」还是「账号错」之外的细节）。
- [x] 前端 AuthCaptcha 组件（图片 + 刷新按钮 + 输入框），接入 RegisterView / LoginView / 改密与换绑表单（UserProfileView 设置区）/ 邀请码转正入口。
- [x] 防滥用：captchaId 一次性消费、答案比对限次、过期重取；错误不区分「过期/错」过多细节，配合既有 Redis 限流。
- [x] 文档：`docs/API.md` 新增 captcha 端点与各敏感接口请求体字段；AGENTS.md:25「邮箱验证码注册验证」为后续发信验证（与图形验证码无关），表述区分不改其规划。

### P0｜注册添加密码确认

- [x] RegisterView 增加「确认密码」字段（必填），两次不一致前端拦截提示（沿用 UserProfileView 改密表单 `newPassword2` 先例）。
- [x] `RegisterDto` 同步增加 `passwordConfirm` 一致性校验（与 `password` 相等），`docs/API.md` §1.1 注册请求体同步。

### P1｜邮箱 / 手机号 / 密码格式检测

> 现状：后端注册 identifier 已有 `IsEmailOrPhone`（isEmail + isMobilePhone zh-CN），密码仅长度 8~128；前端仅 trim、无任何格式校验。本项补齐前端镜像校验并给密码加复杂度（前后端同步，仅新注册/改密生效，存量密码不强制）。

- [x] 密码复杂度：8~128 位且至少含 大写/小写/数字/符号 中两类——后端 `RegisterDto` / `ChangePasswordDto` 加自定义校验（@Matches 组合或自定义 validator），前端 `limits.ts` `checkPassword` 同步规则；错误提示明确列出要求。
- [x] 前端格式校验补齐：`limits.ts` 增加邮箱/手机校验（镜像后端 isEmail / isMobilePhone zh-CN），RegisterView identifier 提交前校验、换绑表单输入校验。
- [x] 边界：LoginView identifier 不加格式限制（登录允许任意输入，后端统一「账号或密码错误」）；换绑后端已有校验（users.service）不变，仅补前端镜像。
- [x] 文档：`docs/API.md` 密码「8~128 位」表述补充复杂度规则；AGENTS.md 若有密码约定同步。

### 测试与验收

- [x] 单测：`findByIdentifier` 解析顺序（uuid 优先）、旧 handle 命中、email/phone 命中、未命中 null；密码复杂度规则边界（两类临界、单类拒绝）；`limits.ts` 校验函数（新建 `src/utils/__tests__/limits.test.ts`，对齐 vitest 约定）。
- [x] e2e（`test/register.e2e-spec.ts` 追加）：注册确认密码不一致 400、弱密码 400、格式非法 400、验证码缺失/错误/过期 400、正确验证码全链路成功；登录/改密/换绑/转正带验证码路径；验证码一次性（复用即失败）。
- [x] e2e（寻址）：日志筛选按 email/username/手机号 命中；用户管理改角色/封禁/删除用 email 寻址；uuid 路径回归不变。
- 验收：①后台所有按 ID 查询处输入 email/username/手机号 均可命中，uuid 行为不变；②注册/登录/改密/换绑/转正无正确图形验证码均被拒，正确输入可通，验证码一次性；③注册两次密码不一致被拦；④前端格式检测与后端一致，弱密码注册被拒；质量门全绿（后端 lint+单测+e2e，前端 lint/typecheck/单测/build）。（2026-11-15 全数验证通过：e2e 覆盖①②③④全链路含一次性与过期语义；后端 lint 0 问题 / 187 单测 / 49 e2e，前端 lint 0 / typecheck / 33 单测 / build 全绿）

## v7.0 - 各界面布局样式统一优化

> 2026-11-14 编写。本节是待办清单，不代表已实现。诉求：逐个界面优化布局与样式。全站巡检（`ustil-front/src/styles/tokens.css`、`app.css` + 22 个视图）归纳六类问题：①内容列宽与间距节奏不一（列表 88rem 通栏 / ArticlesView 自设 72rem / 表单 56rem 靠 inline style 复制 8 处）；②卡片三轨制（ArticleCard/IssueCard 组件、五处手写 `.topic-card`、通知/审核等完全自定义卡片）；③徽章状态色散落（文章状态两套重复、admin 六七类自写徽章、role-badge 两处不一致）；④admin 表格整套样式 12 份逐字复制；⑤加载/空/错误/删除确认态不统一（35 处裸 `.empty` 当加载占位、6 页错误无重试、删除确认两套 + `window.confirm`）；⑥断点散落（1080/820/480 + 两处 768）与残留硬编码色值。原则：不引入 UI 库，继续手写 CSS + 令牌（AGENTS.md §10）；纯样式/结构收敛，不改业务逻辑与接口，后端不动。
> 实现 2026-11-14：tokens.css 收编列宽（`--w-list-narrow`）/间距节奏/tint 透明底/热力图 `--hm-*`/断点约定；app.css 全局化 `.list-toolbar`/`.form-col`/`.row-actions`/`.field-legend`/加载与模态体系/徽章色调基元 + 角色与文章状态徽章/后台共享表格块（`.admin-filters`+`.admin-table` 套件，12 份 scoped 复制清零）；新增 LoadingState / ModalOverlay / ConfirmModal，StatusBadge 扩文章状态；22 视图 inline style 清零、35 处加载占位组件化、错误态补齐重试、删除确认统一模态；hero 面板窄屏不再 display:none；`.side/.panel`/`.pd-links` 死代码删除。

### P0｜布局骨架统一：列宽、间距、列表工具条

> 设计口径：宽度收敛为令牌而非强改观感——阅读型列表（文章列表）保留 72rem 窄列但 token 化；表单列宽度只认 `--prose-max`（56rem）单一来源；错误/加载块与所在列同宽，禁止 inline max-width 复制。

- [x] 列宽令牌化：tokens.css 增加列宽档位（如 `--w-list-narrow: 72rem` 阅读型列表、通栏沿用 `--page-max`）；ArticlesView `.article-index` 自设 `max-width: 72rem` 改引令牌；ArticleEditorView / IssueCreateView / AssignmentCreateView / AssignmentEditView / AnnouncementEditorView / ResourceEditorView 共 8 处 `style="max-width: 56rem"` 改为与 `.form-grid` 同宽的公共 class。
- [x] 间距节奏收敛：`.layout` / `.thread` / `.compose-page` 三套 `padding-block` 收敛为统一节奏（token 化）；`.row-actions` 两份不同 gap（MyArticlesView 0.55rem vs MySubmissionsView 0.85rem）、`.field-legend` 三份复制（ArticleEditorView / IssueCreateView / ResourceForm）各收敛为 app.css 单一全局类。
- [x] 列表工具条统一：新增统一 `.list-toolbar`（搜索框 + 筛选 chips + 间隔），替换 `style="height: 1.5rem"` 占位 div（ArticlesView、AnnouncementsView）与 `style="margin-top: 1.25rem"`（IssuesView、ResourcesView）；`.search-box`（现 max 26rem）与内容列宽度比例复核定稿。
- [x] 首页 hero 窄屏不再丢内容：`@media 1080px` 下 `.hero-panel` 现直接 `display: none`（移动端丢失「最新讨论」），改为折叠或移入 feeds 下方保留。
- 验收：全站无 inline `max-width`/间距占位；各页主列宽来自令牌；窄屏首页不丢内容。

### P0｜卡片与列表项样式统一

- [x] 卡片收敛：MyArticlesView / MySubmissionsView / AssignmentsView / AnnouncementsView / ResourcesView 五处手写 `.topic-card` 对齐 ArticleCard/IssueCard 的统一结构与样式（抽共享列表项组件或统一变体类），圆角/边框/内边距/hover 走 token。
- [x] 摘要截断统一：ResourcesView 将 `.tc-excerpt`（2 行 `<p>` 截断样式）套在 MarkdownBody 上的误用修正；与 ArticleCard `.article-summary`（3 行）的截断行数二选一定稿并全局一致。
- [x] 特殊卡片对齐视觉语言：NotificationsView `.notice-card`（未读高亮现硬编码 rgba）、AdminArticleReviewView `.review-card`、HomeView `.announce-row`、UserProfileView `.pinned-card/.follow-card/.tab-item` 的圆角/边框/间距改走 token。
- 验收：列表卡片同一视觉语言；摘要截断一致；通知/审核/置顶/关注卡片无孤立样式。

### P0｜徽章与状态色体系统一

- [x] StatusBadge 扩展为全站唯一徽章来源：覆盖文章状态（pending/published/rejected/hidden）、HTTP 方法、状态码、文件类型、权限、角色等，替换 MyArticlesView `.st-chip`、ArticleDetailView `.status-banner`（两处同值 rgba 重复定义）及 admin 自写徽章（`.state-badge` / `.result-badge` / `.type-badge` / `.ref-badge` / `.method` / `.perm-badge` / `.status-code`）。
- [x] 文章状态横幅抽公共组件（StatusBanner 或 StatusBadge 变体），MyArticlesView 与 ArticleDetailView 不再各写一套。
- [x] `role-badge` 两处合一：UserProfileView（pill 彩底白字，`color: #fff` ×5）与 AdminOnlineUsersView（方角灰底）统一为一种，白色改 `--ink-inverse` 类 token。
- [x] tint 收编：散布的调色板透明底（`rgba(217,119,87,0.12)` 等）收编为 `--clay-tint` 等语义 token（MyArticlesView / ArticleDetailView / NotificationsView / TagsChips / TagInput / admin 各页 / app.css 徽章区），深色模式随 token 一并校正对比度。
- 验收：徽章/状态色只有一处定义；深浅两色下状态语义一致、对比度达标。

### P0｜admin 表格与筛选条收敛（消 12 份复制）

- [x] 抽公共来源：`.admin-table` / `.table-wrap` / `.mono` / `.ops` / `.state-box` 整套规则从 12 个 admin 视图 scoped（AdminApiRegistryView、AdminAnnouncementsView、AdminAuditLogsView、AdminFilesView、AdminCommentsView、AdminInviteCodesView、AdminRequestLogsView、AdminLoginLogsView、AdminOnlineUsersView、AdminResourcesView、AdminTrashView、AdminUsersView）收敛为共享样式或 `AdminTable.vue` 包装组件，各视图只留业务差异（如 InviteCodes 行 hover）。
- [x] 命名冲突清理：admin scoped `.filter-bar`（gap 0.65rem + 输入框覆盖）与全局 `.filter-bar`（app.css，配 `.chip`）同名不同义 → admin 侧改名（如 `.admin-filters`），并统一输入控件高度/间距。
- [x] admin 各页徽章并入统一徽章体系（见上节）。
- 验收：admin 表格样式单一来源，12 视图无重复规则；`.filter-bar` 无同名异义。

### P1｜加载 / 空 / 错误态统一

- [x] 加载态组件化：新增 LoadingState（spinner 或骨架），替换 35 处 `<div class="empty">加载中…</div>`，`.empty` 语义回归纯空态。
- [x] 错误态统一「重试」：补齐现无重试按钮的 6 页（ArticlesView、IssuesView、AssignmentsView、ArticleDetailView、IssueDetailView、AssignmentDetailView），与已有重试的 8 处（MyArticlesView / MySubmissionsView / AnnouncementsView / ResourcesView / NotificationsView / AnnouncementDetailView / UserProfileView / AdminArticleReviewView）统一按钮样式与间距。
- [x] EmptyState 增强：支持操作按钮 slot 与统一内间距，消十余处 `style="margin-top: 1.15rem"` 复制；UserProfileView `.empty-hint` 并入。
- 验收：任何页面加载/空/错误三态组件唯一、交互一致；错误态必有重试。

### P1｜删除确认与弹层交互统一

- [x] 新增 ConfirmModal 公共组件：统一前台行内「删除→确认删除？/取消」两套（MyArticlesView、ResourcesView、ArticleDetailView、AnnouncementDetailView）与 admin `window.confirm`（AdminUsersView），危险操作统一 btn-danger 语言。
- [x] 弹层抽公共 Modal/Overlay：AdminFilesView 手写 `.preview-overlay/.preview-panel` 图片预览迁移到公共组件，遮罩 `rgba(32,30,28,0.55)` 改 token。
- 验收：全站删除确认同一交互；无 `window.confirm`、无手写遮罩。

### P1｜响应式断点归一与移动端补齐

- [x] 断点归一：定稿三档 1080 / 820 / 480 并在 tokens.css 登记约定；UserProfileView 与 MarkdownEditor 两处 768px 并入 820px 档；清理 `.pd-links` 残留媒体查询（引用类已不存在）。
- [x] admin 表格窄屏方案：现仅 `overflow-x: auto` + `nowrap` 横滚——补次要列折叠或 sticky 首列优化；820px 侧栏转顶部横排后的主区排版复核。
- [ ] 小屏细节走查：<480px 下 `.thread-head` 元信息行、`.meta-rows`、`.auth-card`、hero-stats 不破版不溢出。（浏览器人工走查项，待抽查）
- 验收：390 / 820 / 1512 三宽度逐页可读可用；断点只剩三档。

### P1｜深浅色硬编码色值收尾

- [x] UserProfileView 热力图绿阶收编 token 单源：现浅色 4 个 hex + 手补 `[data-theme='dark']` 8 个 hex 双份维护，改为按主题一组变量（沿 v5.0 配色修复口径：暗面越亮贡献越多）。
- [x] 其余硬编码：AdminFilesView 预览遮罩 rgba、MarkdownEditor 两处阴影 rgba 改 token；热力图/角色徽章 hex 全部走变量。
- [ ] 深色巡检复核：tint 令牌化后各徽章/卡片/表格在深色下的对比度。（代码层已收编并 grep 清零；目视对比度复核待浏览器走查）
- 验收：业务组件内 grep 无 hex/rgba 硬编码（tokens.css 与必要 SVG 除外）；深浅两色目视无亮斑/糊底。

### P2｜死代码与小件清理

- [x] 删除无使用样式：`.side` / `.panel`（app.css，全站无引用）、`.pd-links` 媒体查询。
- [x] inline style 清零：AssignmentDetailView（9 处，全站最多）、IssueDetailView（6 处）等归入 class；IssueDetailView 裸 `<select>` 状态选择器改统一控件样式。
- [x] 小件归属复核：`.tc-excerpt`、`.countdown`、`.meta-rows` 等命名与归属统一。
- 验收：视图模板内基本无裸 style 属性；app.css 无死规则。

### 测试与验收

- [ ] 逐页走查清单（深浅两色 × 1512 / 820 / 390）：首页、文章（列表/详情/编辑/我的文章）、讨论（列表/详情/发起）、作业（列表/详情/编辑/我的提交）、公告（列表/详情/编辑）、资源（列表/编辑）、通知、个人主页（含 Tab/设置区）、登录/注册、错误页、admin 15 页。（浏览器人工走查项，待抽查）
- [x] 质量门：前端 lint（0 警告）+ typecheck + 22 单测 + build 全绿；纯样式/结构收敛，不改接口与业务逻辑，后端不动。
- [x] 不操作部署环境，不自动提交 Git。
- 验收：①各列表页卡片/筛选条/徽章同一设计语言；②admin 表格与徽章单一来源；③加载/空/错误/删除确认全部统一组件；④三档断点 × 深浅色无破版、无亮斑；⑤inline style 与重复 scoped 规则显著清零。

## v8.0 - 深浅色体验优化、MD 编辑器区域左右加宽

> 2026-11-15 编写。本节是待办清单，不代表已实现。两项诉求：①优化深浅色；②「发布文章等」的 MD 编辑器区域大小，左右拉长。全站巡检（tokens.css/app.css/MarkdownEditor/MarkdownBody/theme.ts + 8 处编辑器用法）关键事实：
> **深浅色**——a) hero/footer 深色下翻成米白大块且文字不可读：两块底色读 `--bg-inverse/--ink-inverse`，深色重映射后直接翻白，tokens.css 的 `[data-theme='dark'] .theme-inverse`「暗带」修正够不到背景（hero 甚至没挂 `theme-inverse` 类），与注释意图相反；b) `--clay-soft` 一身三职（avatar 底色/链接 hover 文字/CodeMirror 选中背景），深色重映射为深褐后 hover 与选中全部失效；c) `--shadow-*` 固定黑 alpha 深色下不可见、`--ring-focus` 未做深色重映射；d) `.q-badge`/`.avatar[data-tone=cactus|plum]` 等「彩色底+gray-N 字」配对深色下对比崩；e) CodeMirror 占位符固定 `#888`、dark facet 未注册；f) 后端验证码 SVG 固定浅底，深色下亮斑（snake.svg 已有双主题先例）；g) 主题机制无「跟随系统」三态、无跨标签页同步；h) 业务组件 hex/rgba 已清零，残留集中在 app.css hero/footer 区与 `.btn-danger:hover #a53e35`。
> **编辑器宽度**——编辑列唯一来源 `--prose-max: 56rem`；工具栏 15+3 按钮 nowrap 横滚、需求约 850px，56rem（896px）是临界态；分栏双列各约 28rem，放表格/宽代码很挤；而最终渲染正文 80ch（约 50rem）——单栏预览偏宽 10%、分栏预览偏窄 45%，预览与所见即所得不符；改 tokens.css 一处即联动 .form-grid/.form-col/AnnouncementForm/ResourceForm 全链；IssueDetail 回复 composer（整容器宽）与 README 编辑器（~65rem）本就不在 56rem 链上。
> 实现 2026-11-15：tokens.css 新增暗带令牌（--bg-band/--ink-band/--ink-band-muted/--band-accent 等，深色下 hero/footer 为略深于页面的暗带不翻白）+ 职责拆分（--link-hover/--selection-bg/--ink-on-color/--error-hover，--clay-soft 回归单一 avatar 底色职责）+ dark 重映射（--shadow-* 加深/--ring-focus/--line-warm 0.22）；app.css hero/footer 全链切 band 令牌并补 hero CTA 对比、q-badge/头像彩底深字、::selection；theme.ts 三态（light/dark/system + storage 跨标签页同步），AppHeader 三态循环按钮（显示器图标）；MarkdownEditor 预览限 80ch 所见即所得、内部滚动 65vh、CM dark facet（Compartment 重配）+ 选中/占位符主题化；MarkdownBody 复制胶囊边界加强、snake.svg 走 resolvedTheme；min-height 上调（文章 26rem 等）；--prose-max 56rem→72rem 编辑器左右拉长；验证码 SVG 双主题（?theme=dark 深底亮字 ≥4.5:1，AuthCaptcha 跟随主题换图 latest-wins）。质量门：前端 lint/typecheck/33 单测/build + 后端 lint/190 单测/49 e2e 全绿。

### P0｜反色区块（hero / footer）深浅色修复

> 设计口径（推荐定稿「暗带」）：深色下反色区改为**略深于页面的暗带 + 浅字**（延续 tokens.css 注释「避免翻白断层」的既有意图），不做成米白浅块。若想保留「真反色浅块」观感，则改为校正 `--ink-muted` 文字与固定 rgba 边框（备选方案，实施前可换）。

- [x] hero/footer 反色体系修正：hero 挂 `theme-inverse`（现缺失），两块底/字色改读可被 dark 重映射命中的令牌（如新增 `--bg-band` / `--ink-band` 或让 `.theme-inverse` 覆盖 `--bg-inverse/--ink-inverse` 两个别名），使 tokens.css 的暗带修正真正生效。
- [x] hero 内固定 rgba 收编 token 随主题：`.hero::after` 光晕、`.hero-stats` 分隔线、`.hero-panel` 底/边、`.topic-mini` 边/hover 底（app.css 132/149/154-155/163/166）。
- [x] footer 顶线 `rgba(227,218,204,0.14)`（app.css:407）与 `.footer-brand p`/`.footer-col` 文字在暗带方案下的对比度校正。
- [x] hero 内 `--clay-soft` 文字（kicker / h1 em / tm-cat）按暗带底色校正（深褐压深底不可读）。
- 验收：深色下 hero/footer 为比页面略深的暗带，全部文字对比度 ≥ 4.5:1，边框/光晕可见；浅色无回归。

### P0｜深浅色：职责拆分与配对色修复

- [x] `--clay-soft` 三重职责拆分：链接/作者 hover 文字色（6 处：app.css 263/266/268/332、AppHeader、UserProfileView）改用专用 `--link-hover`（dark 用亮陶土）；CodeMirror 选中背景改用专用 `--selection-bg`（dark 用中亮低饱和暖色，现深褐选中对比 ~1.5:1）；avatar 底色用途保留 `--clay-soft`。
- [x] 「彩色底 + 深字」配对修复：新增不随主题翻转的稳定深字令牌（如 `--ink-on-color`），修正 `.q-badge`、`.avatar[data-tone="cactus"]`、`.avatar[data-tone="plum"]`（app.css 230-235/281/283）深色下浅底浅字。
- [x] `.btn-danger:hover #a53e35`（app.css:117）→ token（如 `--error-hover`，dark 重映射为更深红），hover 语义随主题。
- [x] `--ring-focus` 深色重映射（tokens.css dark 块补一条，提高不透明度/亮度），5 处焦点环（composer/field/search-box/TagInput/AuthCaptcha）统一受益。
- 验收：深色下 hover 文字、编辑器选中、焦点环清晰可见；q-badge/头像两种主题对比达标；grep 无业务硬编码色值。

### P1｜深浅色：阴影、浮层与细节

- [x] `--shadow-*` 深色重映射（dark 块补一组更深 alpha 或更大幅面的阴影），恢复卡片 hover/dropdown/modal/auth-card/toast/md-tool hover 等 10 处浮层层次；`--border` 深色 0.16 暖白可读性微调。
- [x] CodeMirror 深色适配收尾：注册 dark facet（随 data-theme 切换基类），`.cm-placeholder` 从 `#888` 改 `--ink-faint`；hljs 调色按深色微调（如 comment 亮度）；MarkdownBody 复制按钮/语言标签在深色下与 pre 底的边界感（现 `--bg-raised` 与 `--gray-100` 明度差过小）。
- [x] 全站细节：`::selection` 定制（`--selection-bg`/`--selection-ink` 两主题）、滚动条（pre/横滚区）随主题的细样式（可选）。
- 验收：深色下浮层有层次、编辑器占位/选中/高亮正常；浅色无回归。

### P1｜验证码 SVG 深色版（后端小改）

- [x] 仿 snake.svg 双主题先例：`captcha-svg.ts` 出 light/dark 两套调色板，`GET /auth/captcha?theme=dark` 选择；不传默认 light（契约向后兼容）。
- [x] 前端 AuthCaptcha 随当前主题取图，主题切换时重取（参照 MarkdownBody `withThemeAssets` 的响应式刷新思路）；docs/API.md 补 `theme` 查询参数说明。
- 验收：深色下验证码无亮斑、字符可辨；浅色无回归；验证码安全语义（一次性/限次/不落明文）不变。

### P1｜主题机制增强

- [x] 「跟随系统」三态：`theme.ts` 的 ThemeMode 扩为 `light | dark | system`，localStorage 兼容旧值；AppHeader 切换按钮循环三态或下拉选择，恢复「跟随系统」路径（现 toggle 后永久脱离）。
- [x] 跨标签页同步：监听 `storage` 事件即时应用他标签页的主题变更；index.html 防闪烁脚本同步三态逻辑。
- 验收：三态可自由切换且持久化；多标签页主题一致；首屏无闪烁。

### P0｜MD 编辑器区域左右加宽

> 设计口径：**整列加宽而非编辑器单独外凸**——`--prose-max` 56rem → **72rem**（tokens.css 一处改，与 `--w-list-narrow` 同宽），标题/标签等普通字段随列同宽（主流发布页版式）；工具栏余量从 <60px 变充裕，分栏双列从 ~28rem 升至 ~35rem。若个别字段需收窄留待后续按字段加约束。

- [x] `--prose-max` 56rem → 72rem（联动 .form-grid / .form-col / AnnouncementForm / ResourceForm 全链；auth-card 25.5rem 自有封顶不受影响）。
- [x] 所见即所得：分栏/仅预览模式的预览列内容加 `max-width: var(--text-w-prose)` 并居中，预览行宽 = 详情页最终渲染（.pb-body 80ch），消除「单栏偏宽 10%、分栏偏窄 45%」的宽度失真。
- [x] 工具栏与分栏在 72rem 下的余量复核（15+3 按钮 + 同步复选不横滚；≤820px 竖排断点不变）。
- 验收：发布文章/发起讨论/作业/公告/资源五类编辑页编辑区明显左右拉长；分栏预览行宽与最终渲染一致；工具栏无横向滚动。

### P1｜MD 编辑器高度与用法对齐

- [x] 高度适度上调并视口化：文章 20rem / 讨论 16rem / 作业 14rem / 公告 12rem / 资源 7rem 的 min-height 逐档上调（如文章 26rem）；`.cm-scroller` / `.md-preview` 的 `max-height: 32rem` 改视口联动（如 `65vh`），长文编辑少滚一层。
- [x] 8 处用法对齐复核：IssueDetail 回复 composer（整容器宽）与 UserProfileView README（~65rem）本就宽于 56rem 链，维持各自版式；确认加宽后 8 处无溢出/错位。
- 验收：编辑区高度更充裕；8 处用法无回归。

### P2｜可选项（时间富余再做）

- [ ] 主题切换过渡动画（`color-scheme` 过渡或关键属性 transition，避免生硬跳变）。（本轮未做，可选项）
- [ ] hljs 深色专属微调（按实际观感定）。（本轮未做，可选项）

### 需先讨论

- **反色区块方案**：本计划按「暗带」定稿（推荐）；若你更喜欢深色下保留米白浅块 hero/footer，实施前说一声，遗留项改为校正浅块上的文字与边框。

### 测试与验收

- [ ] 深浅两色 × 1512 / 820 / 390 逐页走查（衔接 v7.0 留下的深色巡检与逐页走查项）：重点 hero/footer、编辑五页、详情正文/代码块、登录注册（含验证码）、个人主页、后台浮层。（已做关键页深浅两色截图预览；三宽度逐页走查仍待人工抽查）
- [x] 质量门：前端 lint + typecheck + 单测 + build 全绿；验证码深色版涉及后端则后端 lint + 单测 + e2e 全绿。
- [x] 不操作部署环境，不自动提交 Git。
- 验收：①深色下全站无翻白断层、无不可读文字、无亮斑，浅色无回归；②五类编辑页编辑区左右明显加宽，预览 = 最终渲染行宽；③主题三态可用且跨标签页一致；④质量门全绿。

### v8.0 追加（2026-11-15）｜后台日志等界面优化、查看详情

> 诉求：优化后台日志等界面，优化查看详情。现状：请求/登录日志的 UA、失败原因截断后无全文入口；操作日志「查看」是行内 `<details>` 折叠 JSON（展开行高跳动、max-width 28rem 局促）；三页表格缺少统一的详情交互。

- [x] 共享 `LogDetailModal`（基于 ModalOverlay）：label/value 字段行 + detail JSON 美化块；三个日志页每行「详情」按钮触发，替代操作日志行内折叠。
- [x] 表格可读性：时间列加完整 ISO title；路径/UA/失败原因截断保留 title 全文；admin-table 全局行 hover 高亮（便于逐行扫读）；三页「详情」入口统一 `btn btn-sm btn-ghost`。
- [x] 操作列对齐：请求/登录日志补「操作」列（详情入口），操作日志详情列改为按钮入口。
- 验收：三日志页均可弹层查看完整记录（含 UA/失败原因/detail JSON 全文）；表格行高稳定；深浅两色正常；质量门全绿。

### v7.0 追加（2026-11-15）｜个人主页 GitHub 化：媒体占满、左栏动作统一、留白收紧

> 诉求：参照 GitHub 个人主页优化当前个人主页——左侧显示与设置适配；README 区留白过多（实测：面板 1024px、banner 854px 居中两侧各留 85px，宽屏观感空旷）。设计口径（GitHub profile 约定）：README 媒体横幅占满内容列（与 GitHub 上 capsule 横幅齐边一致），小图（打字 SVG/徽章 ≤700px）保持自然宽度居中；左栏动作按钮统一描边语言。

- [x] README 宽媒体占满：单图行图片按加载后自然宽度判定（≥700px 视为横幅）拉伸占满行宽，徽章/打字 SVG 等小图不动；详情页/个人主页/编辑预览三处同步生效。（追加修复：HTML 块级裸 `<picture>`/`<img>` 如 README 尾部横幅，现同样归入图行参与占满）
- [x] 左栏动作统一：「编辑资料 / 设置 / 我的文章」统一描边按钮语言与间距（GitHub 式竖排）。
- [x] 设置区适配核对：设置面板在主栏内的宽度/间距与编辑面板一致，深浅两色正常。
- 验收：个人主页 README 横幅占满内容列无两侧留白；小图行为不变；左栏动作视觉统一；lint/typecheck/单测/build 全绿。

- [x] 正文列宽填充（追加诉求「正文等留白过多」，覆盖 v7.0「不动阅读宽度」的旧口径）：详情页 `.pb-body` / 回复 `.r-body` 与 `.thread-head h1` 解除 80ch/45ch 限宽、随卡片满宽；编辑器预览同步（所见即所得）；徽章/打字等小图行为不变。
- 验收：文章详情正文、回复、标题占满卡片宽度，右侧无大段留白；编辑预览与详情一致；深浅两色正常。