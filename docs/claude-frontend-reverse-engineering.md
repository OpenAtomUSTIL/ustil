# Claude 官网前端样式/结构逆向分析报告（REA 取证）

> 目标：`https://claude.ai/`、`https://claude.com/`（Claude 官方站点）
> 工具：REA（browser-provider：`list_browser_targets` / `inspect_web_page` / `capture_web_screenshot`）+ 原始 HTML/CSS 拉取
> 用途：为「开放原子 USTIL 开放论坛」前端提供**风格与结构参考**。
> 知识产权边界：本项目**不使用** Anthropic 的商标、标识、品牌名、字体文件（AnthropicSans/Serif/Mono）与任何原文案；
> 仅复用"可自由取用的事实性设计度量"（色值、间距、圆角、阴影、版式宽度）并以开源字体替代、以原创组件实现。

---

## 1. 取证环境与证据台账

| # | 证据 ID（Evidence） | 操作 | 内容 |
|---|---|---|---|
| E1 | `ev_c21ce390…3fada0d10` | `list_browser_targets` | Chrome 155 headless CDP 会话，确认 claude.ai 目标存在 |
| E2 | `ev_0ed9277e…dabae0` | `inspect_web_page` | claude.ai 被 Cloudflare 拦截（"Just a moment…"），60 节点挑战页；**无法直达应用 UI** |
| E3 | `ev_13c818e7…5a21ea035` | `capture_web_screenshot` | claude.com 首页 1440×813 视口截图（sha256 `6fde66b6…f3f6807`） |
| E4 | `ev_e24e85c5…bdfdff84df` | `inspect_web_page` | claude.com 首页完整 DOM 结构（1724 节点，含 header/nav/hero/footer 语义树） |
| E5 | curl 抓取 | 静态源 | `claude.com/` HTML 348KB + 6 个 CSS chunk（合计 561KB）中的设计令牌 |

**边界声明（观测 vs 推断）**：
- claude.ai 的**登录后应用界面**未取证（Cloudflare 挑战 + 需登录），本报告覆盖的是**官网公开页**。
- 色值/圆角/阴影/宽度令牌来自 E5 的 CSS 自定义属性，是**观测事实**；"该站点视觉语言"的整体概括属于**推断**。

---

## 2. 观测到的结构骨架（E4）

```
html[lang][class]
└─ body
   ├─ a（跳转主内容 skip-link）
   ├─ header[data-cta-section]           ← 吸顶导航
   │  ├─ a > svg[aria-label]             ← 品牌标识（本项目替换为自有标识）
   │  └─ nav[aria-label]
   │     ├─ button[aria-expanded][aria-haspopup]  ← 下拉式导航项（带 chevron svg）
   │     ├─ div[role][inert]             ← 下拉面板：标题 + UL>LI>A>SPAN 链接组（多列）
   │     └─ 登录（文本链接）+ 双胶囊按钮（描边按钮 + 实心按钮）
   ├─ main
   │  ├─ hero：巨号衬线标题 + 副文案 + 认证卡片（大圆角）+ 右侧媒体卡（大圆角）
   │  └─ 分区内容（定价卡、功能卡、页脚前 CTA）
   └─ footer[role=contentinfo]           ← 多列链接组 + 法务行
```

要点：
1. **语义完整**：skip-link、`aria-expanded/haspopup/inert`、`role=menubar` 式下拉、`contentinfo`，无障碍标注完备。
2. **导航模式**：`Logo | 4~5 个下拉项 + 直达项 | Login + 两个胶囊 CTA`（描边 + 实心各一）。
3. **hero 模式**：超大衬线标题（宽约 30ch）+ 短副文案 + 圆角卡片（登录卡 24px 圆角）+ 右侧 24px 圆角媒体。
4. **页脚模式**：3~5 列链接组，每列一个短标题 + 6~10 条链接。

## 3. 观测到的视觉语言（E3 截图 + E5 令牌）

### 3.1 色板（CSS 自定义属性，事实值）

暖灰阶（"纸感"底色系）：

| 令牌 | 值 | | 令牌 | 值 |
|---|---|---|---|---|
| `--color-gray-000` | `#fff` | | `--color-gray-550` | `#73726c` |
| `--color-gray-050` | `#faf9f5` ← 主背景 | | `--color-gray-600` | `#5e5d59` |
| `--color-gray-100` | `#f5f4ed` | | `--color-gray-700` | `#3d3d3a` |
| `--color-gray-150` | `#f0eee6` | | `--color-gray-750` | `#30302e` |
| `--color-gray-200` | `#e8e6dc` ← 次级填充 | | `--color-gray-800` | `#262624` |
| `--color-gray-250` | `#dedcd1` | | `--color-gray-900` | `#1a1918` |
| `--color-gray-300` | `#d1cfc5` | | `--color-gray-950` | `#141413` ← 正文墨色/深色底 |
| `--color-gray-400` | `#b0aea5` ← 主描边 | | `--color-gray-1000` | `#000` |

