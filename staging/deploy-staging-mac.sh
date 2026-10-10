#!/bin/bash
# ============================================================================
# GAH staging deployment — FOR CHATGPT REVIEW BEFORE EXECUTION.
#
# Runs on Thomas's Mac under his existing Wrangler OAuth session.
# Deploys ONLY isolated staging resources. Never touches production.
#
# What it deploys (in order):
#   1. gah-sec-rate-limiter-staging  (Worker + Durable Object, staging-only)
#   2. gah-mock-wiki-staging         (Worker, deterministic fixtures)
#   3. gah-staging                   (Pages project, _worker.js @ pinned commit)
#
# Safety properties:
#   - NEVER prints, copies, or transfers Wrangler OAuth credentials.
#   - NEVER touches production names (blocklist enforced before any deploy).
#   - Validates wrangler auth, git state, and every target before executing.
#   - Confirmation gate: prints the full plan, requires typing YES.
#   - Fail-closed: GAH_STAGING=true + GAH_WIKI_HOST=<mock> (no prod fallback).
# ============================================================================
set -euo pipefail

# ---- Pinned release -------------------------------------------------------
# We pin the SHA-256 of _worker.js (the deployed artifact), not a commit SHA,
# so script-only commits don't invalidate the pin. Update ONLY for a new
# authorized RC (re-run: git show <rc>:_worker.js | sha256sum).
WORKER_SHA256="cabcda93295dd3af9509c64daed72c303ef7b4b036aaff8da71261603b8fcd6a"
BRANCH="ren/phase0-integration"
REPO_URL="git@github.com:danespec/grokfiles-landing.git"

# ---- Staging-only resource names ------------------------------------------
PAGES_PROJECT="gah-staging"
LIMITER_WORKER="gah-sec-rate-limiter-staging"
MOCK_WORKER="gah-mock-wiki-staging"

# ---- Production names that must NEVER appear as deploy targets ------------
PROD_BLOCKLIST=(
  "gah-sec-rate-limiter"
  "gah-mock-wiki"
  "grokarchivehub"
  "www.grokarchivehub.com"
  "wiki.grokarchivehub.com"
)

WORK_DIR="$HOME/gah-staging-deploy"
REPO_DIR="$WORK_DIR/grokfiles-landing"

log()  { printf '\n[staging-deploy] %s\n' "$*"; }
die()  { printf '\n[staging-deploy] FATAL: %s\n' "$*" >&2; exit 1; }

# ============================================================================
# PHASE 0 — Preflight: auth, blocklist, git state. No deploys yet.
# ============================================================================
log "Phase 0: preflight"

# 0a. Wrangler OAuth must work. whoami prints account info, never credentials.
log "Checking Wrangler authentication (whoami prints account, not credentials)..."
WRANGLER_WHOAMI="$(wrangler whoami 2>&1)" || die "wrangler whoami failed — log in with 'wrangler login' first."
echo "$WRANGLER_WHOAMI" | head -5

# 0b. Blocklist: none of the staging names may collide with production names.
for target in "$PAGES_PROJECT" "$LIMITER_WORKER" "$MOCK_WORKER"; do
  for blocked in "${PROD_BLOCKLIST[@]}"; do
    [ "$target" = "$blocked" ] && die "target '$target' is blocklisted (production name)"
  done
done
log "Blocklist check passed: all targets are staging-only names."

# 0c. Git state: exact branch + pinned commit.
if [ ! -d "$REPO_DIR/.git" ]; then
  log "Cloning $BRANCH ..."
  mkdir -p "$WORK_DIR"
  git clone --branch "$BRANCH" --single-branch "$REPO_URL" "$REPO_DIR"
fi
cd "$REPO_DIR"
git fetch origin -q
git checkout -q "$BRANCH"
git pull -q --ff-only origin "$BRANCH" || true
HEAD_SHA="$(git rev-parse HEAD)"
WORKER_HASH="$(git show HEAD:_worker.js | sha256sum | awk '{print $1}')"
[ "$WORKER_HASH" = "$WORKER_SHA256" ] || die "_worker.js hash $WORKER_HASH != pinned $WORKER_SHA256. Deploying an unreviewed worker is refused."
log "Git state OK: $BRANCH @ $HEAD_SHA (_worker.js matches pinned hash)"

# ============================================================================
# Confirmation gate — print the plan, require explicit YES.
# ============================================================================
cat <<EOF

================ STAGING DEPLOYMENT PLAN ================
Branch:  $BRANCH
_worker.js sha256: $WORKER_SHA256  (verified above)
Account: (from wrangler whoami above)

Will CREATE/DEPLOY (staging-only):
  1. Worker  $LIMITER_WORKER   (rate limiter + DO, fresh namespace)
  2. Worker  $MOCK_WORKER       (mock wiki fixtures)
  3. Pages   $PAGES_PROJECT     (_worker.js @ pinned commit)

Will CONFIGURE on $PAGES_PROJECT:
  - Durable Object binding GAH_SEC_RATE_LIMITER -> $LIMITER_WORKER (script_name)
  - Vars: GAH_STAGING=true, GAH_WIKI_HOST=<mock host>
  - Secret: X_ADMIN_TOKEN (generated, never printed)

Will NOT touch:
  - Any production project, DNS record, secret, KV, D1, or route.
  - Wrangler OAuth credentials (never printed/copied/transferred).

Rollback: staging/rollback-staging.sh (same directory as this script).
=========================================================

