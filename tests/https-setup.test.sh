#!/usr/bin/env bash
set -euo pipefail
repo="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
test_dir="$(mktemp -d)"
trap 'rm -rf -- "$test_dir"' EXIT
mkdir -p "$test_dir/scripts" "$test_dir/bin"
cp "$repo/scripts/enable-letsencrypt.sh" "$test_dir/scripts/"
cat > "$test_dir/bin/docker" <<'STUB'
#!/usr/bin/env bash
printf '%s\n' "$*" >> "$MOCK_LOG"
if [[ "$*" == 'compose ps -q app' ]]; then printf 'existing-app\n'; fi
if [[ "$*" == *'build https'* && "${MOCK_BUILD_FAIL:-0}" == 1 ]]; then exit 1; fi
STUB
cat > "$test_dir/bin/curl" <<'STUB'
#!/usr/bin/env bash
cat >/dev/null
printf '%s' "${MOCK_HTTP:-200}"
STUB
chmod +x "$test_dir/bin/docker" "$test_dir/bin/curl"
export PATH="$test_dir/bin:$PATH" MOCK_LOG="$test_dir/docker.log"
cd "$test_dir"
run_setup() { printf '%s\n' "$1" example.com admin@example.com fake-key fake-secret | bash scripts/enable-letsencrypt.sh > output.log 2>&1; }
printf 'HTTP_PORT=80\nHTTPS_HOST=192.168.1.10\n' > .env
if run_setup 'bad.example.com/invalid'; then echo 'Invalid hostname accepted'; exit 1; fi
[[ ! -e .env.godaddy ]]
export MOCK_HTTP=403
if run_setup pitboard.example.com; then echo 'API access failure ignored'; exit 1; fi
[[ ! -e .env.godaddy ]]
grep -q HTTPS_HOST=192.168.1.10 .env
export MOCK_HTTP=200 MOCK_BUILD_FAIL=1
if run_setup pitboard.example.com; then echo 'Build failure ignored'; exit 1; fi
grep -q HTTPS_HOST=192.168.1.10 .env
! grep -q '^COMPOSE_FILE=' .env
unset MOCK_BUILD_FAIL
run_setup pitboard.example.com
grep -q '^HTTPS_HOST=pitboard.example.com$' .env
grep -q '^HTTPS_PORT=443$' .env
grep -q '^COMPOSE_FILE=compose.yaml:compose.godaddy.yaml$' .env
grep -q '^GODADDY_API_TOKEN=fake-key:fake-secret$' .env.godaddy
[[ "$(stat -c '%a' .env.godaddy)" == 600 ]]
! grep -q 'fake-secret' .env output.log "$MOCK_LOG"
grep -q 'up -d --no-deps --no-build --wait --wait-timeout 120 https' "$MOCK_LOG"
echo 'HTTPS configuration tests passed (no DNS changes or certificate requests).'
