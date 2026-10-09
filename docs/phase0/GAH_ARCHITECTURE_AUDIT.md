# GAH Architecture Audit — Subagent A

Date: 2026-10-09
Auditor: Subagent A (Architecture & Codebase Mapping)
Snapshot: `danespec/grokfiles-landing`, branch `ren/production-snapshot-20261009`, commit `7bfc664`
Governing spec: `GAH_REBUILD_APPROVED_V2.md` (in repo)
Method: read-only static analysis of `~/workspace/gah-repo`. No code was modified. Line numbers cite `_worker.js` unless noted.
Scope note: this snapshot contains the apex Cloudflare Pages Worker + static site. It deliberately excludes ~1.4 GB of evidence binaries, production bindings/credentials, `.wrangler/` state, and production databases (per `REN_README.md`). **The wiki host (`wiki.grokarchivehub.com`) — which is the Worker's upstream origin and its search backend — is not in this snapshot.**

## 0. Deployment model

- Cloudflare **Pages** project (`wrangler.example.toml`: `name = "grokfiles-landing"`, `pages_build_output_dir = "."`, `compatibility_date = "2026-10-09"`). Static files are served from the repo root.
- `_worker.js` (17,990 lines, 919 KB) is the Pages **advanced-mode Worker**: a single bundled file, `export default { scheduled, fetch }` at lines 17223–17231.
- `_routes.json` (v1): `include: ["/*"]` with an `exclude` list. Excluded paths are served directly by Pages static hosting and **never reach the Worker**. The exclude list covers: versioned `/assets/*` bundles, `/evidence-data/*` binaries (vtt/txt/json/jsonl/png/jpg/pdf/m3u8/tsv), `/evidence-engine/*`, `/frontdoor/*`, `/frozen-assets/*`, `/research-heroes/*`, `/source-renders/*`, book-of-black css/js.
- `wrangler.example.toml` declares **zero bindings** — it is a template only. All production bindings (D1, KV, Durable Objects, secrets) live in the real deploy config held by ChatGPT.

## 1. Worker request-routing map

The `fetch` handler (lines 17231–17897) is a single sequential chain of ~127 `if` conditions. **Order matters**: specific routes precede generic ones, and everything unmatched falls through to `proxyProofLayer(request)` (line ~17897), which reverse-proxies to `wiki.grokarchivehub.com` (line 476). `cleanPath()` (line 3567) strips trailing slashes before matching.

### 1a. Host canonicalization & legacy repairs (lines ~17236–17360)

| Condition | Action |
|---|---|
| Analytics-gateway paths (`isAccountLevelAnalyticsGatewayPath`) | blocked (`blockedAccountAnalyticsResponse`) |
| `/artifacts*` | 404 inline — "Generated audit artifacts are not public routes" |
| `www.grokarchivehub.com` | 301 → apex |
| files./wiki. host + `/photos` or `/photos/incoming-visual` | 301 → apex `/photos` (`X-GAH-Route-Repair: GAH-PHOTOS-CANONICAL-REPAIR-001`) |
| apex `/photos/incoming-visual` | 301 → `/photos` |
| wiki host, non-internal-proxy requests | `WIKI_TO_APEX_REDIRECT_PATHS` → 301 to apex; `/sitemap.xml` → apex; else `serveWikiHostNoindexRoute` |
| `/hold-the-letter` | 301 → `/investigations/hold-the-letter` |
| `*.html` | 301 → extensionless canonical (legacy repair 019) |
| `/grok-command-v4` | 301 → `/search` |
| `/content/drafts/epstein-mcc-timeline`, `/dispatches/epstein-death` | 301 → `/dispatches/epstein-mcc-timeline` |
| `/wiki` | 301 → `/grok-command-v4` |
| `/favicon.ico` | 204 empty |
| cdn-cgi rocket-loader / cf.error css shims | inline stub responses (crawler parity) |
| `/assets/images/barak-archive-hero.png` | inline SVG fallback (`serveBarakArchiveHeroFallback`) |

### 1b. Static / asset serving (via `env.ASSETS`, the Pages static-asset binding)

