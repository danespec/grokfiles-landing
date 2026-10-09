# Security remediation — review notes

Branch: `ren/security-remediation` (from `ren/production-snapshot-20261009` @ `7bfc664`)
Status: **prepared for review only — do not merge, do not deploy.**
Rule 4 applies: Worker integration is coordinated centrally with ChatGPT.

## Architecture (revised per review)

GAH runs on Cloudflare Pages, and Pages cannot host Durable Objects. The
rate limiter is therefore a **separate Worker project**:

- `workers/sec-rate-limiter/` — standalone Worker. `src/index.js` exports
  `GahSecRateLimiterDO`; `wrangler.toml` carries the `[[durable_objects]]`
  binding + `[[migrations]] new_classes`. README.md has the deploy steps.
- The Pages `_worker.js` reaches it through `env.GAH_SEC_RATE_LIMITER`
  with `script_name = "gah-sec-rate-limiter"` (see `wrangler.example.toml`
  and the README). The DO class was **moved out** of `_worker.js` — single
  source of truth, no duplication.
- **Sharding:** limiter instances are sharded by `scope` + client IP
  (`idFromName(`${scope}:${key}`)`), not funneled through one global
  instance. Each shard is single-threaded; a spike from one IP cannot
  contend with anyone else's counters.

**Why a DO at all:** the first revision used KV read-modify-write, which is
not atomic — review reproduced 25 simultaneous requests passing a limit of
3, and 10 simultaneous admin failures recorded as one. A DO instance is
single-threaded, so check-and-increment inside one `fetch()` cannot
interleave: the throttle is exact. When the binding is absent, the helpers
fall back to KV best-effort (documented approximate) and then fail open —
availability first. Throttles are defense-in-depth in front of the Cloudflare
edge rules, not a replacement for them.

## Changes

1. **`proxyProofLayer` — strip client credentials on the wiki upstream hop.**
   `cookie` and `authorization` headers are now deleted before forwarding.
   The upstream proof layer authenticates the hop via `WIKI_INTERNAL_PROXY_HEADER`,
   which is unaffected. This closes the confirmed finding that the signed
   `gah_member_session` cookie was forwarded to `wiki.grokarchivehub.com`.

2. **`handlePublicSearch` — clamp `limit` to 1–50** before building the upstream
   payload (default 10). The upstream engine can no longer receive an unbounded
   page size. The exact-person-phrase path still pins `limit: 50` as before.

3. **Atomic abuse throttles** on `POST /api/search` (60 req/min/IP) and
   `POST /a2a/v1/message:send` (30 req/min/IP), returning 429 with
   `Retry-After`. Ops: `check` / `peek` / `clear` against the sharded DO.

4. **Server-side admin-login throttle — atomic admission.** Every POST to
   `/admin/login` consumes one throttle slot AT THE GATE via a single DO
   `check` op (`gahSecAdminLoginAdmit`); a successful login clears the
   counter (`gahSecAdminLoginClear`). The previous peek → verify → record
   sequence let N concurrent attempts all pass the gate before any failure
   was recorded — now the (max+1)th concurrent attempt is blocked even if
   no verification has completed. The sealed-cookie counter is
   client-resettable (clearing the cookie restarts the count); the DO/KV
   counter is authoritative. `gahSecDoCall` uses the `fetch(url, init)`
   form (identical semantics to `fetch(Request)` in the workers runtime;
   required for Miniflare testability).

## Verification

- `node --check _worker.js` — syntax OK.
- `workers/sec-rate-limiter/test/admin_login.mjs` — **12/12 pass**: drives
  the real `gahSecAdminLoginAdmit`/`Clear` from `_worker.js` against a real
  Miniflare DO namespace through the complete handler sequence
  (admit → verify → clear). 10 simultaneous bad-token logins → exactly 5
  admitted (401) and 5 blocked at the gate (429); good token clears;
  per-IP isolation; `CF-Connecting-IP` preferred over spoofable
  `X-Forwarded-For` (trusted because the Cloudflare edge overwrites it;
  direct-to-worker access would need separate review); missing binding and
  DO outage both fail open.
- `workers/sec-rate-limiter/test/run.mjs` — **8/8 pass under real Miniflare
  (workerd)** with TRUE concurrent subrequests against the actual DO class:
  25-way race → exactly 3 allowed / 22 blocked; 10 concurrent admin failures
  → 5 recorded, `peek` blocked with exact count, `clear` resets; shard
  isolation (hot IP doesn't affect another key); malformed body rejected;
  default export 404. Run: `cd workers/sec-rate-limiter && npm install && node test/run.mjs`.
- `docs/security-remediation/sec-concurrency-tests.mjs` — 8/8 pass (same
  scenarios against the class with a serialized mock modeling the DO
  runtime guarantee; the Miniflare run above is the authoritative evidence).
- `docs/security-remediation/sec-test-harness.mjs` — 8/8 pass (fallback-path
  behaviors: KV best-effort, fail-open with no binding, 429 shape, per-IP
  isolation, IP extraction, admin KV fallback).

## Failure behavior (binding unavailable)

| Condition | Behavior |
|---|---|
| DO binding present, DO healthy | Exact atomic throttling |
| DO binding present, subrequest throws | KV best-effort (approximate), then fail-open |
| DO binding absent | KV best-effort if a KV namespace is bound, else **fail-open** |
| KV absent too | Fail-open — the sealed-cookie admin-login counter still applies |

Fail-open is deliberate: a missing binding must never become a site outage.

## Legitimate-traffic safety

- `POST /api/search` at 60 req/min/IP and `POST /a2a/v1/message:send` at
  30 req/min/IP are orders of magnitude above normal human, integration,
  and MCP-tool use. Only these two endpoints plus the admin login form can
  return 429, and only over the budget.
- Membership, PayPal, Patreon, and all read paths are untouched. Search
  result quality is unchanged — throttled callers get 429 + `Retry-After`,
  not degraded results.

## Wiring required before any deploy (ChatGPT)

1. `cd workers/sec-rate-limiter && wrangler deploy` (runs the `v1` migration).
2. Pages project: `[[durable_objects.bindings]] name="GAH_SEC_RATE_LIMITER",
   class_name="GahSecRateLimiterDO", script_name="gah-sec-rate-limiter"`
   (or dashboard equivalent).
3. Confirm throttle budgets (60/30) against observed traffic and whether the
   edge WAF already covers these paths.
4. Regression-test `/api/search` against the live wiki proof layer (the
   `limit` clamp changes upstream request shape).
5. Confirm `CF-Connecting-IP` is present and unspoofable at the edge.

## Not changed (deliberately)

- PayPal, Patreon, member entitlements — untouched.
- The wiki search backend itself — retained; migration stays a profiling decision.
- No production bindings, secrets, or deploy configuration touched.
