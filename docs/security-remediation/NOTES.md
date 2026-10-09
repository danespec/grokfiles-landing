# Security remediation — review notes

Branch: `ren/security-remediation` (from `ren/production-snapshot-20261009` @ `7bfc664`)
Status: **prepared for review only — do not merge, do not deploy.**
Rule 4 applies: Worker integration is coordinated centrally with ChatGPT.

## Changes (in `_worker.js`, plus `wrangler.example.toml` docs)

1. **`proxyProofLayer` — strip client credentials on the wiki upstream hop.**
   `cookie` and `authorization` headers are now deleted before forwarding.
   The upstream proof layer authenticates the hop via `WIKI_INTERNAL_PROXY_HEADER`,
   which is unaffected. This closes the confirmed finding that the signed
   `gah_member_session` cookie was forwarded to `wiki.grokarchivehub.com`.

2. **`handlePublicSearch` — clamp `limit` to 1–50** before building the upstream
   payload (default 10). The upstream engine can no longer receive an unbounded
   page size. The exact-person-phrase path still pins `limit: 50` as before.

3. **Atomic abuse throttles via Durable Object** (`GahSecRateLimiterDO`,
   exported from `_worker.js`; binding documented in `wrangler.example.toml`).
   Enforced on `POST /api/search` (60 req/min/IP) and `POST /a2a/v1/message:send`
   (30 req/min/IP), returning 429 with `Retry-After`.
   **Why a DO:** the first revision used KV read-modify-write, which is not
   atomic — review reproduced 25 simultaneous requests passing a limit of 3,
   and 10 simultaneous admin failures recorded as one. A DO instance is
   single-threaded, so check-and-increment inside one `fetch()` cannot
   interleave: the throttle is exact. When the binding is absent, the helpers
   fall back to KV best-effort (documented approximate) and then fail open —
   availability first. Throttles are defense-in-depth in front of the
   Cloudflare edge rules, not a replacement for them.

4. **Server-side admin-login throttle** — `peek`/`check`/`clear` ops against
   the same DO (15-min window, 5 failures, matching the existing
   `X_ADMIN_LOGIN_*` constants), with the KV per-IP counter as fallback.
   The sealed-cookie counter is client-resettable (clearing the cookie
   restarts the count); the DO/KV counter is authoritative. Checked on every
   login POST before the existing logic; recorded on failure; cleared on
   success.

## Verification

- `node --check _worker.js` — syntax OK.
- `sec-concurrency-tests.mjs` — **8/8 pass**: reproduces the old race
  (25 concurrent requests, limit 3 → all 25 allowed under KV
  read-modify-write), then proves the fix (exactly 3 allowed / 22 blocked
  through the serialized DO; 10 concurrent admin failures → 5 recorded,
  blocked, cleared on success; per-key isolation; malformed-body rejection).
  The DO class under test is extracted verbatim from `_worker.js`; the mock
  storage enforces the same one-fetch-at-a-time guarantee the DO runtime
  provides.
- `sec-test-harness.mjs` — **8/8 pass**: fallback-path behaviors (KV
  best-effort blocks the 4th sequential request; fail-open with no KV and no
  DO; 429 JSON shape; per-IP isolation; IP extraction incl. fallback; admin
  KV fallback block/clear).

## Wiring required before any deploy (ChatGPT)

- `[[durable_objects.bindings]] name = "GAH_SEC_RATE_LIMITER",
  class_name = "GahSecRateLimiterDO"` + `[[migrations]] new_classes`.
  Without it, throttles run in KV-approximate mode (documented, fail-open).
- Please confirm the throttle budgets (60/30 per min/IP) against observed
  traffic, and whether the edge WAF already covers these paths.
- The `limit` clamp changes upstream request shape — regression-test
  `/api/search` against the live wiki proof layer before any deploy.
- `gahSecClientIp` trusts `CF-Connecting-IP` first; confirm that header is
  present and unspoofable in the production edge configuration.

## Not changed (deliberately)

- PayPal, Patreon, member entitlements — untouched.
- The wiki search backend itself — retained per the assignment; migration
  stays a profiling decision.
- No production bindings, secrets, or deploy configuration touched.
