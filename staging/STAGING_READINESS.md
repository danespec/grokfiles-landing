# Staging readiness report — Phase 0 integration

Branch: `ren/phase0-integration` · base: `ren/production-snapshot-20261009` @ `7bfc664`
Prepared: 2026-10-09. **Not deployed. No staging environment authorized.**

## What is in the branch

1. **Exact-ID fabrication eliminated** (`applyExactIdentifierPolicy`): exact
   EFTA queries return the verified record or a missing-record response.
   "Verified" requires validated source evidence
   (`validateExactIdSource`: canonical `/archive/EFTA########` route for the
   queried id, https URL on a trusted host, or upstream attestation with
   provenance). Identifier match alone, or a bare non-empty string, is not
   verification. Missing responses carry no bundle/visual URLs; archive
   routes are never manufactured; missing cards are excluded from hit counts.
2. **Identifier library wired into the search path**: `classifyQuery` runs on
   every `/api/search` request. EFTA-shaped queries are canonicalized
   (`efta-123` → `EFTA00000123`); Barak identifiers get the §7
   cross-collection response (namespace separation enforced in code). The lib
   (`workers/lib/gah_identifiers.js`) is the source of truth; a codegen sync
   (`node tools/sync_identifiers.mjs`) inlines it into `_worker.js`
   (Pages-compatible single-file output, no bundler required);
   `tests/test_identifiers_sync.mjs` fails on drift.
3. **Security**: credential stripping on the wiki hop, search limit clamp,
   atomic DO throttles (sharded per scope+IP) in the separate
   `workers/sec-rate-limiter/` worker, atomic admin-login admission with
   failures-only counting (refund-on-success).

## Verified (tests, this branch)

- `bash tests/run_phase0_regression.sh` → **6/6 suites, 94+ checks pass**:
  exact-id policy 27/27 (3 situations + source-validation policy +
  no-fabrication + hit-count exclusion), identifier sync 6/6, identifier
  module 37/37, DO concurrency 8/8 (real Miniflare), admin-login handler
  12/12 (real Miniflare: 10 simultaneous bad logins → 5 admitted/5 blocked;
  failures-only counting; shared-IP persistence; fail-open paths).
- `node --check _worker.js` and `node --check workers/sec-rate-limiter/src/index.js` clean.

## Pre-staging checklist (for ChatGPT/Thomas)

- [ ] Wiki search contract (`docs/phase0/WIKI_SEARCH_CONTRACT_OBSERVED.md`):
      confirm upstream route paths, server-side limit enforcement, and
      `hits` vs `results` canonical key against the wiki host.
- [ ] Throttle budgets: confirm 60/min/IP (`/api/search`) and 30/min/IP
      (A2A) against observed staging traffic; confirm `CF-Connecting-IP`
      is edge-set and unspoofable in the staging project.
- [ ] Trusted-host allowlist in `validateExactIdSource`: confirm the wiki
      upstream never returns record URLs outside the listed hosts.
- [ ] Barak arithmetic (5,587+5,505=11,092 vs 11,089) and the 19 parents:
      still unresolved — see `docs/phase0/BARAK_CORPUS_RECONCILIATION.md`.
      The viewer hard gate stands.
- [ ] Staging secrets: fresh `X_ADMIN_TOKEN`, no production PayPal live
      credentials, own `WIKI_INTERNAL_PROXY_HEADER`.

## Deploy sequence (when Thomas authorizes the staging environment)

1. `cd workers/sec-rate-limiter && wrangler deploy` (runs `v1` migration).
2. Configure Pages bindings per `staging/bindings.md`.
3. Deploy the Pages worker from this branch's commit.
4. `bash staging/smoke-tests/smoke.sh https://<staging-url>` — covers
   search (text/exact/Barak/limit-clamp), A2A, `/barak`, member routes,
   PayPal disabled-checkout state, MCP/api-catalog/openapi, admin login.
5. Rollback plan: `staging/rollback.md`.

## Known limitations

- Smoke tests are prepared but unexecuted (no staging URL exists).
- The codegen-inline approach is interim: when Thomas approves a bundler,
  replace the GENERATED IDENTIFIERS section with a real import.
- The Barak viewer still renders the 181 redacted mirrors + 80 open slots;
  the "recovered parents" UI remains hard-gated.
