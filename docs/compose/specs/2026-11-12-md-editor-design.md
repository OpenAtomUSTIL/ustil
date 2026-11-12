# md 输入优化（Markdown 编辑体验）设计

> 日期：2026-11-12 ｜ 来源：PLAN.md v3.0「P0 md输入优化」｜ 依赖选型：方案二（CodeMirror 6）
> 已确认决策：覆盖全部 7 处 Markdown 输入（资源描述改按 MD 渲染）；行内+块级 LaTeX；工具栏全量（基础/结构/公式）+ 键盘快捷键；三视图模式（仅编辑/仅预览/分栏+同步滚动开关）；引入 vitest 补渲染单测。

## [S1] 背景与目标

现状：全站 7 处 Markdown 输入均为裸 `<textarea>`，无共享编辑器、无工具栏、无快捷键、无预览；渲染链路为 `marked v18 + DOMPurify v3`（`src/utils/markdown.ts` + `MarkdownBody.vue`），不支持数学公式。目标：

1. 新建共享编辑器组件，提供工具栏快捷操作与键盘快捷键。
2. 渲染链路支持 LaTeX 数学（行内 `$…$`、块级 `$$…$$`）。
3. 提供「仅编辑 / 仅预览 / 分栏」三种视图与同步滚动，改善编辑-预览体验。

## [S2] 依赖与渲染链路

新增依赖（`ustil-front`）：

- 编辑器：`@codemirror/state`、`@codemirror/view`、`@codemirror/commands`、`@codemirror/language`、`@codemirror/lang-markdown`（模块化引入，树摇后约 150-200KB）。
- 数学：`katex` ^0.18（与 `marked-katex-extension` peer 范围一致）、`marked-katex-extension` ^5。
- 开发：`vitest`（单测用）。

渲染链路单点扩展（`src/utils/markdown.ts`，`renderMarkdown()` 签名不变）：

1. `marked.use(katexExtension({ throwOnError: false }))` —— marked 直接把 `$…$` / `$$…$$` 解析为 KaTeX 输出。
2. `DOMPurify.sanitize()` 放行 KaTeX 产物（MathML 标签 + `span.katex*` 类），放行集最小化，其余 XSS 防线不动。
3. KaTeX 样式全局引入一次（`katex/dist/katex.min.css`），字体走 KaTeX 自带 woff2。

`MarkdownBody.vue` 接口不变（`content` prop），现有 4 处渲染点（文章/讨论/公告/作业详情）自动获得数学公式。后端零改动：存 Markdown 原文，渲染全在前端。

## [S3] MarkdownEditor 组件

`src/components/MarkdownEditor.vue`，`v-model`（`modelValue`）绑定 Markdown 原文；props 另有 `placeholder`、`minHeight`（默认 240px）。

**工具栏分组**（插入操作走 CodeMirror 选区 API，包裹选中文本、不丢光标）：

- 基础：B（`**…**`）、I（`*…*`）、删除线（`~~…~~`）、行内代码（`` `…` ``）、链接（`[…](url)`）。
- 结构：H2 / H3、无序列表、有序列表、引用、表格模板、分割线。
- 公式：∑ 行内（`$…$`）、∑∑ 块级（`$$…$$` 模板）。

**键盘快捷键**：Cmd/Ctrl+B 加粗、+I 斜体、+K 链接；Tab / Shift+Tab 缩进（CodeMirror keymap）。

**视图模式**：仅编辑 / 仅预览 / 分栏 三态，组件内 state，默认分栏，不持久化。窄屏 <768px 时分栏自动变为上下堆叠。

**同步滚动**：仅分栏模式出现的开关（默认开）；按可视比例在编辑区与预览区间双向同步。

**主题**：CodeMirror 自定义主题贴合 `tokens.css`（字体、背景、行高、圆角与现有表单一致）。

