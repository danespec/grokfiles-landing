# GAH Compatibility & Security Audit — Subagent E

Date: 2026-10-09
Auditor: Subagent E (Compatibility & Security)
Repo: `danespec/grokfiles-landing`, branch `ren/production-snapshot-20261009`, commit `7bfc664`
Primary file: `_worker.js` (17,990 lines; SHA-256 `2589511c…bb14d` per REN_README.md)
Governing spec: `GAH_REBUILD_APPROVED_V2.md` — non-negotiable: preserve AI/MCP research interfaces, commerce infrastructure, Patreon member portal, PayPal integration.

> Scope note: this audit covers the snapshot branch only. The live Cloudflare deployment, `MEMBERS_DB` contents, and all secret bindings are out of scope and were not inspected.

---

## 1. Must-not-break interface inventory

### 1.1 Agent discovery layer (all served by `_worker.js`, all public, no auth)

| Endpoint | Serves | Source line |
|---|---|---|
| `/.well-known/ai-catalog.json` | Agent Readiness Discovery catalog (4 entries: MCP server card, A2A agent card, public OpenAPI, agent skills index) | `_worker.js:17865` |
| `/.well-known/agent-card.json` | A2A agent card (`GAH_A2A_AGENT_CARD`, protocol v0.3, `https://grokarchivehub.com/a2a/v1`) | `_worker.js:1791` |
| `/a2a/v1/message:send` | A2A JSON-RPC send — POST only; runs the query against public search, returns task envelope (`handleGahA2aSend`) | `_worker.js:17904`, `3056` |
| `/.well-known/agent-skills/index.json` | Skills index (3 skills, sha256 digests) | `_worker.js:17908` |
| `/.well-known/agent-skills/{name}/SKILL.md` | Skill markdown for `gah-source-first-research`, `gah-archive-search`, `gah-evidence-audit` | `_worker.js:17914` |
| `/.well-known/mcp/server-card.json` (alias `/.well-known/mcp.json`) | MCP server card (dynamic) | `_worker.js:17923` |
| `/.well-known/api-catalog` | RFC linkset API catalog → `/openapi.json`, `/auth.md`, `/api/archive-status` | `_worker.js:17931` |
| `/openapi.json` | Public read-only OpenAPI 3.1.0 (paths: `/api/archive-status`, `/api/book-of-black/status`, `/api/book-of-black/ledger`, `/api/search`) | `_worker.js:17944` |
| `/auth.md` | Agent authentication & access policy (`AGENT_READY_AUTH_MD`) | `_worker.js:17957` |
| `/mcp` | MCP endpoint — JSON-RPC (`handleGahMcp`) | `_worker.js:17929` |

**MCP tools exposed** (`GAH_MCP_TOOLS`, `_worker.js:1111`, plus `GAH_SOURCE_MANIFEST_MCP_TOOL` at `2813`):
`search_archive` (query 1–180 chars, limit 1–20, delegates to `handlePublicSearch`), `get_archive_status`, `get_book_of_black_status`, `get_source_manifest` (manifest_id pattern `^[a-z0-9]+(?:-[a-z0-9]+)*$`, max 90), `get_commerce_catalog`, `get_commerce_readiness` (both read-only previews).

**Rebuild rule:** every URL above must keep serving byte-equivalent semantics. The skills index digests (`sha256:dbf9…`, `8515…`, `6ae3…` at `_worker.js:1110`) are content hashes — if skill text changes, digests must be recomputed or agents will fail verification.

### 1.2 Public read-only API (no auth)

| Endpoint | Serves | Source line |
|---|---|---|
| `POST /api/search` | Public archive search (q ≤ 1000 chars; proxies to proof-layer backend; response sanitized via `sanitizePublicSearchValue`) | `_worker.js:5008` |
| `GET /api/archive-status` | Archive status manifest | `_worker.js:17670` |
| `GET /api/book-of-black/status`, `/api/book-of-black/ledger`, `/api/book-of-black/entry/*`, `/api/book-of-black/page/*` | Book of Black public evidence endpoints | `_worker.js:17944` (openapi), route prefixes in route map |
| `GET /api/research/source-manifest/{id}` | Public source manifests (provenance + limits) | `_worker.js:17599` |
| `GET /api/research/citation-audit/{id}` | Citation audit surface | `_worker.js:2156` |
| `GET /api/document-bundle/*` | Document bundles | route map |
| `GET /api/visual-evidence/efta/*` | Visual evidence lookups | route map |

