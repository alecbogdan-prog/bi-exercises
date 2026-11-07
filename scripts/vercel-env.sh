#!/usr/bin/env bash
# Uploads the production environment variables to the linked Vercel project, without printing any value.
# Reads .env.local, then .env.production.local (production-only values such as the live webhook secret and SITE_URL win).
# Usage: scripts/vercel-env.sh
set -euo pipefail
cd "$(dirname "$0")/.."

VARS=(VITE_SUPABASE_URL VITE_SUPABASE_ANON_KEY SUPABASE_SERVICE_ROLE_KEY STRIPE_SECRET_KEY STRIPE_WEBHOOK_SECRET STRIPE_MANAGED_PAYMENTS SITE_URL VITE_GOOGLE_AUTH VITE_GOOGLE_CLIENT_ID VITE_GA_ID)
SECRET=(SUPABASE_SERVICE_ROLE_KEY STRIPE_SECRET_KEY STRIPE_WEBHOOK_SECRET)

value_of() {
  local name=$1 v=""
  for f in .env.local .env.production.local; do
    [[ -f $f ]] || continue
    local line
    line=$(grep -E "^${name}=" "$f" | tail -1 || true)
    [[ -n $line ]] && v=${line#*=}
  done
  printf '%s' "$v"
}

for name in "${VARS[@]}"; do
  v=$(value_of "$name")
  if [[ -z $v ]]; then
    echo "skip   $name (empty)"
    continue
  fi
  [[ $name == VITE_SUPABASE_URL ]] && v=${v%/rest/v1/} && v=${v%/rest/v1}
  flags=(--force)
  [[ " ${SECRET[*]} " == *" $name "* ]] && flags+=(--sensitive)
  printf '%s' "$v" | vercel env add "$name" production "${flags[@]}" >/dev/null 2>&1 && echo "set    $name" || echo "FAILED $name"
done
echo "Done. Redeploy (or push to main) for the new values to take effect."
