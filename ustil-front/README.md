# USTIL 开放论坛 · 前端

开放原子 USTIL（University Student Technology & Innovation Lab）学生开源社区的开放论坛前端。
**Vue 3 + Vite + TypeScript（strict）+ Pinia + Vue Router**，包管理器 pnpm。

## 运行

```bash
pnpm install
cp .env.example .env      # 配置 VITE_API_BASE_URL（后端根地址，不带 /api/v1）
pnpm dev                  # 本地开发
pnpm typecheck            # vue-tsc --noEmit
pnpm lint                 # eslint
pnpm build                # 类型检查 + 构建
pnpm preview              # 预览构建产物
```

## 目录结构

```
├── index.html                 # Vite 入口
├── src/
│   ├── api/
│   │   ├── request.ts         # 全站唯一请求出口（含全部接口封装）
│   │   └── types.ts           # 跨端契约 DTO（与 ustil-hub/AGENTS.md §4 对齐）
│   ├── stores/                # Pinia（auth 登录态 / toast）
│   ├── router/                # 路由表与 meta.requiresAuth 守卫
│   ├── views/                 # 页面视图
│   ├── components/            # 自研组件（延用 tokens.css / app.css 设计体系）
│   ├── styles/                # 设计令牌与布局组件样式
│   └── utils/                 # 时间格式化 / Markdown 渲染消毒 / 上传预检
└── docs/                      # REA 逆向分析报告（只读留存）
```

## 约定

- 所有 HTTP 请求只经 `src/api/request.ts`；鉴权走 httpOnly cookie（`credentials: 'include'`），不读写 token。
- 后端时间一律 ISO 8601 UTC 字符串，前端本地格式化展示。
- 文章/讨论正文为 Markdown，前端用 `marked` 渲染并经 `DOMPurify` 消毒。
- 上传前端校验（扩展名白名单、≤10MB）仅为提前提示，以后端校验为准；展示上传进度与失败原因。
- 作业能否提交只看接口返回的 `canSubmit`，倒计时仅展示。

## 设计来源与边界

界面风格参考了 Claude 官网（claude.com）的**版式语言与设计令牌**，
取证过程、证据台账与令牌映射见
[docs/claude-frontend-reverse-engineering.md](docs/claude-frontend-reverse-engineering.md)。

边界：**不包含** Anthropic 的商标、标识、品牌名、专有字体文件与任何原文案；
色值/圆角/阴影/版式宽度等事实性度量按报告映射复用，字体使用开源替代
（Source Serif 4 / Inter / Noto Sans SC）。
