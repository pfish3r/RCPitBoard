#!/usr/bin/env bash
# Sourced by setup/update. Existing user settings are never replaced.
ensure_https_host() {
  local env_file="${1:-.env}"
  if grep -Eq '^[[:space:]]*HTTPS_HOST=' "$env_file"; then return; fi
  local https_address=localhost candidate addresses
  addresses="$(hostname -I 2>/dev/null || true)"
  for candidate in $addresses; do
    if [[ "$candidate" =~ ^[0-9]+(\.[0-9]+){3}$ && "$candidate" != 127.* && "$candidate" != 169.254.* ]]; then
      https_address="$candidate"
      break
    fi
  done
  printf '\nHTTPS_HOST=%s\n' "$https_address" >> "$env_file"
  echo "HTTPS certificate address: $https_address (change HTTPS_HOST in .env if needed)."
}
