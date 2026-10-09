# Security remediation — review notes

Branch: `ren/security-remediation` (from `ren/production-snapshot-20261009` @ `7bfc664`)
Status: **prepared for review only — do not merge, do not deploy.**
Rule 4 applies: Worker integration is coordinated centrally with ChatGPT.

## Changes (8 edits, all in `_worker.js`)

1. **`proxyProofLayer` — strip client credentials on the wiki upstream hop.**
   `cookie` and `authorization` headers are now deleted before forwarding.
   The upstream proof layer authenticates the hop via `WIKI_INTERNAL_PROXY_HEADER`,
   which is unaffected. This closes the confirmed finding that the signed
   `gah_member_session` cookie was forwarded to `wiki.grokarchivehub.com`.

2. **`handlePublicSearch` — clamp `limit` to 1–50** before building the upstream
   payload (default 10). The upstream engine can no longer receive an unbounded
   page size. The exact-person-phrase path still pins `limit: 50` as before.

3. **Worker-side abuse throttles** — new `gahSecRateLimit` helper using the
   KV-backed minute-window pattern already established by the Phang ingest
   limiter (`phangStore` / distinct `gah:sec:rate:` key prefix; reads bypass the
   Phang KV read cache deliberately — throttles need fresh counters).
   Enforced on `POST /api/search` (60 req/min/IP) and `POST /a2a/v1/message:send`
   (30 req/min/IP), returning 429 with `Retry-After`.
   **Fail-open design:** when no KV binding is present (or a KV read fails),
   requests are allowed — availability first. Strict enforcement requires a
   bound KV namespace. This is defense-in-depth in front of the Cloudflare edge
   rules, not a replacement for them.

4. **Server-side admin-login throttle** — new `gahSecAdminLoginBlocked` /
   `gahSecAdminLoginRecord` helpers (KV-backed per-IP failure counter, 15-min
   window, 5 failures — matching the existing `X_ADMIN_LOGIN_*` constants).
   The sealed-cookie counter is client-resettable (clearing the cookie restarts
   the count); the KV counter is authoritative. Checked on every login POST
   before the existing logic; recorded on failure; cleared on success.
   Fail-open without KV (the sealed-cookie mechanism still applies).

## Verification

- `node --check _worker.js` — syntax OK.
- `sec-test-harness.mjs` (in this directory) — 10/10 pass against the extracted
  helpers with a mock KV binding: allow-up-to-max, block-over-max, 429 shape,
  fail-open without KV, per-IP isolation, admin block after 5 failures,
  admin clear on success, admin fail-open, IP extraction incl. fallback.
  Run: `node sec-test-harness.mjs`

## Not changed (deliberately)

- PayPal, Patreon, member entitlements — untouched.
- The wiki search backend itself — retained per the assignment; migration
  stays a profiling decision.
- No production bindings, secrets, or deploy configuration touched.

## For the reviewer (ChatGPT)

- Please confirm the chosen throttle budgets (60/30 per min/IP) against observed
  traffic, and whether the edge WAF already covers these paths (in which case
  the worker-side limits are pure defense-in-depth).
- The `limit` clamp changes upstream request shape — please regression-test
  `/api/search` against the live wiki proof layer before any deploy.
- `gahSecClientIp` trusts `CF-Connecting-IP` first; confirm that header is
  present and unspoofable in the production edge configuration.
