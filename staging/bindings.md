# Pages binding configuration (staging)

Configure these in the **staging Pages project** (dashboard or
`wrangler pages` project config). Nothing here touches production.

## 1. Durable Object binding (rate limiter)

The `GahSecRateLimiterDO` class lives in the separately deployed
`gah-sec-rate-limiter` worker (`workers/sec-rate-limiter/`). The Pages
project binds to it via `script_name`:

```toml
[[durable_objects.bindings]]
name = "GAH_SEC_RATE_LIMITER"
class_name = "GahSecRateLimiterDO"
script_name = "gah-sec-rate-limiter"
```

Dashboard equivalent: Add binding → Durable Object → Variable name
`GAH_SEC_RATE_LIMITER`, Class `GahSecRateLimiterDO`,
select the `gah-sec-rate-limiter` worker as the script.

Deploy order: `cd workers/sec-rate-limiter && wrangler deploy` FIRST
(runs the `v1` migration creating the class), then add this binding.

## 2. Behavior without the binding

The worker is designed to degrade gracefully (verified by tests):

| Condition | Behavior |
|---|---|
| Binding present, DO healthy | Exact atomic throttles (429 + `Retry-After` over budget) |
| Binding present, DO subrequest throws | KV best-effort (approximate), then fail-open |
| Binding absent | KV best-effort if a KV namespace is bound, else fail-open |
| KV absent too | Fail-open; sealed-cookie admin counter still applies |

A missing binding must never become a staging outage. The smoke tests
include a binding-absent expectation (search still returns 200).

## 3. Environment variables (staging)

No new secrets are required for the Phase 0 integration. The existing
staging env vars carry over unchanged. In particular:

- Do NOT copy production `X_ADMIN_TOKEN`, PayPal live credentials, or
  `WIKI_INTERNAL_PROXY_HEADER` values into staging. Staging needs its own
  values (or leave PayPal live vars unset — the smoke test verifies the
  disabled-checkout state).
- `PAYPAL_LIVE_CLIENT_ID` / `PAYPAL_LIVE_CLIENT_SECRET` / `PAYPAL_LIVE_WEBHOOK_ID`
  must be **absent** in staging: `/api/commerce/paypal/live/launch-status`
  must report live checkout not configured.

## 4. Sharding note

Limiter instances are sharded per scope+client-IP
(`idFromName(`${scope}:${key}`)`); no single global instance. No binding
configuration is needed per shard — sharding is by name within the one
binding.
