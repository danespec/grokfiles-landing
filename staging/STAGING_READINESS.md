# Staging readiness report — Phase 0 integration (release candidate)

Branch: `ren/phase0-integration` · base: `ren/production-snapshot-20261009` @ `7bfc664`
Prepared: 2026-10-09. **Not deployed. No staging environment authorized.**

## What is in the branch (RC corrections applied)

1. **Search contract**:
   - Canonical EFTA identifiers are forwarded to the wiki backend — alias
     spellings (`efta-123`, `EFTA 123`, `EFTA_123`, …) query identically
     (`applyCanonicalUpstreamQuery`, fixture-tested).
   - Three-state exact-identifier policy: **verified** (validated evidence →
     route set), **unverified finding** (identifier match without validated
     evidence → visible, labeled, no links, no verified-access claim),
     **missing** (no match → missing-record card, excluded from hit counts).
   - Record verification strengthened: a trusted-host URL validates only
     when it references the queried identifier — a trusted host alone does
     not establish document existence. Archive routes are never
     manufactured; the row's own validated URL or nothing.
   - Barak namespace preserved: Barak identifiers get the §7
     cross-collection response, never searched as EFTA text.
   - Staging wiki-host override: `GAH_WIKI_HOST` env var (validated
     hostname only) redirects the upstream proxy for contract testing;
     production leaves it unset. See `staging/edge-and-limits.md`.
2. **Identifier library wiring**: `classifyQuery` on every `/api/search`;
   codegen sync (`node tools/sync_identifiers.mjs`) with drift-checked tests.
3. **Security**: credential stripping on the wiki hop, search limit clamp,
   atomic DO throttles (sharded per scope+IP), atomic admin-login admission
   with failures-only counting (refund-on-success).
4. **Barak corpus**: the 31,718-email leak stays separate from the
   unreconciled site inventory (`docs/phase0/BARAK_CORPUS_RECONCILIATION.md`).

## Verified (tests, this branch)

`bash tests/run_phase0_regression.sh` → **7/7 suites, 114 checks pass**:

| Suite | Checks |
|---|---|
| exact-id policy (`tests/test_exact_id_policy.mjs`) | 29 |
| identifier module (`workers/lib/test_identifiers.mjs`) | 37 |
| identifier sync + wiring (`tests/test_identifiers_sync.mjs`) | 6 |
| DO concurrency, real Miniflare (`workers/sec-rate-limiter/test/run.mjs`) | 8 |
| admin-login handler, real Miniflare (`test/admin_login.mjs`) | 12 |
| security concurrency mock | 8 |
| security fallback harness | 8 |

Smoke suites validated mechanically against a stub server (14/14 read-only
checks); they have not run against a real staging URL (none exists).

## Pre-staging checklist (for ChatGPT/Thomas)

- [ ] Wiki search contract (`docs/phase0/WIKI_SEARCH_CONTRACT_OBSERVED.md`):
      confirm upstream route paths, server-side limit enforcement, and
      `hits` vs `results` canonical key against the wiki host.
- [ ] Throttle budgets (60/min search, 30/min A2A, 5/15min admin) vs
      observed staging traffic; confirm `CF-Connecting-IP` is edge-set in
      the staging project (`staging/edge-and-limits.md`).
- [ ] Trusted-host allowlist in `validateExactIdSource`: confirm the wiki
      upstream never returns record URLs outside the listed hosts.
- [ ] `GAH_WIKI_HOST`: REQUIRED — set to an isolated mock wiki backend
      for initial contract testing. Staging must not hit the production
      wiki host until the search contract is verified against the mock.
- [ ] Staging secrets: fresh `X_ADMIN_TOKEN`, no production PayPal live
      credentials. (`WIKI_INTERNAL_PROXY_HEADER` is a fixed constant.)
- [ ] Barak arithmetic (5,587+5,505=11,092 vs 11,089) and the 19 parents:
      still unresolved; the viewer hard gate stands.
- [ ] House OCR + DOJ provenance pipelines continue on their own schedule;
      §111 claims stay unpublished pending source-level review.

## Deploy sequence (when Thomas authorizes the staging environment)

See `staging/DEPLOY_MANIFEST.md` for the precise manifest.

1. Deploy `workers/sec-rate-limiter`, then configure Pages bindings.
2. Deploy the Pages worker from the RC commit.
3. Run `smoke.sh`, then `bindings.sh configured`, then `auth.sh` (disposable token).
4. Rollback: `staging/rollback.md`.

## Known limitations / release risks

- Smoke tests are prepared but unexecuted (no staging URL exists).
- Throttle budgets are starting values, not load-tested.
- The codegen-inline approach is interim: replace with a real import when
  Thomas approves a bundler.
- The Barak viewer still renders the 181 redacted mirrors + 80 open slots;
  the "recovered parents" UI remains hard-gated.
- The unverified-finding label is new UI copy; confirm wording with Thomas
  before it faces users.