**Architectural note:** `handlePublicSearch` does not query a local index — it proxies to the proof layer at `wiki.grokarchivehub.com` (`proxyProofLayer`, `_worker.js:3932`). The search backend is upstream of this Worker. Any rebuild of search must preserve or deliberately migrate that upstream contract; the Worker alone cannot satisfy "exact-ID lookup" acceptance tests.

### 1.3 Restricted / internal APIs (must stay out of the public catalog AND stay functional)

- `/api/x/*`, `/api/ai/*` — admin-session gated (`X_ADMIN_API_SESSION_COOKIE_NAME`, `_worker.js:11388-11389`). Includes `/api/ai/query`, `/api/ai/context-preview`.
- `/api/phang-docket/health|ingest|review` — docket watch pipeline (`_worker.js:17506-17514`).
- `/api/analytics/*`, `/api/newsletter/*` — internal; excluded from public catalog per `/auth.md` policy.
- `/internal/members/reconcile`, `/internal/newsletter/reconcile` — POST reconcilers (`_worker.js:17536-17540`).
- `/internal/patreon/setup/start` — Patreon webhook setup flow.

### 1.4 Patreon member portal — routes & session boundaries

**OAuth flow:** `GET /auth/patreon/start` → `GET /auth/patreon/callback` (`_worker.js:17522-17528`). Scopes `identity identity.memberships`; webhook setup scope `identity w:campaigns.webhook` via `/members/patreon-webhook-setup` (`_worker.js:3154-3163`).

**Webhook:** `POST /webhooks/patreon` (`_worker.js:17531`) → `handlePatreonWebhook`.

**Portal routes (all require valid member session):** `/members`, `/members/research-drops`, `/members/downloads`, `/members/requests`, `/members/account` (`MEMBER_PORTAL_PATHS`, `_worker.js:3133`); `/members/resync` (POST, re-verifies tier with Patreon), `/members/logout`.

**Session model:** D1 `member_sessions` table keyed by `session_id_hash`; cookie `gah_member_session` (`_worker.js:3140`). Upsert on login (`upsertPatreonMember`, `_worker.js:15727`); revocation on logout and on `members/delete` webhook (`_worker.js:15786`, `16377`); renewal extends expiry (`_worker.js:15804`). Audit trail in `membership_audit_events` (`_worker.js:15714`).

**Must-not-break:** OAuth start/callback round-trip, session create/validate/renew/revoke, resync, webhook-driven entitlement changes, and the `/members/*` → `noindex,nofollow` route policy (`_worker.js:621`).

### 1.5 PayPal integration — what is wired vs what is unconfirmed

**Wired and present in code:**
- Read-only spec/status endpoints: `/api/commerce/providers`, `/api/commerce/catalog`, `/api/commerce/readiness`, `/api/commerce/subscription-plan`, `/api/commerce/all-access-benefits`, `/api/commerce/metering-contract`, `/api/commerce/quote` (returns 409), `/api/commerce/paypal/readiness`, `/api/commerce/paypal/plan-status`, `/api/commerce/paypal/live/launch-status` (`_worker.js:2005-2018`, `3027-3046`).
- Sandbox diagnostics (admin-gated): `/api/commerce/paypal/sandbox/auth-check`, `/api/commerce/paypal/sandbox/create-test-order` (requires `PAYPAL_SANDBOX_ORDER_TESTS_ENABLED=true`; capture always disabled), `/api/commerce/paypal/sandbox/bootstrap-plan`, `/api/commerce/paypal/sandbox/webhook` (`_worker.js:1260-1278`, `2010-2016`).
- Live provisioning (admin-gated, `gahPaypal085AdminOnly`): `/api/commerce/paypal/live/bootstrap-plan` creates the PayPal product + **$5.99/month** billing plan via live API and stores it in `gah_paypal_plans` — but explicitly returns `customer_charges_enabled:false`, `payment_accepted:false` (`_worker.js:1946-2003`).
- Live webhook receiver: `/api/commerce/paypal/live/webhook` — full PayPal signature verification (cert-URL allowlist `api(-m).paypal.com`, 10-min freshness, 16 KB body cap, plan binding check `price_minor===599 && currency==="USD"`, subscription fetch-back validation) (`_worker.js:1740-1800`). Returns 503 `live_webhook_unconfigured` unless `PAYPAL_LIVE_CLIENT_ID/SECRET/WEBHOOK_ID` + `MEMBERS_DB` are present.
- Buyer-facing page: `/paypal/all-access` — renders **"Checkout not yet available"** (`_worker.js:17595`, `1864`).
- PayPal member session path: `/members/account` renders a PayPal branch when `member.payment_provider==="paypal"` (verify-on-visit; cancellation handled at paypal.com) and D1 `gah_paypal_member_sessions` table exists (`_worker.js:16206-16212`, `1691-1722`).

