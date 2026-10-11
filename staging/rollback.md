# Rollback instructions (staging)

If the staging deployment misbehaves, roll back in this order. Each step is
independent and safe to perform alone.

## 1. Roll back the Pages worker (fastest)

Redeploy the Pages project from the last known-good commit:
`ren/production-snapshot-20261009` @ `7bfc664`. This restores the exact
pre-integration worker. No data migration is involved — the integration
branch makes no storage-schema changes.

## 2. Remove the DO binding (if throttles misbehave)

Delete the `GAH_SEC_RATE_LIMITER` binding from the staging Pages project
and redeploy. The worker falls back to KV best-effort, then fail-open —
search, archive, and member paths keep working. This is the designed
degradation path, not an emergency hack.

## 3. Roll back the rate-limiter worker

`wrangler rollback` in `workers/sec-rate-limiter/`, or redeploy the
previous version. The DO's `v1` migration only creates the class; rolling
back the worker code does not delete stored counters (they are per-window
and expire naturally within 15 minutes).

## 4. Verify the rollback

Re-run `smoke-tests/smoke.sh https://<staging-url>` and confirm:
- `GET /` → 200
- `POST /api/search` → 200 with hits
- No `exact_identifier_missing` / `query_classification` fields (proves the
  old worker is serving)

## What cannot break

- **PayPal**: the integration makes no PayPal code changes; the disabled-
  checkout state is verified by the smoke test before and after.
- **Patreon/membership**: member routes and entitlements untouched; the
  smoke test checks `/members/account` still challenges (redirect/login)
  rather than 500ing.
- **Production**: this package targets a staging project only. Production
  bindings, DNS, and secrets are never referenced here.