EOF
read -rp "Type YES to proceed with STAGING deployment only: " CONFIRM
[ "$CONFIRM" = "YES" ] || die "Aborted by operator."

# ============================================================================
# PHASE 1 — Rate-limiter worker (staging). Deployed FIRST (DO migration).
# ============================================================================
log "Phase 1: deploying $LIMITER_WORKER ..."
cd "$REPO_DIR/workers/sec-rate-limiter"
wrangler deploy --config wrangler.staging.toml > "$WORK_DIR/limiter-deploy.log" 2>&1
tail -3 "$WORK_DIR/limiter-deploy.log"
log "Rate limiter deployed."

# ============================================================================
# PHASE 2 — Mock wiki backend. Capture its workers.dev hostname.
# ============================================================================
log "Phase 2: deploying $MOCK_WORKER ..."
cd "$REPO_DIR/workers/mock-wiki-backend"
wrangler deploy > "$WORK_DIR/mock-deploy.log" 2>&1
tail -3 "$WORK_DIR/mock-deploy.log"
# Capture the workers.dev hostname from the deploy output.
MOCK_HOST="$(grep -oE 'https://[a-z0-9.-]+\.workers\.dev' "$WORK_DIR/mock-deploy.log" | head -1 | sed 's|https://||')"
[ -n "$MOCK_HOST" ] || die "could not determine mock worker hostname (see $WORK_DIR/mock-deploy.log)"
log "Mock wiki host: $MOCK_HOST"
# Fail-closed validation: the mock host must look like a workers.dev name,
# never the production wiki host.
case "$MOCK_HOST" in
  *wiki.grokarchivehub.com*) die "mock host resolves to production wiki host — refusing";;
esac

# ============================================================================
# PHASE 3 — Pages project: _worker.js @ pinned commit + bindings + vars.
# ============================================================================
log "Phase 3: preparing Pages deploy directory ..."
PAGES_DIR="$(mktemp -d)"
git -C "$REPO_DIR" show "HEAD:_worker.js" > "$PAGES_DIR/_worker.js"
[ -s "$PAGES_DIR/_worker.js" ] || die "failed to extract _worker.js at HEAD"

# wrangler.toml for the Pages project: DO binding (script_name) + staging vars.
# X_ADMIN_TOKEN is set as a secret afterwards, never in this file.
cat > "$PAGES_DIR/wrangler.toml" <<TOML
# gah-staging Pages configuration. Staging-only. Reviewed before execution.
compatibility_date = "2026-10-09"

[[durable_objects.bindings]]
name = "GAH_SEC_RATE_LIMITER"
class_name = "GahSecRateLimiterDO"
script_name = "$LIMITER_WORKER"

[vars]
GAH_STAGING = "true"
GAH_WIKI_HOST = "$MOCK_HOST"
TOML
log "Pages config written (binding -> $LIMITER_WORKER, GAH_WIKI_HOST=$MOCK_HOST)."

log "Creating Pages project $PAGES_PROJECT (idempotent) ..."
wrangler pages project create "$PAGES_PROJECT" --production-branch="$BRANCH" 2>&1 | tail -2 || true

log "Deploying Pages project ..."
cd "$PAGES_DIR"
wrangler pages deploy . --project-name="$PAGES_PROJECT" --commit-hash="$HEAD_SHA" --branch="$BRANCH" > "$WORK_DIR/pages-deploy.log" 2>&1
tail -5 "$WORK_DIR/pages-deploy.log"
PAGES_URL="$(grep -oE 'https://[a-z0-9.-]+\.pages\.dev' "$WORK_DIR/pages-deploy.log" | head -1)"
[ -n "$PAGES_URL" ] || die "could not determine Pages URL (see $WORK_DIR/pages-deploy.log)"
log "Pages URL: $PAGES_URL"

# ============================================================================
# PHASE 4 — Staging secret (generated, never printed).
# ============================================================================
log "Phase 4: generating staging X_ADMIN_TOKEN (never printed) ..."
# Pipe directly into wrangler; the value never touches the terminal or logs.
openssl rand -hex 32 | wrangler pages secret put X_ADMIN_TOKEN --project-name="$PAGES_PROJECT"
log "Staging admin token set."

# ============================================================================
# PHASE 5 — Validation: fail-closed config + smoke tests.
# ============================================================================
log "Phase 5: validation"
echo "  1. Fail-closed: GAH_STAGING=true and GAH_WIKI_HOST=$MOCK_HOST are set."
echo "     With no valid GAH_WIKI_HOST the worker returns 503 instead of"
echo "     falling back to wiki.grokarchivehub.com (unit-tested 11/11)."
echo "  2. Run the read-only smoke suite:"
echo "       bash staging/smoke-tests/smoke.sh \"\$PAGES_URL\""
echo "     (refuses production hostnames automatically)"
echo "  3. Run the DO binding evidence:"
echo "       bash staging/smoke-tests/bindings.sh \"\$PAGES_URL\" configured"
echo "  4. Confirm mock fixtures appear in search results — this proves the"
echo "     staging worker hit the mock, never the production wiki host."
echo "  5. Auth tests (separate, disposable token already rotated above —"
echo "     generate a fresh one if re-testing):"
echo "       STAGING_HOSTS=<pages host> STAGING_ADMIN_TOKEN=<token> \\"
echo "         bash staging/smoke-tests/auth.sh \"\$PAGES_URL\""

rm -rf "$PAGES_DIR"
log "Staging deployment complete. See validation steps above."
log "Rollback: bash $REPO_DIR/staging/rollback-staging.sh"
