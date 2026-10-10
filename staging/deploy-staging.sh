# Staging deployment runbook — GAH Phase 0 integration
#
# Execute ONLY after Thomas's staging authorization (granted 2026-10-09).
# Requires: CLOUDFLARE_API_TOKEN with Pages/Workers/Durable Objects scope.
#
# Order:
#   1. Deploy gah-sec-rate-limiter-staging (DO host)
#   2. Deploy gah-mock-wiki-staging (isolated mock backend)
#   3. Create staging Pages project, deploy _worker.js @ pinned commit
#   4. Bind GAH_SEC_RATE_LIMITER -> gah-sec-rate-limiter-staging (script_name)
#   5. Set env vars: GAH_STAGING=true, GAH_WIKI_HOST=<mock host>,
#      X_ADMIN_TOKEN=<staging-only>
#   6. Run validation sequence (see staging/DEPLOY_MANIFEST.md)

set -u

# ---- 0. Preflight -------------------------------------------------------
# PINNED_COMMIT must match the authorized release candidate.
PINNED_COMMIT="4a8dc42e3e4d99c3af7fdc33c9fb6687a7a730fb"
ACCOUNT_ID="${CLOUDFLARE_ACCOUNT_ID:?set CLOUDFLARE_ACCOUNT_ID}"

cd ~/workspace/gah-repo
git fetch origin -q
TIP="$(git rev-parse "origin/ren/phase0-integration")"
[ "$TIP" = "$PINNED_COMMIT" ] || { echo "TIP MISMATCH: $TIP != $PINNED_COMMIT"; exit 1; }
echo "Commit confirmed: $TIP"

# ---- 1. Rate limiter (staging) ------------------------------------------
cd ~/workspace/gah-repo/workers/sec-rate-limiter
wrangler deploy --config wrangler.staging.toml

# ---- 2. Mock wiki backend -------------------------------------------------
cd ~/workspace/gah-repo/workers/mock-wiki-backend
wrangler deploy
MOCK_HOST="$(wrangler deployments list 2>/dev/null | grep -o '[a-z0-9-]*\.workers\.dev' | head -1)"
echo "Mock wiki host: $MOCK_HOST"

# ---- 3. Pages project ------------------------------------------------------
# NOTE: pages deploy expects a directory containing _worker.js (advanced mode).
DEPLOY_DIR="$(mktemp -d)"
git -C ~/workspace/gah-repo show "$PINNED_COMMIT:_worker.js" > "$DEPLOY_DIR/_worker.js"
wrangler pages project create gah-staging --production-branch main 2>/dev/null || true
wrangler pages deploy "$DEPLOY_DIR" --project-name gah-staging --commit-hash "$PINNED_COMMIT"
rm -rf "$DEPLOY_DIR"

# ---- 4-5. Bindings + env (via API; dashboard fallback documented) ---------
# See staging/CLOUDFLARE_API_NOTES.md for the exact API calls.
echo "Next: configure DO binding + env vars per staging/CLOUDFLARE_API_NOTES.md"
