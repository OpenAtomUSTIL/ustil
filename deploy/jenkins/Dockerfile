# USTIL Jenkins 控制器镜像
# - docker-ce-cli + docker-compose-plugin：流水线在容器内执行 docker build / docker compose
#   （通过挂载宿主 /var/run/docker.sock 复用本机 Docker；工作目录与宿主同路径挂载以保证
#   嵌套 docker run -v / compose volumes 绑定路径在宿主可见）
# - 预装流水线所需插件（git / pipeline / 凭据绑定 / 时间戳）
# - init/ 幂等初始化脚本：安全域 + 管理员账号 + 流水线凭据 + ustil-deploy 任务
FROM jenkins/jenkins:lts-jdk17

USER root
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates curl gnupg \
    && install -m 0755 -d /etc/apt/keyrings \
    && curl -fsSL https://download.docker.com/linux/debian/gpg \
       | gpg --dearmor -o /etc/apt/keyrings/docker.gpg \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
       https://download.docker.com/linux/debian $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
       > /etc/apt/sources.list.d/docker.list \
    && apt-get update \
    && apt-get install -y --no-install-recommends docker-ce-cli docker-compose-plugin \
    && rm -rf /var/lib/apt/lists/*
USER jenkins

RUN jenkins-plugin-cli --plugins \
      git \
      workflow-aggregator \
      credentials-binding \
      timestamper

COPY --chown=jenkins:jenkins init/ /usr/share/jenkins/ref/init.groovy.d/
