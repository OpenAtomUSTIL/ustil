#!/usr/bin/env bash
# 生成 TLS 证书到 deploy/nginx/certs/（nginx 挂载点；私钥禁止入库，见 certs/.gitignore）
# 本地/内网自签：bash deploy/init-certs.sh
# 生产环境请换成 CA 签发证书（如 certbot），把 fullchain.pem / privkey.pem 放到同目录
set -euo pipefail

cd "$(dirname "$0")/nginx/certs"

if [[ -f fullchain.pem && -f privkey.pem ]]; then
  echo "证书已存在（fullchain.pem / privkey.pem），如需重签请先删除旧文件"
  exit 0
fi

openssl req -x509 -nodes -newkey rsa:2048 -days 365 \
  -keyout privkey.pem -out fullchain.pem \
  -subj "/CN=localhost"

echo "自签证书已生成：nginx/certs/{fullchain.pem,privkey.pem}"