**Explicitly disabled (return 503 `commerce_not_enabled`):** `/api/commerce/paypal/webhook`, `/api/commerce/paypal/orders`, `/api/commerce/paypal/orders/*`, `/api/commerce/paypal/capture`, `/api/commerce/paypal/verify`, `/api/commerce/checkout`, `/api/commerce/verify-receipt`, `/api/commerce/premium/*` (`_worker.js:2020-2023`, `2271-2274`).

**Unconfirmed (matches handoff context — NOT verified in this snapshot):**
1. Live webhook completion — the receiver code exists and is well-formed, but whether PayPal actually delivers webhooks to it (webhook registered in the PayPal dashboard, correct URL, live events flowing) cannot be confirmed from code.
2. Customer checkout activation — no live checkout route creates buyer subscriptions; `/paypal/all-access` is a placeholder page.
3. Live plan/product IDs — `gah_paypal_plans` is a production D1 table, not in the snapshot; whether `bootstrap-plan` was ever run against live is unknown.

**Rebuild rule:** keep every commerce route returning its current status; do not flip any 503 to live behavior; do not touch `gah_paypal_plans` schema expectations. Webhook confirmation and checkout activation are ChatGPT/deploy-env blockers (see §5).

### 1.6 Public archive access routes (must stay ungated)

`/archive/EFTA*` (dossier/open-receipt-slot/EFTA-ID proxy, `_worker.js:17789`), `/barak/*` (timeline, receipts, entities, source-map, fara-review, search), `/investigations/*`, `/dispatches/*`, `/evidence-briefs/*`, `/document-autopsies/*`, `/evidence-data/*`, `/evidence-engine/*`, `/research/*`, `/topics/*`, `/photos`, `/videos/*`, `/book-of-black/entry/*`, `/source-renders/*`, `/artifacts/*`, `/research-heroes/*`, `/news/*`, `/reading-room/*` (workbench, noindex). None require auth in this snapshot. The rebuild must not gate any of them behind membership or login.

---

## 2. Security findings

Dedicated security review completed 2026-10-09 (read-only; `git status` clean). Severity scale: Critical / High / Medium / Low / Info.

### 2.1 Committed secrets — CLEAN ✅ (verified)

Repo-wide sweep for `sk_live`/`sk_test`/`whsec_*`/`xox*`/`ghp_*`/`AKIA…`/PEM private keys/40+ char token literals across `.js/.toml/.json/.html`: **zero hits**. All credentials flow through `env.*` bindings only (`env.PATREON_WEBHOOK_SECRET`, `env.MEMBER_SESSION_SIGNING_KEY`, `env.PAYPAL_LIVE_CLIENT_SECRET`, …). The `Bearer <redacted>` strings (`_worker.js:1102`, `1222`) are deliberate redactions in embedded docs. `wrangler.example.toml` carries no bindings; `.gitignore` excludes `.env*`, `*.pem`, `*.key`. **The snapshot sanitization claim verifies.**

### 2.2 Session handling — CLEAN, 1 Info

- **Generation:** `randomBase64Url(32)` → `crypto.getRandomValues` (`_worker.js:9320-9324`). Unpredictable. ✅
- **Storage:** SHA-256 hash of the session ID in D1 `member_sessions`; raw bearer never touches the DB (`_worker.js:15755`). ✅
- **Cookie integrity:** value is `sessionId.HMAC-SHA256(env.MEMBER_SESSION_SIGNING_KEY)` with timing-safe verify (`verifySignedValue`, `_worker.js:9482-9496`). Fails closed: `getMemberSession` returns `setup_missing` before reading cookies if the signing key binding is absent (`_worker.js:9790-9798`). ✅
- **Cookie flags:** `HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age` (`_worker.js:9466-9468`). ✅
- **Lifecycle:** 2h expiry with sliding renewal inside a renewal window; expired sessions revoked on access; logout revokes by hash + clears cookie (`_worker.js:16276-16283`); Patreon webhook demotions revoke all sessions for that user (`_worker.js:16377`). ✅
- **No fixation:** session ID never accepted from URL/body — cookie-only; fresh ID minted at every login (`createMemberSession`, `_worker.js:16068`). OAuth state hashed, single-use (`used_at` atomic update), expiry-checked (`_worker.js:16034-16042`). ✅
- **Info:** sliding renewal re-signs the *same* session ID rather than rotating it (`_worker.js:15804-15806`). Acceptable; rebuild should rotate session IDs on renewal for long-lived sessions.

