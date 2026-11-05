#!/usr/bin/env bash
set -euo pipefail
cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.."
command -v docker >/dev/null || { echo 'Install Docker Engine and the Docker Compose plugin first. See README.md.'; exit 1; }
docker compose version >/dev/null
if docker info >/dev/null 2>&1; then
  docker_command=(docker)
else
  docker_command=(sudo docker)
  "${docker_command[@]}" info >/dev/null
fi
if [[ ! -f .env ]]; then
  umask 077
  printf 'HTTP_PORT=80\nBIND_ADDRESS=0.0.0.0\n' > .env
fi
source scripts/configure-https.sh
ensure_https_host .env
"${docker_command[@]}" compose up -d --build --wait --wait-timeout 120
echo 'RCPitBoard is ready on http://SERVER-IP and https://SERVER-IP (unless ports changed in .env). HTTPS uses a local certificate authority.'
