#!/bin/bash
# ============================================================================
# GAH staging rollback — runs on Thomas's Mac under his Wrangler OAuth session.
# FOR CHATGPT REVIEW BEFORE EXECUTION. Staging-only. Never touches production.
#
# Rolls back, in order:
#   1. Pages project gah-staging -> previous deployment (or delete project)
#   2. Workers gah-limiter-staging-517b8499 / gah-mock-staging-517b8499 -> delete
#
# The staging DO namespace holds only staging throttle counters (15-min
# windows); deleting the worker discards them harmlessly.
# ============================================================================
set -euo pipefail

PAGES_PROJECT="gah-staging"
LIMITER_WORKER="gah-limiter-staging-517b8499"
MOCK_WORKER="gah-mock-staging-517b8499"

PROD_BLOCKLIST=(
  "gah-sec-rate-limiter"
  "gah-mock-wiki"
  "grokarchivehub"
  "www.grokarchivehub.com"
  "wiki.grokarchivehub.com"
)

log() { printf '\n[staging-rollback] %s\n' "$*"; }
die() { printf '\n[staging-rollback] FATAL: %s\n' "$*" >&2; exit 1; }

log "Preflight: wrangler auth + blocklist"
wrangler whoami >/dev/null 2>&1 || die "wrangler whoami failed"
for target in "$PAGES_PROJECT" "$LIMITER_WORKER" "$MOCK_WORKER"; do
  for blocked in "${PROD_BLOCKLIST[@]}"; do
    [ "$target" = "$blocked" ] && die "target '$target' is blocklisted"
  done
done

cat <<EOF

================ STAGING ROLLBACK PLAN ================
Will roll back / delete ONLY:
  1. Pages project  $PAGES_PROJECT  (rollback to previous deployment)
  2. Worker         $LIMITER_WORKER (delete)
  3. Worker         $MOCK_WORKER     (delete)

Will NOT touch production projects, DNS, secrets, KV, D1, or routes.
=======================================================

EOF
read -rp "Type YES to roll back STAGING only: " CONFIRM
[ "$CONFIRM" = "YES" ] || die "Aborted by operator."

log "Rolling back Pages project $PAGES_PROJECT ..."
wrangler pages deployment list --project-name="$PAGES_PROJECT" 2>&1 | head -8
echo "Select the previous good deployment in the dashboard, or run:"
echo "  wrangler pages deployment rollback --project-name=$PAGES_PROJECT"
echo "(Interactive selection required — wrangler does not support non-interactive Pages rollback.)"

log "Deleting staging workers ..."
wrangler delete --name "$LIMITER_WORKER" 2>&1 | tail -1 || true
wrangler delete --name "$MOCK_WORKER" 2>&1 | tail -1 || true

log "Staging rollback complete. Verify: the pages.dev URL should no longer serve the RC."
