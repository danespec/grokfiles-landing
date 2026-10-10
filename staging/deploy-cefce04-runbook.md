# Staging deployment runbook — commit cefce04 (STAGING-HARDEN-001 corrections)

**Approved for STAGING ONLY. Run on Thomas's Mac under his Wrangler OAuth session.**

## What deploys

| # | Resource | Source | Notes |
|---|---|---|---|
| 1 | Pages `gah-staging-517b8499` | `_worker.js` @ `cefce04` | The only thing that changes. Workers 2-3 are untouched. |

**Do NOT redeploy** `gah-limiter-staging-517b8499` or `gah-mock-staging-517b8499` —
they are already running and healthy. This deployment is Pages-only.

## Pre-flight (on the Mac)

```bash
# 1. Verify the commit is on GitHub:
git ls-remote origin refs/heads/ren/phase0-integration
# Expected: cefce0489d588e52e4f11a91f8d06a4aedb43052

# 2. Verify wrangler auth (OAuth, no credentials exported):
wrangler whoami

# 3. Clone or update the repo:
git clone git@github.com:danespec/grokfiles-landing.git ~/gah-deploy 2>/dev/null || \
  (cd ~/gah-deploy && git fetch origin && git checkout ren/phase0-integration && git pull)
cd ~/gah-deploy
git checkout cefce04

# 4. Verify the worker file:
node --check _worker.js && echo "SYNTAX OK"
```

## Deploy (Pages only)

```bash
# Deploy _worker.js to the EXISTING staging Pages project.
# This uses Pages' "direct upload" via the worker — adjust to your existing
# pipeline if you deploy via wrangler pages deploy with a build directory.

# Option A: if you use wrangler pages deploy with _worker.js as the worker:
cd ~/gah-deploy
wrangler pages deploy . --project-name=gah-staging-517b8499 --commit-dirty=true

# Option B: if your pipeline builds from git (Cloudflare Git integration):
# Push is already done (cefce04 is on origin). Trigger the build from the
# dashboard: Pages > gah-staging-517b8499 > Deployments > Retry deployment
# on the cefce04 commit, OR create a new deployment from that commit.
```

**Critical:** The Pages project must keep its existing bindings:
- `GAH_STAGING=true`
- `GAH_WIKI_HOST=<existing mock host>` (do NOT change)
- Durable Object binding to `gah-limiter-staging-517b8499`
- Existing admin secret (do NOT rotate)
- Existing static assets (the deploy must include them, not just `_worker.js`)

## Verification (run after deploy)

```bash
BASE="https://gah-staging-517b8499.pages.dev"

# 1. Homepage 200 + privacy headers:
curl -sI "$BASE/" | grep -iE "HTTP/|x-robots-tag"
# Expected: HTTP/2 200, X-Robots-Tag: noindex, nofollow, noarchive

# 2. Consent config sanitized (no production GA4):
curl -s "$BASE/" | grep -o 'window.GAH_CONSENT_BOOT=[^;]*' | head -1
# Expected: "googleTagEnabled":false, "ga4MeasurementId":""
# Must NOT contain: G-48G8M0230N

# 3. Search against mock (all three EFTA states):
# Verified EFTA:
curl -s -X POST "$BASE/api/search" -H "Content-Type: application/json" \
  -d '{"q":"EFTA00000001","no_ai":true}' | head -c 200
# Unverified/missing states: use the smoke test suite:
bash staging/smoke-tests/smoke.sh "$BASE"

# 4. Rate limiter (DO):
bash staging/smoke-tests/bindings.sh "$BASE"

# 5. Membership isolation + PayPal disabled:
bash staging/smoke-tests/auth.sh "$BASE"

# 6. Assets + PDF.js:
curl -s -o /dev/null -w "%{http_code}\n" "$BASE/assets/v3.css"          # 200
curl -s -o /dev/null -w "%{http_code}\n" "$BASE/pdfjs/build/pdf.mjs"    # 200
```

## Rollback (if validation fails)

See `staging/rollback-staging-517b8499.md` — restore the previous known-good
Pages deployment via dashboard (Pages > gah-staging-517b8499 > Deployments >
Rollback). Do NOT touch the workers.

## What this never does

- No new Cloudflare projects (uses existing `gah-staging-517b8499`)
- No production deploys, DNS changes, or payment activation
- No credential export (Wrangler OAuth stays on the Mac)
- No changes to `gah-limiter-staging-517b8499` or `gah-mock-staging-517b8499`
