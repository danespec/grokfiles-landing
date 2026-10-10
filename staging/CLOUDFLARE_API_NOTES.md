# Cloudflare API notes — staging provisioning

## Authentication

`CLOUDFLARE_API_TOKEN` (Bearer) with scopes: Pages (edit), Workers (edit),
Durable Objects (edit), Account Settings (read). Never use a production
token with broader scopes.

## 1. Rate-limiter worker (staging)

```
wrangler deploy --config wrangler.staging.toml
```
in `workers/sec-rate-limiter/`. Creates `gah-limiter-staging-517b8499`
with the `GahSecRateLimiterDO` class (migration v1).

## 2. Mock wiki backend

```
wrangler deploy
```
in `workers/mock-wiki-backend/`. Creates `gah-mock-staging-517b8499`.
Note its `*.workers.dev` hostname for `GAH_WIKI_HOST`.

## 3. Pages project

```bash
wrangler pages project create gah-staging
# Deploy _worker.js at the pinned commit (advanced mode):
git show <SHA>:_worker.js > /tmp/gah-pages/_worker.js
wrangler pages deploy /tmp/gah-pages --project-name gah-staging
```

## 4. Durable Object binding (Pages -> rate-limiter worker)

Pages bindings are configured per deployment via the dashboard or API.
Dashboard path (fallback): Pages project > Settings > Functions >
Durable Object bindings > Add binding:
- Variable name: `GAH_SEC_RATE_LIMITER`
- Class: `GahSecRateLimiterDO`
- Script: `gah-limiter-staging-517b8499` (select the worker)

API path: PATCH the Pages project deployment config with the
durable-object binding referencing the worker by name. Verify with a
deployment and the bindings.sh evidence script.

## 5. Environment variables (staging Pages project)

| Variable | Value |
|---|---|
| `GAH_STAGING` | `true` (enables fail-closed wiki-host behavior) |
| `GAH_WIKI_HOST` | `<gah-mock-staging-517b8499 host>` (REQUIRED; no fallback) |
| `X_ADMIN_TOKEN` | fresh staging-only random value |

No `PAYPAL_LIVE_*`, no production KV, no production D1.

## 6. Access restriction

Use Cloudflare Access (Zero Trust) on the `*.pages.dev` hostname, or
leave the unguessable `pages.dev` URL unlisted. Document the chosen
method in the final report.
