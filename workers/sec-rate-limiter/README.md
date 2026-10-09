# gah-sec-rate-limiter

Standalone Cloudflare Worker hosting the `GahSecRateLimiterDO` Durable
Object used by GAH's worker-side abuse throttles (`POST /api/search`,
`POST /a2a/v1/message:send`, admin login).

## Why a separate Worker

GAH runs on Cloudflare Pages. Durable Objects used by a Pages project
must reside in a separately deployed Worker; the Pages project binds to
them via `script_name`. The DO cannot live in the Pages `_worker.js`.

## Deploy (ChatGPT — not authorized by this branch)

1. `cd workers/sec-rate-limiter && wrangler deploy`
   (runs the `v1` migration creating the `GahSecRateLimiterDO` class).
2. In the Pages project configuration, add:
   ```toml
   [[durable_objects.bindings]]
   name = "GAH_SEC_RATE_LIMITER"
   class_name = "GahSecRateLimiterDO"
   script_name = "gah-sec-rate-limiter"
   ```
   (or the equivalent binding in the Cloudflare dashboard:
   Durable Object → class `GahSecRateLimiterDO`,
   script `gah-sec-rate-limiter`, variable `GAH_SEC_RATE_LIMITER`.)
3. The Pages `_worker.js` calls it via `env.GAH_SEC_RATE_LIMITER`
   (`gahSecDoCall`, sharded per scope+client-IP — see below).

## Sharding

Limiter instances are sharded by `scope` + client IP
(`idFromName(`${scope}:${key}`)`), not funneled through one global
instance. Each shard is a separate DO instance with its own single-threaded
execution, so a traffic spike from one IP cannot contend with — or poison —
anyone else's counters. Scopes: `public-search`, `a2a-send`, `admin-login`.

## Failure behavior

| Condition | Behavior |
|---|---|
| Binding present, DO healthy | Exact atomic throttling (429 + `Retry-After` over the limit) |
| Binding present, DO subrequest throws | Falls back to KV best-effort (approximate), then fail-open |
| Binding absent (not configured) | KV best-effort if a KV namespace is bound, else **fail-open** (requests allowed) |
| KV absent too | Fail-open — the sealed-cookie admin-login counter still applies |

Fail-open is deliberate: throttles are defense-in-depth in front of the
Cloudflare edge rules. A missing binding must never become a site outage.

## Legitimate-traffic safety

- `POST /api/search`: 60 req/min per IP. Normal human and integration use
  (including the site's own search UI and the MCP `search_gah_archive` tool
  at ≤20 results/call) is orders of magnitude below this.
- `POST /a2a/v1/message:send`: 30 req/min per IP. Agent traffic is
  low-frequency by design.
- Admin login: 5 failures per 15 min per IP — only gates the X-publisher
  login form, and a successful login clears the counter.
- Membership, PayPal, Patreon, and all read paths are untouched by the
  throttles. Only the three endpoints above can return 429, and only when
  the caller exceeds the budget.

## Tests

- `test/run.mjs` — runs the DO class under real Miniflare (workerd)
  with true concurrent subrequests: 25-way race on a limit of 3 must
  allow exactly 3; 10 concurrent admin failures must record all 10.
  Run: `cd workers/sec-rate-limiter && npm install && node test/run.mjs`
  (or `npx miniflare` directly — see the script header).
- `docs/security-remediation/sec-concurrency-tests.mjs` (repo root) — the
  same scenarios against the class extracted from this project, with a
  serialized mock modeling the DO runtime guarantee.