| Route set | Handler | Notes |
|---|---|---|
| `FRONTDOOR_PATHS` — 149 exact paths (line 1) + `/frontdoor/*`, `/source-renders/*`, `/research-heroes/*` | `serveFrontdoorAssetStrict` (3639) → `env.ASSETS.fetch` + `enhanceHtmlResponse` meta/SEO injection | HTML-fallback guard: asset-looking paths returning `text/html` get a 404 instead |
| `FRONTDOOR_ROUTE_ASSETS` — ~60 mapped asset paths | `serveFrontdoorEnhanced` (3609) | Explicit asset→page mappings |
| `/videos/*` | `serveFrontdoorEnhanced` | |
| `V3_STATIC_ASSET_PATHS` — 77 `/assets/*` paths | `serveV3StaticAssetStrict` (6020) | **13 of these are also in `_routes.json` exclude → dead branches in production** (see §8.1) |
| `/book-of-black/book-of-black.{css,js}`, `BOOK_OF_BLACK_ROUTE_ASSETS` (10) | `serveFrontdoor` / `serveFrontdoorEnhanced` | |

### 1c. Search endpoints (see §3 for full inventory)

| Route | Handler | Backend |
|---|---|---|
| `GET /api/search` | `serveSearchApiDocs` (4356) | inline HTML docs page (noindex) |
| `POST /api/search` | `handlePublicSearch` (5008) | **proxied to wiki host** via `proxyProofLayer` (line 5038), response sanitized |
| `GET /barak/search*` | `serveBarakSearchWithContract` (5636) | proxied wiki page + injected contract HTML block |
| `GET /api/visual-evidence/search` | `handleVisualEvidenceSearch` (2548) | **local**: sharded JSON in `/visual-evidence-index/` via `env.ASSETS` |
| `/api/book-of-black/search` etc. | `handleBookOfBlackSearch` (8523) | **local**: in-memory page filter (ack-gated) |
| `GET /api/document-bundle/*` | `handleDocumentEvidenceBundle` (~17617) | per-EFTA bundle (backend not fully traced in this pass) |
| `/api/research/source-manifest/*`, `/api/research/citation-audit/*`, `/api/research/agent-health` (17605) | `gahPublicSourceManifestHttp`, `gahCitationAuditHttp`, `gahAgentHealth()` | local HTTP APIs |
| `/archive/EFTA*` | `serveCoreArchiveDossier` (16772) | `CORE_ARCHIVE_DOSSIERS` map (34 entries, line 320) + static `/archive/{id}.html`; falls back to wiki proxy |

### 1d. Barak routes

| Route | Handler | Notes |
|---|---|---|
| `GET /barak` | `serveBarakPortalWithReviewLinks` (5563) | proxies wiki HTML, then **regex-rewrites** "metadata-only placeholders" → "metadata-only records" and injects a reader-controls link block |
| `/barak/search*` | `serveBarakSearchWithContract` (5636) | proxy + contract injection |
| `/barak/receipts/*` | `serveBarakReceiptDetail` | worker-rendered |
| `barak/*.html` (entities, fara-review, receipts, source-map, timeline) | static via fallthrough/ASSETS | client-side JS viewer (`assets/barak-data.v298.js`, 592 KB) |
| **No `/barak/emails/{id}` route exists** | — | V2 brief's email viewer has no backend yet |

### 1e. AI / agent interfaces (compatibility-critical per V2)

| Route | Handler |
|---|---|
| `POST /mcp` (+ OPTIONS) | `handleGahMcp` (2378) — Streamable HTTP MCP, 32 KB body cap, in-worker |
| `POST /a2a/v1/message:send` | `handleGahA2aSend` |
| `/.well-known/agent-card.json`, `/.well-known/api-catalog`, `/openapi.json`, `/auth.md`, `/robots.txt`, `/.well-known/mcp/server-card.json`, `/.well-known/agent-skills/index.json`, `/.well-known/agent-skills/*/SKILL.md`, `/agent-tools.js`, `/.well-known/ai-catalog.json` | inline responses from embedded constants (verified for agent-card/api-catalog/openapi/auth/robots/skills at file end; ai-catalog + agent-tools.js observed in route chain, exact inline bodies not individually verified) |
| `/api/ai/{query,context-preview,status,usage,emergency-stop,answer,member/answer,admin/answer}` | `handleAiApi` (10960) et al. — responses carry `X-GAH-AI: dormant`; provider is env-configured (`aiProvider`, 10122), external LLM via fetch |

