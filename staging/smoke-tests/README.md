# Smoke tests

Automated post-deploy checks for the staging environment.

## Run

```bash
bash staging/smoke-tests/smoke.sh https://<staging-url>
```

Safe to run repeatedly: no purchases, no logins, no writes. The script
checks HTTP status codes and JSON shapes only.

## Coverage

| # | Check | Why it matters |
|---|---|---|
| 1 | `GET /` → 200 | Site serves |
| 2 | `POST /api/search` text → hits | Search backend reachable through the proxy |
| 3 | `POST /api/search` `BARAK-174-001` → `query_classification: barak`, `hit_count: 0` | Namespace separation enforced |
| 4 | `POST /api/search` EFTA id → verified or missing, never fabricated | Exact-ID policy live |
| 5 | `POST /api/search` `limit: 5000` → ≤ 50 hits | Limit clamp live |
| 6 | `POST /a2a/v1/message:send` → not 500 | A2A route intact |
| 7 | `GET /barak` → 200 | Barak viewer renders |
| 8 | `GET /members/account` → not 500 | Member infra intact (challenges as before) |
| 9 | `/api/commerce/paypal/live/launch-status` → live not configured | PayPal disabled-checkout state preserved |
| 10 | MCP server card, api-catalog, openapi → 200 | Research interfaces intact |
| 11 | `GET /admin/login` → 200; bad token → 401 | Admin surface intact, throttle sane |

## Not covered here (covered elsewhere)

- Admin-login throttle under concurrency → `workers/sec-rate-limiter/test/admin_login.mjs`
  (Miniflare). Deliberately not exercised against staging (would consume
  the lockout budget).
- Rate-limiter DO behavior → `workers/sec-rate-limiter/test/run.mjs`.
- Identifier edge cases → `workers/lib/test_identifiers.mjs`.
