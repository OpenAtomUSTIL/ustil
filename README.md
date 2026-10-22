# USTIL 开放论坛 · 前端

开放原子 USTIL（University Student Technology & Innovation Lab）学生开源社区的开放论坛前端。
**纯 HTML / CSS / JavaScript（ES Modules）实现**，无框架、无构建步骤，起任意静态服务器即可运行。

## 运行

```bash
cd Front
python3 -m http.server 8080        # 或 npx serve .
# 打开 http://localhost:8080
```

> 需通过 HTTP 访问（ES Modules 不支持 file:// 直开）。

## 目录结构

```
Front/
├── index.html                 # 入口
├── css/
│   ├── tokens.css             # 设计令牌（色板/圆角/阴影/间距/版式宽度/字体）
│   └── app.css                # 布局与组件样式
├── js/
│   ├── data.js                # 种子数据（板块/用户/帖子/活动）
│   ├── store.js               # 状态层（localStorage 持久化）
│   ├── ui.js                  # 小组件与工具（图标/头像/卡片/toast）
│   ├── views.js               # 页面视图（首页/详情/发帖/关于）
│   └── app.js                 # 路由与页面骨架（顶栏/页脚）
└── docs/
    └── claude-frontend-reverse-engineering.md   # REA 逆向分析报告
```

## 功能

- **首页**：hero + 讨论流、板块筛选（6 个板块）、排序（最新/最热/等待解答）、标签与关键词搜索
- **帖子详情**：正文（轻量 Markdown：`**粗体**` `` `代码` `` `> 引用`）、点赞、引用回复、楼层号
- **发帖**：标题/板块/标签/正文表单，草稿保存
- **账号**：演示用昵称登录（本地存储，无后端）
- **持久化**：帖子、回复、点赞、草稿均写入 `localStorage`（键 `ustil-forum-v1`）
- **导航**：吸顶顶栏 + 下拉菜单 + 移动端汉堡菜单；skip-link、`aria-expanded`、`role=menu` 等无障碍标注

## 设计来源与边界

界面风格参考了 Claude 官网（claude.com）的**版式语言与设计令牌**，
取证过程、证据台账与令牌映射见
[docs/claude-frontend-reverse-engineering.md](docs/claude-frontend-reverse-engineering.md)。

边界：**不包含** Anthropic 的商标、标识、品牌名、专有字体文件与任何原文案；
色值/圆角/阴影/版式宽度等事实性度量按报告映射复用，字体使用开源替代
（Source Serif 4 / Inter / Noto Sans SC），标识、文案、组件代码均为原创。

## 后续（对接 Backen）

`js/store.js` 是唯一的状态出口：把 `sortedPosts / addPost / addReply / toggleLike`
换成 `fetch` 调用即可接入后端 API，视图层无需改动。