### 2.3 Open redirects — CLEAN ✅

Every user-influenced redirect passes an allowlist sanitizer: admin login `return_to` → `xSafeReturnPath` (`_worker.js:11442`, strict allowlist of six `/admin/…` paths, rejects `//` and non-`/` prefixes); X OAuth `return_to` → same sanitizer (`_worker.js:11624`); Patreon callback → `safeReturnPath` (`_worker.js:15814`, must start with `/members`, rejects `//`). All other `Location` headers are static or same-origin canonical rewrites.

### 2.4 Search injection — CLEAN locally, 1 coverage GAP + 1 Low

- **GAP — wiki upstream not auditable from this branch.** `/api/search` POST (`_worker.js:17638` → `handlePublicSearch`, `_worker.js:5008`) caps the query at 1000 chars, then **proxies the whole request to `wiki.grokarchivehub.com`** via `proxyProofLayer` (`_worker.js:3932`). The actual search SQL/FTS executes on the wiki upstream, which is not in this snapshot — the SQL-injection surface **cannot be audited from this branch**. Same for `/barak/search` (`_worker.js:5636`). The rebuild's Phase 0 search-contracts work (Subagent B) must audit the wiki host's search code directly. This is the single most important coverage gap in the audit.
- Apex-local search handlers are safe: `handleVisualEvidenceSearch` (`_worker.js:2548`) is in-memory manifest search (no SQL, `limit` clamped, `q` ≥ 3 chars); `handleBookOfBlackSearch` (`_worker.js:8523`) is in-memory filtering (limit clamped to 50); `highlightedBookExcerpt` (`_worker.js:8440`) HTML-escapes before inserting `<mark>` tags. No shell commands anywhere in the Worker.
- SQL scan: all 54 `.prepare(` calls are parameterized `?`-binds or static SQL — zero `${}` interpolations inside SQL strings.
- Reflected-XSS spot checks clean: `return_to` reflected into admin login HTML is `escapeHtml`'d (`_worker.js:11550`); `?subscription_id=` prefill regex-validated `^I-[A-Z0-9]{8,40}$` (`_worker.js:1573`, `1876`); `sku` param regex-validated (`_worker.js:2261`).
- **Low:** `limit` in the `/api/search` POST payload is forwarded raw to upstream (OpenAPI advertises max 50) — no worker-side clamp. Rebuild should clamp `limit` (1–50) in `handlePublicSearch` before proxying.

### 2.5 Patreon webhook (`POST /webhooks/patreon`, `_worker.js:17530` → `handlePatreonWebhook` ~`16344`) — CLEAN ✅

