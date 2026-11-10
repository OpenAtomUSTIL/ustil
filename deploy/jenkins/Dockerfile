# USTIL Jenkins 控制器镜像
# - docker-ce-cli + docker-compose-plugin：流水线在容器内执行 docker build / docker compose
#   （通过挂载宿主 /var/run/docker.sock 复用本机 Docker；工作目录与宿主同路径挂载以保证
#   嵌套 docker run -v / compose volumes 绑定路径在宿主可见）
# - 预装流水线所需插件（git / pipeline / 凭据绑定 / 时间戳）
# - init/ 幂等初始化脚本：安全域 + 管理员账号 + 流水线凭据 + ustil-deploy 任务
FROM jenkins/jenkins:lts-jdk17

USER root
# docker CLI 走 Debian 官方包（download.docker.com 内网不可达）：docker-cli + docker-buildx
# （docker.io 只含 daemon 不含 CLI；buildx 提供 BuildKit，Dockerfile 里的 RUN --mount 需要它）；
# Debian 13 无 docker-compose-v2 包，compose v2 插件从 GitHub Release 下载（--retry 抗网络抖动）
RUN apt-get update \
    && apt-get install -y --no-install-recommends docker-cli docker-buildx curl ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && arch="$(dpkg --print-architecture)" \
    && case "$arch" in arm64) comp=aarch64 ;; amd64) comp=x86_64 ;; *) comp="$arch" ;; esac \
    && install -m 0755 -d /usr/local/lib/docker/cli-plugins \
    && curl -fsSL --retry 5 --retry-all-errors --retry-delay 2 \
       -o /usr/local/lib/docker/cli-plugins/docker-compose \
       "https://github.com/docker/compose/releases/download/v2.32.4/docker-compose-linux-${comp}" \
    && chmod +x /usr/local/lib/docker/cli-plugins/docker-compose \
    && docker --version && docker compose version
USER jenkins

RUN jenkins-plugin-cli --plugins \
      git \
      workflow-aggregator \
      credentials-binding \
      timestamper

COPY --chown=jenkins:jenkins init/ /usr/share/jenkins/ref/init.groovy.d/
