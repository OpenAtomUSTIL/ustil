# syntax=docker/dockerfile:1
# ============================================================
# ustil-front（Vue3 + Vite）多阶段构建
#   deps    —— pnpm install（含缓存挂载，便于 CI 复用层缓存）
#   build   —— node:20-alpine：pnpm build 产出 dist/
#   runtime —— nginx:alpine 托管静态文件
# 红线：
#   - Node 20（MUST NOT 升级更高版本）；包管理器只用 pnpm（MUST NOT npm/yarn）
#   - 站点配置 deploy/nginx/default.conf 不在本构建上下文内，
#     由 docker-compose 挂载到 /etc/nginx/conf.d/default.conf
# ============================================================

# ---------- base：Node 20 + pnpm ----------
FROM node:20-alpine AS base
# pnpm 锁定主版本 10（兼容 Node 20 与 pnpm-workspace.yaml 设置文件，理由见 ustil-hub/Dockerfile）
RUN npm install -g pnpm@10
WORKDIR /app

# ---------- deps：安装依赖 ----------
FROM base AS deps
# lockfile 已生成 → --frozen-lockfile；未生成 → 退回 --no-frozen-lockfile 兼容（工程化初期）
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml* ./
RUN --mount=type=cache,id=pnpm-store-front,target=/pnpm/store \
    if [ -f pnpm-lock.yaml ]; then \
      pnpm install --frozen-lockfile --store-dir /pnpm/store; \
    else \
      echo "WARN: pnpm-lock.yaml 不存在，退回 --no-frozen-lockfile 兼容模式" && \
      pnpm install --no-frozen-lockfile --store-dir /pnpm/store; \
    fi

# ---------- build：pnpm build 产出 dist/ ----------
FROM deps AS build
COPY . .
# COPY . 会把宿主机 node_modules（darwin 二进制）带进来，重新用 Linux 产物覆盖
COPY --from=deps /app/node_modules ./node_modules
# VITE_API_BASE_URL：构建期注入（同源反代——nginx location /api/ → api:3000——时留空即可）
ARG VITE_API_BASE_URL=""
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN pnpm build

# ---------- runtime：nginx 托管 dist/ ----------
FROM nginx:alpine AS runtime
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