**预览区**：复用 `renderMarkdown()` + `.md-body` 样式，与阅读视图所见即所得。

## [S4] 集成改造点

7 处 textarea 替换为 `MarkdownEditor`：

1. `views/article/ArticleEditorView.vue` —— 文章正文
2. `views/issue/IssueCreateView.vue` —— 讨论正文
3. `views/issue/IssueDetailView.vue` —— 讨论回复
4. `views/assignment/AssignmentCreateView.vue` —— 作业说明（新建）
5. `views/assignment/AssignmentEditView.vue` —— 作业说明（编辑）
6. `components/AnnouncementForm.vue` —— 公告内容（`AnnouncementEditorView`、`AdminAnnouncements` 复用处自动生效）
7. `components/ResourceForm.vue` —— 资源描述

1 处渲染补课：

8. `views/resources/ResourcesView.vue` —— 资源描述从纯文本插值改为 `MarkdownBody` 渲染（同经 DOMPurify）。

各表单提交仍传 Markdown 原文，前后端契约不变（长度限制沿用 `utils/limits.ts` 契约）。

## [S5] 错误处理与安全

- KaTeX `throwOnError: false`：公式写错原地显示错误样式，不崩页。
- `renderMarkdown()` 整体 try/catch：异常降级输出转义纯文本。
- DOMPurify 放行集最小化并单测验证：公式不被剥离、XSS 样例（脚本、事件属性、javascript: 链接）仍被拦截；资源描述渲染同样经 sanitize。

## [S6] 测试与验收

测试：

- `renderMarkdown` 单测（vitest）：行内/块级公式渲染出 KaTeX 结构；代码块内的 `$` 不误解析；XSS 样例被 sanitize；异常公式不抛错。
- 全量 lint、typecheck、构建通过（Node 24）。
- 浏览器走查：文章编辑全流程（工具栏插入、快捷键、三模式切换、同步滚动、公式预览）。

验收：

- 7 处输入点均为新编辑器，工具栏/快捷键/三模式可用，插入不丢选区。
- 行内与块级公式在编辑预览与阅读视图渲染一致且正确。
- 资源描述按 Markdown 渲染。
- 无权限/失败场景行为不变；XSS 防线不放松。

## [S7] 代码块渲染优化（2026-11-12 增量）

需求：代码块语法高亮（按语言）、卡片化外观 + 语言标签、复制按钮、行号。依赖选型已审核：`highlight.js`（core + 按需注册常用语言）+ `marked-highlight`，同步渲染，不改 `renderMarkdown()` 签名。

- **语法高亮**：`marked` 经 `marked-highlight` 调 `hljs.highlight()`；注册常用语言（js/ts/python/java/c/cpp/go/rust/sql/bash/json/xml/css/markdown/php 等 15 种），别名（如 `js`、`sh`）由 hljs 处理；未知语言降级纯文本转义。
- **行号**：高亮输出按行切分并包 `span.md-code-line`（跨行 span 用开标签栈闭合/重开，保持 class），行号用 CSS counter，不可选中。
- **语言标签**：`<pre data-lang>`（fence 信息串）→ 右上角 chip 纯 CSS 展示；无语言不显示。
- **复制按钮**：`<pre>` 内注入 `button.md-copy`；点击经事件委托复制 `code` 纯文本，短暂反馈「已复制」。
- **外观**：代码块卡片化（背景/圆角/边距），高亮 token 用暖纸色调色板（贴 tokens.css：clay/mineral/plum 等），全局样式随 `.md-body`。
- **预览一致**：编辑器预览区改用 `MarkdownBody` 组件（与阅读视图共享渲染与复制行为）。
- 安全：`renderMarkdown` 全链路仍经 DOMPurify；代码内 HTML 恒转义。
- 测试：`renderMarkdown` 单测覆盖——高亮类名/语言别名、行号 span 数、未知语言降级、代码内 `<script>` 转义、复制按钮存在。