### 1f. Commerce / PayPal (compatibility-critical per V2)

| Route | Handler | State |
|---|---|---|
| `/api/commerce/*` | `gahCommerce082Handler` (2248) | catalog/readiness/plan/benefits = live JSON; `/quote` returns 409 (pricing not approved); `/checkout`, `/verify-receipt`, `/premium/*` → **503** ("no real challenge/receiver/settlement processor exists") |
| `/paypal/all-access` | `gah090SubscriptionPage` (17595) | subscription page |
| `/paypal/logout` | `gah090Logout` | |
| `/agent-commerce` | `gah090SubscriptionPage` | |
| PayPal webhook verify | `fetch("https://api-m.paypal.com/...")` (lines 1584, 1594, 1770, 1964) + D1 tables `gah_paypal_plans`, `gah_paypal_webhook_events`, `gah_paypal_subscribers` | wiring present, checkout dormant |

### 1g. Membership / Patreon / newsletter / social

- `/auth/patreon/{start,callback}`, `POST /webhooks/patreon` → `handlePatreonWebhook`; `GET /internal/patreon/setup/start`; `POST /internal/members/reconcile`, `POST /internal/newsletter/reconcile`
- `/members/logout`, `/members/resync`; `MEMBER_PORTAL_PATHS` (5 paths) → `serveMemberPortal`
- `/auth/x/{start,callback}`, `/api/x/{discover,health,provider-check,queue,scheduled-run,post}`, `/admin/x-publisher`, `/admin/x-diagnostics`, `/admin/social-publisher`, `/admin/reddit/{connect,callback}`
- `/api/newsletter/{subscribe,unsubscribe}`; `/api/analytics/event` → `handleGa4Event`; `/api/presence` → `handlePresenceRequest` (Durable Object `PRESENCE_ROOM`)
- Cron `scheduled()` (17224–17229): `reconcilePatreonMembers`, `reconcileNewsletterSubscribers`, `xRunInternalScheduledPublisher`, `phangRunInternalScheduledIngest`

### 1h. Admin / news / evidence / misc (worker-rendered)

- `/admin/{login,logout,ai,ai/diagnostics,ai/context,traffic,phang-docket-review}` — `serveTrafficAdmin` (15333) reads the traffic snapshot from KV token store (see §5)
- `/news`, `/news/phang-docket-watch` (+ `/timeline`, `/corrections`, `/methodology`, `/source-status`, `/events/*`) — worker-rendered Phang docket watch
- `/api/phang-docket/{health,ingest,review}` — ingest uses `COURTLISTENER_API_TOKEN`
- `/evidence-engine/v1|v2/*` → `serveEvidenceAssetStrict`; `/pdf-lite` → wiki proxy; birthday-book evidence paths → `serveBirthdayBookV2Alias`/`serveBirthdayBookSsr`; `/banking-records/entities*` → `serveBankingEntityRoute`; `/sitemap.xml` → `serveSitemapWithPublishedDispatches`; `/feed.xml` → `serveRssFeed`; `/research-index` → `serveResearchIndexApex`; `/topics` → `serveApexTopicsGuide`; `/dispatches/queue` → 301
- `FRESH_PROOF_PATHS` (5 paths) → wiki proxy with `gah_origin_fresh` cache-buster
- **Catch-all**: `path.startsWith("/api/")` → `proxyProofLayer` (unknown API paths return **wiki HTML**, not JSON 404); final fallthrough `return proxyProofLayer(request)` → wiki host for everything else

### 1i. SEO / route-policy layer

- `routePolicyForPath()` (615) + `applyRoutePolicyHeaders()` (~666): per-path AdSense-eligibility + indexability policy emitted as `X-GAH-Ad-*` / `X-Robots-Tag` / `X-GAH-Indexability-Policy` headers. ~200 `AD_EXCLUDED_EXACT_PATHS` (line 209), 66 `UTILITY_NOINDEX_EXACT_PATHS`, plus pattern rules (e.g., `/archive/EFTA*` → index only if in `CORE_ARCHIVE_DOSSIERS`, else noindex; `/research/*` noindex unless allowlisted).
- `enhanceHtmlText` / `enhanceHtmlResponse`: regex-based HTML augmentation (meta tags, canonical, security headers) applied to proxied and static HTML.

