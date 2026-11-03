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
  read -r -p 'Admin email: ' admin_email
  [[ "$admin_email" =~ ^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$ ]] || { echo 'Enter a valid email address.'; exit 1; }
  password="$(od -An -N24 -tx1 /dev/urandom | tr -d ' \n')"
  umask 077
  printf 'ADMIN_EMAIL=%s\nADMIN_PASSWORD=%s\nHTTP_PORT=8080\nBIND_ADDRESS=0.0.0.0\nCOOKIE_SECURE=false\n' "$admin_email" "$password" > .env
  printf '\nAdmin email: %s\nGenerated password: %s\nSave these credentials. They are also in .env.\n\n' "$admin_email" "$password"
fi
"${docker_command[@]}" compose up -d --build --wait --wait-timeout 120
echo 'RCPitBoard is ready on http://SERVER-IP:8080 (unless changed in .env).'
