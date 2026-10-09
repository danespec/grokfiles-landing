# Smoke tests

Two suites. Both are prepared but UNEXECUTED — no staging environment exists.

## smoke.sh — read-only (safe to run repeatedly)

```bash
bash staging/smoke-tests/smoke.sh https://<staging-url>
```

Makes no authenticated requests and no state-changing requests. The only
POSTs are to the read-only `/api/search` endpoint.

| # | Check | Documented expectation |
|---|---|---|
| 1 | `GET /` | 200 |
| 2 | `POST /api/search` text | `hit_count > 0`, `hits` is a list |
| 3 | `POST /api/search` `BARAK-174-001` | `query_classification: barak`, `hit_count: 0`, `collection_hint: barak` |
| 4 | `POST /api/search` EFTA id | `exact_identifier_missing: true` OR `exact_identifier_route` present |
| 5 | `POST /api/search` `limit: 5000` | `len(hits) <= 50` |
| 6 | `GET /a2a/v1/message:send` | 405 (Allow: POST) — route intact, nothing sent |
| 7 | `GET /barak` | 200 |
| 8 | `GET /members/account` | 200 or 302 |
| 9 | `/api/commerce/paypal/live/launch-status` | `schema == "gah.paypal-live-launch-gates.v1"`, `live_customer_checkout_available == false`, `config.live_client_id_present == false` |
| 10 | `POST /api/commerce/paypal/live/webhook` (empty) | 503 `live_webhook_unconfigured` — proves staging cannot process live PayPal events |
| 11 | MCP server card, api-catalog, openapi | 200 each |
| 12 | `GET /admin/login` | 200 (page renders; no credential attempt) |

## auth.sh — authentication (separate, disposable fixtures)

```bash
STAGING_ADMIN_TOKEN=<disposable-token> bash staging/smoke-tests/auth.sh https://<staging-url>
```

Exercises the admin-login throttle (3 bad attempts → 401 each, then one good
attempt → success). Uses a disposable staging-only token; refuses to run
against anything that looks like production. Rotate the token after the run.

## bindings.sh — Durable Object binding states

```bash
bash staging/smoke-tests/bindings.sh https://<staging-url>
```

Documents and verifies the three binding states: configured, missing,
unavailable. See the script header — the missing/unavailable cases are
guided procedures (change the binding, re-run, observe).

## No-production-mutation guarantee

- Neither suite sends authenticated requests to member, PayPal, Patreon, or
  publisher endpoints.
- Check 10 proves the live PayPal webhook is unconfigured in staging.
- Check 9 proves live checkout is not available.
- Staging must use its own secrets (see `staging/bindings.md`); production
  `X_ADMIN_TOKEN`, PayPal live credentials, and `WIKI_INTERNAL_PROXY_HEADER`
  values are never copied to staging.

## Not covered here (covered elsewhere)

- Admin-login throttle under concurrency → `workers/sec-rate-limiter/test/admin_login.mjs`
  (Miniflare, 12/12).
- Rate-limiter DO behavior → `workers/sec-rate-limiter/test/run.mjs` (Miniflare, 8/8).
- Identifier edge cases → `workers/lib/test_identifiers.mjs` (37/37).
- Exact-ID policy → `tests/test_exact_id_policy.mjs` (29/29).
- Codegen sync → `tests/test_identifiers_sync.mjs` (6/6).