## 2. Static-page and asset structure

| Location | Contents | Served how |
|---|---|---|
| Repo root `*.html` (41 files) | index, search, investigations, dispatches, evidence-briefs, topics-equivalents (`explore.html`, `latest.html`, `live.html`), membership, account, login, donate, newsletter, etc. | `env.ASSETS` via `FRONTDOOR_PATHS` + `enhanceHtmlResponse` |
| `investigations/` (47 files), `dispatches/` (9), `evidence-briefs/` (20), `document-autopsies/` (2) | per-investigation pages + assets | static; specific slugs also in `FRONTDOOR_PATHS` |
| `assets/` (39 files + `images/` 66 files) | `v3.js/css`, `site.js`, `styles.css`, `barak-data-*.js` (5 versioned copies), `barak-portal*.js`, `barak-ui-*.css`, `consent-ui-*.css`, `provenance-060.css`, card/hero jpgs | `_routes.json` excludes most from Worker (Pages serves directly); 77 mapped in `V3_STATIC_ASSET_PATHS` |
| `barak/` (5 HTML) | entities, fara-review, receipts, source-map, timeline | static viewer pages; data from `assets/barak-data.v298.js` (592 KB client-side bundle) |
| `visual-evidence-index/` | `manifest.json`, `chunks.json` (634 chunks), `efta/` (118 shard JSON files) | read by Worker via `env.ASSETS` |
| `evidence-data/` (546 files) | per-investigation dirs, each with `source-manifest.json` / `claims.json` / `summary.json` + source assets | `_routes.json`-excluded (Pages direct); machine-readable evidence layer |
| `frontdoor/` (24), `source-renders/` (6), `research-heroes/` (7), `frozen-assets/` (2) | runtime assets, archived source bases, hero images | Pages direct (excluded from Worker) |
| `content/` (9), `archive/` (5), `research/` (5), `methodology/` (5), `corrections/` (1), `reading-room/` (8), `book-of-black/` (7) | content + workbench pages | mixed static / worker-enhanced |
| `deploy/` | `validate-local-assets.py`, `asset-integrity-report.json` (86 local refs checked, 0 missing) | build-time validator, not deployed |

Pages are **static HTML served through the Worker for SEO augmentation**, not server-rendered from a CMS: `serveFrontdoor` fetches the static file from `env.ASSETS` and `enhanceHtmlResponse` injects meta/headers. Editorial pages (`/news/*`, `/topics`, dossier pages) are worker-composed from embedded templates + upstream wiki content.

## 3. Search endpoint inventory

| Endpoint | Method / params | Backend queried | Notes |
|---|---|---|---|
| `/api/search` | `POST` JSON `{q\|query, limit, fast, no_ai}`; `GET` → docs page | **wiki.grokarchivehub.com** (proxied, response sanitized via `sanitizePublicSearchValue`; `Cache-Control: no-store`) | Exact-ID detection `/^EFTA[0-9]{8}$/i` in Worker (line ~5064); alias expansion via `PUBLIC_SEARCH_EXACT_PERSON_PHRASES` (1 entry) and `PUBLIC_SEARCH_INVERTED_QUERY_ALIASES` (2 entries) triggers a **second sequential** upstream POST |
| `/barak/search*` | `GET` page | wiki host page, Worker injects contract block | Worker does not execute the Barak query itself |
| `/api/visual-evidence/search` | `GET` `?q=&limit=` (q ≥ 3 chars, limit ≤ 500) | **Worker-local**: `/visual-evidence-index/{manifest, chunks, efta/*.json}` via `env.ASSETS`; LRU shard cache (6) + module-level manifest cache | Shard fan-out capped at 16 (`VISUAL_EVIDENCE_MAX_SEARCH_SHARDS`, line 2425); shard fetches are **sequential awaits** in a loop |
| `/api/visual-evidence/items`, `/api/visual-evidence/efta/*`, `/api/visual-evidence/status` | `GET` | same local sharded index | |
| `/api/book-of-black/search` | payload `{q\|query\|term, status, page, limit≤50}` | **Worker-local** in-memory filter over manuscript pages (`bookOfBlackData`, 8450); ack-gated (403 without acknowledgement) | verification_status hardcoded `NOT_YET_TESTED` |
| `/api/document-bundle/{efta}` | `GET` | per-EFTA evidence bundle (`handleDocumentEvidenceBundle`, ~17617; backend not fully traced) | linked from search results as `document_bundle_url` |
| `/api/research/source-manifest/*`, `/api/research/citation-audit/*` | `GET` | Worker-local manifest/audit HTTP APIs | |
| `/archive/EFTA*` pages | `GET` | static `/archive/{id}.html` (34 dossiers) else wiki proxy | |