强调色与品牌调色板：

| 令牌 | 值 | 角色 |
|---|---|---|
| `--color-clay` | `#d97757` | 主强调（陶土橙） |
| `--color-clay-hover` | `#c6613f` | 强调 hover / clay 按钮底 |
| `--color-clay-dark` | `#c46849` | focus 环 |
| `--color-peach` | `#ebc9b7` | 品牌浅色系 |
| `--color-cactus` | `#bcd1ca` | 品牌浅绿 |
| `--color-heather` | `#cbcadb` | 品牌浅紫 |
| `--color-plum` | `#827dbd` | heather 反色 |
| `--color-mineral` | `#629987` | cactus 反色 |
| `--color-sky` | `#6a9bcc` | 辅助蓝 |
| `--color-error` | `#bf4d43` | 错误红 |
| `#e3dacc` | — | 高频使用的暖描边/分隔色 |

### 3.2 度量令牌（事实值）

- **圆角**：`--br-2/4/6/8/12/16/24/32/48/64`（常用 12 / 16 / 24）；媒体卡 `--media-radius: .75em`。
- **阴影**：`0 2px 8px #0000000a`（sm）、`0 4px 20px #0000000a`（md）、`0 4px 16px #0000001a`（lg）——非常轻。
- **描边**：`0.5 / 1 / 1.5 / 2px` 四档。
- **间距**：`--gap-xs:1rem / sm:1.5rem / md:2rem / lg:3rem`。
- **版式宽度**：`20ch（窄）/ 30ch（标题）/ 45ch（题）/ 60ch（正文）/ 70ch（宽）/ 80ch（长文）`。
- **字号**：正文 `clamp(15px, ≈0.19vw+14.3px, 17px)`；副标题 `clamp(1.125rem,1.25vw,1.3125rem)`；
  hero 标题 `clamp(3.5rem, 9.28vw + 1.64rem, 10rem)` 量级的 clamp 流式字号。
- **按钮体系**：primary = 墨色底 + 白字（weight 480）；secondary = gray-200 底（weight 500）；
  clay = `#c6613f` 底 + 白字（weight 500）；输入白底、focus 环用 `--color-focus`。

### 3.3 字体（观测到声明，**不复用**）

站点声明 `anthropicSans / anthropicSerif / anthropicMono`（woff2 专有字体文件）。
→ 本项目**不下载、不内嵌**这些字体文件，改用开源等价：

| 原角色 | 本项目替代 |
|---|---|
| anthropicSerif（展示衬线） | `"Source Serif 4", "Noto Serif SC", Georgia, serif` |
| anthropicSans（正文无衬线） | `"Inter", "Noto Sans SC", -apple-system, "Segoe UI", sans-serif` |
| anthropicMono | `ui-monospace, "SF Mono", "JetBrains Mono", monospace` |

## 4. 观测到的 hero 视觉（E3 截图）

深墨色 hero（`#141413` 量级）+ 米白衬线巨标题（如 "Question what's next"）+ 短副文案 +
圆角登录卡（描边按钮与实心按钮竖排）+ 右侧大圆角媒体卡；顶栏在深色 hero 上为浅色文字 + 一描边一实心胶囊按钮。

---

## 5. 映射到「开放原子 USTIL 开放论坛」

| 观测模式 | 论坛落地 |
|---|---|
| 吸顶导航：Logo + 下拉组 + 双胶囊 CTA | `header`：自研标识 + 「板块/参与/资源/关于」下拉 + 「登录」+「发布主题」胶囊 |
| hero：巨衬线标题 + 30ch 宽 + 双 CTA + 统计 | hero 区：原创标语 + 三个统计芯片 + 「浏览讨论」「发布主题」 |
| 暖灰纸感底 `#faf9f5` + 墨色 `#141413` | 全站基调（事实色值直接复用） |
| 陶土橙强调 `#d97757` | 主 CTA、点赞态、活跃高亮、tag 描边 |
| 品牌浅色系（peach/cactus/heather） | 分类/标签 chip 配色 |
| 圆角 12/16/24 + 极轻阴影 | 帖子卡 16px、面板 12px、hero 卡 24px |
| 版式宽度令牌（30/60/80ch） | 标题行宽 30ch、摘要 60ch、帖子正文 80ch |
| 多列页脚 | 4 列（社区/参与/资源/关于）+ 法务行 |
| 语义与 a11y（skip-link / aria-expanded / contentinfo） | 全部保留 |

## 6. 未决/限制

- claude.ai **登录后应用 UI**（对话工作台）未取证 —— 如需其输入框/侧栏模式，需要带登录态的浏览器会话。
- 页面动效（滚动揭示、hover 过渡时长）未逐项测量；本项目采用 150–250ms 常规过渡作为**设计选择**。
- E5 的 CSS 为当时构建产物（`/_next/static/chunks/*.css`），站点改版后令牌可能变化。
