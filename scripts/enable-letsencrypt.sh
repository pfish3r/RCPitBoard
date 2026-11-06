#!/usr/bin/env bash
# Run locally on the Debian host. No secrets are sent through the admin portal.
set -euo pipefail
cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.."
[[ -f .env ]] || { echo 'Run bash scripts/setup.sh first.'; exit 1; }
command -v curl >/dev/null || { echo 'Install curl first: apt install curl'; exit 1; }
if docker info >/dev/null 2>&1; then docker_command=(docker); else docker_command=(sudo docker); fi
"${docker_command[@]}" info >/dev/null
exec 9>.update.lock
flock -n 9 || { echo 'Another configuration/update is running.'; exit 1; }
[[ -n "$("${docker_command[@]}" compose ps -q app)" ]] || { echo 'Start the board before enabling public HTTPS.'; exit 1; }
printf 'GoDaddy DNS validation uses a production Classic API key and secret.\n'
read -r -p 'Board hostname (for example pitboard.example.com): ' board_host
read -r -p 'GoDaddy DNS zone (for example example.com): ' dns_zone
read -r -p 'ACME account email: ' acme_email
board_host="${board_host,,}"
dns_zone="${dns_zone,,}"
# Restrict values written into dotenv and passed to Caddy; no shell evaluation.
valid_host() {
  [[ ${#1} -le 253 && "$1" == *.* && "$1" != *..* && "$1" != .* && "$1" != *. ]] || return 1
  [[ "$1" =~ ^[a-z0-9][a-z0-9.-]*[a-z0-9]$ && ! "$1" =~ ^[0-9.]+$ ]] || return 1
  local label
  local -a labels
  IFS=. read -r -a labels <<< "$1"
  for label in "${labels[@]}"; do
    [[ ${#label} -le 63 && "$label" != -* && "$label" != *- ]] || return 1
  done
}
valid_host "$board_host" && valid_host "$dns_zone" || { echo 'Enter valid DNS names, without a URL, port, IP address or wildcard.'; exit 1; }
[[ "$board_host" == "$dns_zone" || "$board_host" == *."$dns_zone" ]] || { echo 'The hostname must belong to the DNS zone.'; exit 1; }
[[ "$acme_email" =~ ^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$ ]] || { echo 'Enter a valid email address.'; exit 1; }
read -r -s -p 'GoDaddy production API key (hidden): ' godaddy_key; printf '\n'
read -r -s -p 'GoDaddy production API secret (hidden): ' godaddy_secret; printf '\n'
[[ "$godaddy_key" =~ ^[A-Za-z0-9_-]+$ && "$godaddy_secret" =~ ^[A-Za-z0-9_-]+$ ]] || { echo 'Invalid key or secret format.'; exit 1; }
# Read-only eligibility check. Put the credential on stdin, not in process arguments.
http_code="$(printf 'header = "Authorization: sso-key %s:%s"\nheader = "Accept: application/json"\n' "$godaddy_key" "$godaddy_secret" |
  curl --config - --silent --show-error --max-time 30 --output /dev/null --write-out '%{http_code}' "https://api.godaddy.com/v1/domains/$dns_zone/records/NS")"
[[ "$http_code" == 200 ]] || { echo "GoDaddy DNS access check failed (HTTP $http_code). Check production credentials, zone ownership and API eligibility."; exit 1; }
umask 077
secret_tmp="$(mktemp .env.godaddy.XXXXXX)"
trap 'rm -f -- "$secret_tmp"' EXIT
printf 'GODADDY_API_TOKEN=%s:%s\nACME_EMAIL=%s\n' "$godaddy_key" "$godaddy_secret" "$acme_email" > "$secret_tmp"
chmod 600 "$secret_tmp"
mv -- "$secret_tmp" .env.godaddy
unset godaddy_key godaddy_secret
# Build before changing the running proxy or selecting the override persistently.
"${docker_command[@]}" compose -f compose.yaml -f compose.godaddy.yaml build https
"${docker_command[@]}" compose -f compose.yaml -f compose.godaddy.yaml run --rm --no-deps -e "HTTPS_HOST=$board_host" https caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
set_env() {
  local key="$1" value="$2" env_tmp
  env_tmp="$(mktemp .env.XXXXXX)"
  awk -v key="$key" '$0 !~ "^[[:space:]]*" key "=" {print}' .env > "$env_tmp"
  printf '%s=%s\n' "$key" "$value" >> "$env_tmp"
  chmod 600 "$env_tmp"
  mv -- "$env_tmp" .env
}
set_env HTTPS_HOST "$board_host"
set_env HTTPS_PORT 443
set_env COMPOSE_FILE compose.yaml:compose.godaddy.yaml
"${docker_command[@]}" compose up -d --no-deps --no-build --wait --wait-timeout 120 https
echo "HTTPS is listening on port 443 for https://$board_host. Certificate issuance may take several minutes for DNS propagation."
echo 'Caddy will renew the certificate automatically while the proxy runs. Check: docker compose logs --tail=50 https'
echo 'Open the board by hostname, with that name resolving to this server. Do not use its IP address for the public certificate.'