**Headline: the primary public search (`POST /api/search`) is executed by the wiki host, not by this Worker.** The Worker is a sanitizing proxy for it. Any "single authoritative search manifest" (V2 Phase 0) built only from this snapshot cannot see or govern the actual search backend.

## 4. Cloudflare service-binding requirements

`wrangler.example.toml` declares **no bindings** (template only). Bindings required by code (`env.*` references in `_worker.js`):

| Binding | Type (inferred from usage) | Used for | Present in snapshot? |
|---|---|---|---|
| `MEMBERS_DB` | D1 (`env.MEMBERS_DB.prepare(...).bind(...).first()`, 58× + 2× `batch`) | members, `gah_paypal_plans`, `gah_paypal_subscribers`, `gah_paypal_webhook_events`, commerce metering | **No** — schema/data excluded |
| `X_TOKEN_STORE` / `X_PUBLISHER_KV` / `X_AUTH_KV` | KV (`X_TOKEN_STORE_BINDINGS`, line 3175) | encrypted X OAuth tokens; **traffic-dashboard snapshot** (`readTrafficSnapshot`, 15228) | **No** |
| `X_POST_QUEUE` | KV / Queue (`X_POST_QUEUE_BINDINGS`, line 3176) | X post queue | **No** |
| `PRESENCE_ROOM` | Durable Object (`PRESENCE_ROOM.get`, 1×) | presence | **No** |
| `ASSETS` | Pages static-asset binding (13× `env.ASSETS.fetch`) | all static serving | Provided automatically by Pages deploy; content is this repo |
| ~30 secrets | `env.X_ADMIN_TOKEN`, `X_CLIENT_ID/SECRET`, `X_SCHEDULER_SECRET`, `REDDIT_CLIENT_ID/SECRET`, `PATREON_*`, `PAYPAL_LIVE_CLIENT_ID`, `MEMBER_SESSION_SIGNING_KEY`, `COURTLISTENER_API_TOKEN`, `RESEND_API_KEY`, `GA4_*`, etc. | OAuth, webhooks, admin auth, ingest, email, analytics | **No** (names only) |
| `env.AI` (Workers AI) | — | **Not referenced anywhere** | n/a |

External origins fetched at runtime: `wiki.grokarchivehub.com` (proxy upstream), `api-m.paypal.com` (PayPal, lines 1584/1594/1770/1964), `www.patreon.com` (OAuth, 15884), plus X/Reddit/Resend/CourtListener/GA4 endpoints via configured secrets. AI provider is env-configured external LLM (no Workers AI binding).

**Stubbed vs required:** everything above except `ASSETS` is required for full functionality and absent here. Degradation without them (from code): admin/X/publisher routes → 503 setup pages; traffic admin → "snapshot unavailable"; PayPal webhook verify → fails; AI → `ai_execution_disabled` (dormant); search/docs/proxy → still work (they need no bindings).

## 5. Data-storage dependencies & exclusions