- Fail-closed 503 if `MEMBERS_DB` or `PATREON_WEBHOOK_SECRET` missing.
- Verifies `X-Patreon-Signature` = HMAC-MD5(secret, **raw body** via `request.text()` before JSON parse) with timing-safe compare; 401 + audit log (`webhook_signature_failed`) on mismatch. (HMAC-MD5 matches Patreon's documented scheme.)
- Idempotency: `patreon_webhook_events` PK on event ID; replays ignored with 200 (`webhook_duplicate_ignored` audit).
- Patron demotion auto-revokes that user's member sessions.

### 2.6 PayPal — DORMANT/DISABLED as claimed ✅

- Legacy checkout paths (`/api/commerce/paypal/orders`, `/capture`, `/verify`, `/webhook`) all return `gahPayPalVenmo083Disabled` → `paypal_checkout_not_configured` (`_worker.js:2020-2023`). No order creation or capture reachable.
- Live stack hard-gated by `gah090Active` (`_worker.js:1559`): requires `PAYPAL_LIVE_CHECKOUT_ENABLED=true` **and** live client id/secret **and** live webhook id **and** Resend key **and** session signing key — otherwise 503. Without live bindings, nothing payment-related executes.
- `gah091LiveBootstrap` (`_worker.js:1946`, POST + admin-Bearer-only) can provision a live PayPal product + $5.99/mo billing plan, but the response hard-codes `payment_accepted:false, buyer_subscription_created:false, checkout_flag_changed:false` — it cannot charge buyers.
- Live webhook (`_worker.js:1740`): provider-side verification via PayPal's `verify-webhook-signature` API, cert URL allowlisted to `api(-m).paypal.com`, ≤10-min transmission skew, 16 KB body cap, event allowlist.
- Buyer OTP login: 6-digit code HMAC-hashed at rest, 10-min expiry, 3 requests/hour/subscription (429), 5 attempts per code, atomic single-use claim, origin check, session cookie `HttpOnly; Secure; SameSite=Lax` with 1h expiry, re-verification against PayPal on each session use, revocation on logout.

### 2.7 CORS / rate limiting — mostly CLEAN, 2 Lows

- `Access-Control-Allow-Origin: *` appears **only** on public read-only surfaces: `/mcp` POST, A2A/agent-card/MCP-server-card/skill discovery JSON, `gahAgentJsonResponse`, `gahCommerce082Reply`, `visualEvidenceJson`. MCP tool list (`GAH_MCP_TOOLS`, `_worker.js:1111`) is read-only — no write tools. **No ACAO:* on any authenticated or state-changing endpoint.** ✅
- Rate limits present: admin login (sealed-cookie failure counter → lockout), PayPal OTP (3/hr, 5 attempts), Phang ingest (30/min/service + replay-request IDs + timestamped HMAC signatures).
- **Low:** Admin-login rate limit is enforced via a *client-side sealed cookie* (`_worker.js:11507`) — an attacker can clear cookies to reset the failure counter. Rebuild should add a server-side (KV/D1) per-IP throttle on the admin login path.
- **Low:** No Worker-side rate limit on public `POST /api/search` or `POST /a2a/v1/message:send` — both proxy to the wiki upstream; abuse is throttled only if Cloudflare edge rules exist. Rebuild should add a KV-backed per-IP throttle on the search proxy path.

### 2.8 Additional Low — proxy header hygiene

`proxyProofLayer` forwards **all** client request headers — including cookies, i.e. the signed `gah_member_session` bearer — to `wiki.grokarchivehub.com` (`_worker.js:3944-3945`). Same-operator subdomain, but the session credential now lands in upstream request logs and any upstream code. The rebuild should strip `Cookie`/`Authorization` on the proxy hop unless the upstream is intentionally in the session domain (and if so, document it and ensure the upstream never logs headers).

### 2.9 Explicitly checked and found CLEAN

No committed secrets of any kind; no `eval`/`new Function`/process spawn; no SQL string interpolation (54/54 parameterized); no open redirects (all `return_to` paths allowlisted); Patreon webhook signature verified with timing-safe compare and fail-closed setup; PayPal orders/capture/verify disabled, live stack dormant behind multi-binding gate; no ACAO:* on state-changing endpoints; OAuth states single-use + hashed; session cookies HttpOnly/Secure/SameSite=Lax with server-side revocation.

### Rebuild must-do list (security)

1. **Audit the wiki host's search code** (`/api/search`, `/barak/search` backends) — the actual SQL/FTS is out of this snapshot. (Highest priority.)
2. Strip or explicitly justify `Cookie`/`Authorization` forwarding in the search proxy hop.
3. Add server-side per-IP rate limiting on the admin login path and on `POST /api/search` (+ A2A send).
4. Clamp `limit` (1–50) in `handlePublicSearch` before proxying.
5. Rotate session IDs on sliding renewal (minor).

---

## 3. What the rebuild must preserve (checklist)

- [ ] All §1.1 agent endpoints return current payloads; skills-index digests recomputed if skill text changes.
- [ ] Public API (§1.2) unchanged; `/api/search` keeps the proof-layer upstream contract until deliberately migrated.
- [ ] Restricted APIs (§1.3) stay functional and stay out of the public catalog.
- [ ] Patreon OAuth → session → portal → resync → logout → webhook revocation round-trips intact.
- [ ] Commerce routes keep current enabled/disabled states; no payment behavior flips without owner approval.
- [ ] No archive route (§1.6) gains an auth gate.
- [ ] `/.well-known/*` paths keep their `X-GAH-Agent-Readiness` headers and robots/Content-Signal tags.

---

## 4. Blockers

**Need ChatGPT (deploy env):**
1. Confirm whether the PayPal live webhook is registered in the PayPal dashboard and receiving events; confirm whether `bootstrap-plan` was ever run against live (check `gah_paypal_plans` in production D1).
2. Confirm the live Cloudflare deployment matches snapshot commit `7bfc664` (Worker SHA-256 `2589511c…bb14d`); report any drift.
3. Provide the production binding inventory (`MEMBERS_DB`, KV namespaces, secret names) so rebuild branches don't reference bindings that don't exist.

**Need Thomas (owner decisions):**
4. Approve the go-live sequence for PayPal checkout (webhook confirmation → checkout activation → member entitlement cutover) — no action taken until approved.
5. Decide whether `/api/search`'s upstream (wiki.grokarchivehub.com proof layer) stays as the search backend through the rebuild or gets migrated; Subagent B/F need this to spec the search contract and performance budget.
