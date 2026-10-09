# Staging package — GAH Phase 0 integration

**Status: PREPARED, NOT DEPLOYED. No staging environment is authorized yet —
do not deploy until Thomas approves the staging environment.**

This package contains everything needed to stand up a nonproduction staging
deployment of the `ren/phase0-integration` branch for regression review:

| File | Purpose |
|---|---|
| `STAGING_READINESS.md` | Readiness report: what was verified, what remains |
| `bindings.md` | Pages project binding configuration (DO + env) |
| `rollback.md` | Rollback instructions |
| `smoke-tests/smoke.sh` | Automated smoke tests (run against staging URL) |
| `smoke-tests/README.md` | How to run the smoke tests |

## The two workers

1. **Pages worker** — the site itself. Source: `_worker.js` at the
   `ren/phase0-integration` commit recorded in `STAGING_READINESS.md`.
   Deploys as the Pages project's worker (existing pipeline; no change).
2. **Rate-limiter worker** — `workers/sec-rate-limiter/` (standalone).
   Deploy FIRST with `wrangler deploy`, then bind it from the Pages project
   (see `bindings.md`).

## Deploy order (when authorized)

1. Deploy `workers/sec-rate-limiter` → note its worker name.
2. Configure the Pages project bindings per `bindings.md`.
3. Deploy the Pages worker from the integration branch commit.
4. Run `smoke-tests/smoke.sh https://<staging-url>`.
5. Review `STAGING_READINESS.md` open items.

## What this package does NOT do

- No production bindings, secrets, or DNS changes.
- No PayPal state changes (smoke tests verify the disabled-checkout state).
- No merge into main.