Runtime reads:
- **Static site + indexes** from `env.ASSETS` (this repo's files).
- **Search backend** on wiki host (outside snapshot) for `POST /api/search` and most content pages (proxy).
- **D1 `MEMBERS_DB`** for membership/commerce/PayPal state.
- **KV token store** for OAuth tokens + traffic snapshot; **KV/queue** for X post queue; **Durable Object** for presence.

Deliberately excluded from snapshot (per `REN_README.md`): ~1.4 GB evidence imagery/binaries, `.wrangler/` runtime state, private bindings/credentials, production databases, operator-only archives. Consequence for rebuild work: **Subagents B/C/D cannot verify counts, hashes, or Barak numbers from this snapshot** — the 19/5,587/5,505 figures render from the wiki host, and no Barak email bodies are present (only the 592 KB client-side viewer bundle).

## 6. Known architectural bottlenecks

1. **Single-file Worker (919 KB / 17,990 lines).** Cold-start parse cost on every new isolate; the entire route table, templates, and policy maps load for every request type. Merge-conflict nexus (V2 Rule 4 already forbids concurrent edits to `_worker.js`).
2. **Search latency = wiki round-trip(s).** `POST /api/search` proxies to the wiki host with `no-store`; alias matches trigger a second sequential upstream POST. There is no Worker-side search cache, so the V2 "search performance budget" cannot be met without either caching or moving the index.
3. **Sequential shard fan-out in visual-evidence search.** `handleVisualEvidenceSearch` awaits up to 16 shard JSON fetches **in a loop** (lines 2548–2620); worst case ≈ 16 sequential subrequests per query.
4. **Full-body HTML rewriting per request.** `proxyProofLayer` buffers entire upstream HTML bodies (`await upstream.text()`) and runs multiple regex passes (`enhanceHtmlText`, Barak rewrites, photo-bridge injection) — CPU + TTFB on every proxied page view.
5. **Per-isolate caches only.** `VISUAL_EVIDENCE_MANIFEST_CACHE`, `ARCHIVED_SOURCE_BASE_CACHE` are module globals — cold isolates refetch manifest + 634-chunk index before serving.
6. **Client-side Barak bundle.** 592 KB `barak-data.v298.js` parsed by every viewer visitor; 5 versioned copies exist (two byte-identical pairs — dead weight, all `_routes.json`-excluded anyway).
7. **No inbound rate limiting.** Only outbound 429 handling for the X API (lines 13594/14048/14074); public search/AI endpoints have no throttle in Worker code.

## 7. Dependencies and risks of restructuring `_worker.js`

1. **No build step exists.** The repo ships raw `_worker.js`; Pages advanced mode consumes a single file. Splitting into ES modules requires introducing a bundler (esbuild/rollup) **and changing the deploy pipeline ChatGPT operates**. If the deploy does a plain directory deploy, bare `import` statements will break production. **This is the highest-risk change.**
2. **Order-dependent routing.** ~127 conditions with specific-before-generic semantics (e.g., all `/api/*` specifics must precede the `/api/` catch-all at ~line 17630; `FRONTDOOR_PATHS` before the proxy fallthrough). A route-table extraction must preserve exact precedence or routes will shadow each other.
3. **Wiki-proxy contract is implicit.** `WIKI_INTERNAL_PROXY_HEADER` (477), `isWikiInternalProxyRequest` (3581), `WIKI_TO_APEX_REDIRECT_PATHS`, `gah_origin_fresh` params, `serveWikiHostNoindexRoute` — the wiki host changes behavior based on these. Refactoring must preserve byte-level header/path behavior or risk redirect loops / deindexing.
4. **Distant shared state.** Constants defined hundreds of lines from use (`AD_EXCLUDED_EXACT_PATHS` @209 → `routePolicyForPath` @615 → `applyRoutePolicyHeaders` everywhere; `CORE_ARCHIVE_DOSSIERS` @320 → `serveCoreArchiveDossier` @16772; `FRONTDOOR_PATHS` @1 → fetch @17400s). Naive file-splitting creates circular imports; a dependency map must come first.
5. **`_routes.json` coupling.** Any new Worker route (e.g., V2's `/barak/emails/*`) must be reconciled with the exclude list; the existing 13-path drift (§8.1) proves this coupling already fails silently.
6. **Binding references must survive.** The real `wrangler.toml`/Pages config (held by ChatGPT) must declare every `env.*` name the code touches; a restructure that renames or drops one breaks that surface at deploy time with no local signal (snapshot has no bindings to test against).

## 8. Critical problems / verified bugs

1. **`_routes.json` ↔ Worker asset-map drift (verified by set intersection).** 13 of the 77 `V3_STATIC_ASSET_PATHS` entries are also in `_routes.json` `exclude` (e.g. `/assets/v3.js`, `/assets/hero-desk.jpg`, `/assets/oswald-400.woff2`). For these, Pages serves the file directly; the Worker's `serveV3StaticAssetStrict` branch is **dead code in production** and its security/SEO headers never apply. Silent config drift — neither side warns.
2. **Content mutation in the proxy layer (verified, lines 5563–5600).** `serveBarakPortalWithReviewLinks` regex-rewrites upstream wiki HTML (`/metadata-only placeholders/gi` → "metadata-only records", plus `\bplaceholder\b` → "record"). Terminology source-of-truth is split between the wiki host and Worker regexes; any wiki copy change silently breaks the rewrite. Directly relevant to Subagent C: the Barak counts render upstream, not here.
3. **Unknown `/api/*` paths return wiki HTML, not JSON 404 (verified).** The generic `if (path.startsWith("/api/"))` catch-all (~line 17630) proxies to the wiki host, so a typo'd API path yields an HTML page with a 200/404 HTML body — hostile to API consumers and MCP clients.
4. **Dead-weight duplicated Barak bundles (verified by byte size).** `assets/barak-data-027.js` == `barak-data-036.js` (580,085 B); `assets/barak-data-050.js` == `barak-data.v298.js` (592,286 B). All are `_routes.json`-excluded; the older pairs serve no purpose.
5. **Search alias/personalization layer is nearly empty (verified counts).** `PUBLIC_SEARCH_EXACT_PERSON_PHRASES` has 1 entry, `PUBLIC_SEARCH_INVERTED_QUERY_ALIASES` 2 entries — either intentionally minimal or an incomplete port. If the V2 search contract expects rich aliasing, the data isn't here.
6. **PayPal checkout is dormant by code (verified, ~line 2266).** `/api/commerce/checkout`, `/verify-receipt`, `/premium/*` return 503: "no real challenge/receiver/settlement processor exists." Matches the handoff (live credentials exist; webhook completion unconfirmed). The rebuild must not present checkout as live.
7. **No `/barak/emails/{id}` route exists (verified by full route dump).** The V2 email viewer is greenfield — today's Barak "viewer" is static HTML + the client-side JS bundle.
8. **AI answer layer is dormant (verified).** `handleAiApi` responses carry `X-GAH-AI: dormant`; the execution gate defaults to disabled. Consistent with the V2 prohibition on generated answers in public search — nothing to remove, but also nothing to reuse for "AI features."

## 9. Specific blockers

### Need from ChatGPT (deploy environment)
1. **Real binding inventory**: D1 database ID + table schemas for `MEMBERS_DB`, KV namespace IDs (`X_TOKEN_STORE` family, `X_POST_QUEUE`), Durable Object binding, and confirmation the deployed config matches what `_worker.js` references.
2. **Deploy-fidelity check**: confirm the live Worker's hash equals snapshot `2589511c2fde60a4f10a70ccc42ac86ecdaaf07003290a8af04d962dc70bb14d`; report any post-snapshot production changes.
3. **Wiki-host search contract**: the `POST /api/search` request/response schema of wiki.grokarchivehub.com — the search backend is outside this repo, and Subagent B's manifest depends on it.
4. **Wiki-host identity**: what serves wiki.grokarchivehub.com (Worker? NAS origin? Pages?) and its deploy pipeline — the apex proxy contract (`X-GAH-Internal-Wiki-Proxy`, redirect paths) must be tested against it.
5. **Deploy mechanics**: exact Pages deploy command/flow and whether any bundling/transform runs; deployed `_routes.json` version (to confirm the 13-path drift is live, not snapshot-only).

### Need from Thomas (owner decisions)
1. **Build-step decision**: approve introducing a JS bundler (esbuild) so `_worker.js` can be split into modules, or require the single-file structure be preserved (constrains all subagents' deliverables).
2. **Search-backend strategy**: keep proxying `POST /api/search` to the wiki host (then the "single authoritative manifest" is a contract *with* the wiki side) vs. migrate the search index into the Worker/Pages (then Subagent B needs the index data, which is excluded from this snapshot).
3. **Barak data access** for Subagent C's reconciliation (19 / 5,587 / 5,505) — the numbers and email bodies are not in this snapshot.
4. **PayPal posture**: confirm checkout stays dormant through the rebuild (no payment-code changes per V2 Rule 7 / Subagent E).

---
*End of Subagent A deliverable. Read-only analysis; no repository files were modified.*
