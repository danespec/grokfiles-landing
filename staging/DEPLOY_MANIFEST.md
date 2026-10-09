# Deployment manifest — staging release candidate

**No deployment is authorized. This manifest is executed only on Thomas's
explicit approval of the staging environment.**

## Source

- Repository: `danespec/grokfiles-landing`
- Branch: `ren/phase0-integration`
- Commit: the tip of `ren/phase0-integration` at deploy-authorization time.
  Verify with: `git ls-remote origin refs/heads/ren/phase0-integration`.
  Code under test: `7ff04dd97b41a01a084887c4a445a82b2e1ef37d` (regression run:
  7/7 suites, 114 checks). Only manifest text changed after that commit —
  no code delta. Deploy the verified tip, not a stale SHA.
- Base: `ren/production-snapshot-20261009` @ `7bfc664`
- Regression: 7/7 suites, 114 checks pass (`tests/run_phase0_regression.sh`)

## Workers

| # | Worker | Source | Deploy command |
|---|---|---|---|
| 1 | `gah-sec-rate-limiter` | `workers/sec-rate-limiter/` | `cd workers/sec-rate-limiter && wrangler deploy` (runs the `v1` DO migration) |
| 2 | Pages worker (site) | `_worker.js` @ RC commit | Existing Pages pipeline from the RC commit |

Deploy worker 1 FIRST; the Pages project binds to it by `script_name`.

## Bindings (staging Pages project)

```toml
[[durable_objects.bindings]]
name = "GAH_SEC_RATE_LIMITER"
class_name = "GahSecRateLimiterDO"
script_name = "gah-sec-rate-limiter"
```

## Environment variables (staging)

| Variable | Value |
|---|---|
| `GAH_WIKI_HOST` | **REQUIRED for initial contract testing**: isolated mock wiki backend. Staging must not hit the production wiki host until the contract is verified |
| `X_ADMIN_TOKEN` | Fresh staging-only value (never production's) |
| `PAYPAL_LIVE_CLIENT_ID` / `PAYPAL_LIVE_CLIENT_SECRET` / `PAYPAL_LIVE_WEBHOOK_ID` | **ABSENT** (smoke test asserts disabled state) |

No other new variables. No production secrets are copied to staging. `WIKI_INTERNAL_PROXY_HEADER` is a fixed Worker constant, not a secret.

## Verification order

1. `bash staging/smoke-tests/smoke.sh https://<staging-url>` — 14 read-only checks.
2. `bash staging/smoke-tests/bindings.sh https://<staging-url> configured` — DO binding evidence.
3. `STAGING_HOSTS=<staging-host> STAGING_ADMIN_TOKEN=<disposable> bash staging/smoke-tests/auth.sh https://<staging-url>` — then rotate the token.
4. Optional: `bindings.sh … missing` / `… unavailable` guided procedures.
5. Review open items in `staging/STAGING_READINESS.md`.

## Rollback

`staging/rollback.md`. Fastest path: redeploy the Pages project from
`ren/production-snapshot-20261009` @ `7bfc664`; remove the DO binding if
throttles misbehave (the worker degrades to fail-open by design).

## What this manifest never authorizes

Production merges, production deployments, production secret changes,
PayPal activation, or any change to membership/Patreon/publisher data.
