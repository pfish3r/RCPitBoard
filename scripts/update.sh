#!/usr/bin/env bash
set -euo pipefail
cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.."
if docker info >/dev/null 2>&1; then
  docker_prefix=()
else
  docker_prefix=(sudo)
  sudo docker info >/dev/null
fi
# sudo drops exported variables. Pass the selected tag explicitly after sudo
# so build, deployment and rollback all address the intended image.
docker_run() {
  "${docker_prefix[@]}" env "IMAGE_TAG=${IMAGE_TAG:-local}" docker "$@"
}
git rev-parse --is-inside-work-tree >/dev/null
[[ -f .env ]] || { echo 'Run bash scripts/setup.sh first.'; exit 1; }
exec 9>.update.lock
flock -n 9 || { echo 'An update is already running.'; exit 1; }
[[ -z "$(git status --porcelain --untracked-files=normal)" ]] || { echo 'Commit or remove local code changes before updating. .env is preserved.'; exit 1; }
[[ "$(git branch --show-current)" == main ]] || { echo 'Switch to the main branch before updating.'; exit 1; }
old_commit="$(git rev-parse HEAD)"
git fetch origin main
git merge-base --is-ancestor HEAD origin/main || { echo 'Local history has diverged. Resolve it before updating.'; exit 1; }
container_id="$(docker_run compose ps -q app)"
old_image=''
if [[ -n "$container_id" ]]; then old_image="$(docker_run inspect --format '{{.Image}}' "$container_id")"; fi
git merge --ff-only origin/main
source scripts/configure-https.sh
ensure_https_host .env
new_commit="$(git rev-parse HEAD)"
export IMAGE_TAG="$new_commit"
# Build first: a build failure leaves the running container untouched.
docker_run compose build app || { echo 'Build failed. Existing container is still running. Fix the issue and run this script again.'; exit 1; }
if docker_run compose up -d --no-build --wait --wait-timeout 120; then
  echo "RCPitBoard deployed: $new_commit"
else
  echo 'Health check failed. Restoring the previous running image.'
  if [[ -n "$old_image" ]]; then
    docker_run image tag "$old_image" rcpitboard:rollback
    if IMAGE_TAG=rollback docker_run compose up -d --no-build --wait --wait-timeout 120; then
      echo 'Previous image restored and healthy.'
    else
      echo 'Rollback also failed. Check container logs before retrying.'
    fi
  fi
  echo "Update failed. Previous source commit: $old_commit. See docker compose logs --tail=100 app."
  exit 1
fi
