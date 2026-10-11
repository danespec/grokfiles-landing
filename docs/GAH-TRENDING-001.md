# GAH-TRENDING-001 — Search guides and editorial topic signals

## Scope and provenance

Designed from Ren's `Epstein Keyword Strategy.html` and `Trending topics box spec.md` (2026-10-11). The guide facts are based on publicly linked US DOJ Epstein Library and DOJ Disclosures (Data Sets 1–12); original investigations and source evidence remain in the existing GAH archive.

This feature does NOT generate or publish articles, collect visitor searches, announce allegations as trends, or create a new API endpoint.

## Routes and rendering

- `/guides/how-to-search-epstein-files` — procedural source-first DOJ/PDF/EFTA guide.
- `/guides/doj-epstein-data-sets` — official 12-Data-Set navigation hub, redaction and OCR caveats.
- `/` — permanent guide links and a conditional Trending module below Latest investigations.
- `/latest` — guide links and the same conditional Trending module, right-floating on wide screens.
- `/methodology#trending-topics` — brief methodology disclosure.
- Source document routes are included in the dynamically generated sitemap.

Server-side rendering uses the existing `X_TOKEN_STORE` KV binding, reading only `gah:public:trending:topics:v1`. No new binding or public API exists. A strict validator hides the module for missing/invalid/stale (>24h) data, too few or too many items, unsafe or duplicate phrases, unknown sources, or offsite paths. All labels are escaped. Production does not use the illustrative staging fixture.

Protected staging has `GAH_STAGING=true` and reads `frontdoor/trending-demo-v1.json`, explicitly labeled **preview examples—not live trends**. NEVER include this fixture in production deploy packages.

## Six-hour Mac research job

The local LaunchAgent `com.grokarchivehub.trending-research` runs `/Users/thomas/_gah_builds/GAH-TRENDING-001/refresh-trending.py` every six hours. It currently runs in **research-only preview mode** (no `--publish`); source `scripts/trending/refresh-trending.py` is tracked here.

It consumes public Google Trends US RSS, Google autocomplete where available, and Google News RSS. News headlines are *not* treated as measured search trends. Exact suggested phrases are retained, while accusation-pattern phrases are excluded. A confidence-scored candidate must have a published source-linked matching page; below-threshold queries and denied phrases are stored in a private, mode-600 Mac JSON gap log. Metadata is extracted locally from published HTML indexed by the public sitemap, not by crawling the web.

Latest dry run (2026-10-11): 0 Epstein-specific Google Trends RSS titles, 38 search suggestions, 96 Epstein-related news headlines, 80 indexed public pages, 2 display candidates, 2 unmatched query gaps. **No live public feed should be fabricated to make a 5-item module.**

The existing traffic KV namespace is `15e5bc2664bc4f40b94e26526febd1ff`, also bound as `X_TOKEN_STORE`. Namespace keys are strictly prefixed:
- `gah:public:trending:topics:v1`
- `gah:admin:trending:gaps:v1`

The first private KV PUT probe could not verify completion due to a URL/network error. Do not enable `--publish` in LaunchAgent or claim cloud-refresh acceptance until HTTPS credential, access rights, and a private-key write/readback have passed. Do not weaken certificate verification or expose OAuth tokens.

## Release gates

1. Run `node scripts/trending/test-trending.mjs` — 17 checks, all pass, including missing/stale/accusatory/unsafe feed hiding, both guide routes, sitemap, staging noindex.
2. Run the inherited security test suite; do not introduce regressions.
3. Deploy curated assets to protected staging and verify Access HTTP302 on both root and preview aliases.
4. Compare live production Pages canonical before any release. Preserve all Pages env settings, secrets, KV/D1/DO, preview Access, production public access and existing rollback package.
5. Production package must **exclude the staging example feed**. New guide URLs should return HTTP200 with canonical tags; both home and latest must retain permanent guide links. If KV has no qualifying live signal the Trending box is intentionally absent.
6. Recheck search and wiki CORS, rate limits, membership, false webhook rejection, sitemap pages, indexability, and rollback readiness. Never deploy stale GitHub main or touch live billing.
7. The next content feed becomes active only when verified public trend signals produce 5–8 confidently matched, ethically safe queries and authorized KV publishing works.

## Oct 11 authenticated KV gate hardening (GAH-TRENDING-017)

The live six-hour `com.grokarchivehub.trending-research` LaunchAgent was **already** configured with `--publish`, contrary to the older snapshot note above. Its latest pre-hardening run wrote the **private** admin gap-log key and safely declined a public refresh because only three suggested items qualified. The public trending box remains suppressed by the unchanged 5-item minimum and 24-hour expiration.

During an explicit readback regression, the Mac's cached Wrangler OAuth token had expired. Running cached `npx --no-install wrangler whoami` refreshed it without interactive reauthorization, new bindings, or account changes. An authorized subsequent Cloudflare KV write/readback to `gah:admin:trending:gaps:v1` succeeded. No public feed was written because the source data remained below threshold.

The source-controlled refresher now refreshes expired or near-expired Wrangler OAuth via the already installed CLI with captured logs, never printing tokens. Its KV writer allows **only** the original two keys and their approved payload schemas, sends credentials through a private `curl --config -` stdin stream (not CLI args), then performs an authenticated exact-key GET and compares returned JSON to the intended payload. Three brief attempts accommodate short propagation lag. A mismatch or error marks the refresh failed and cannot claim a verified publication. Temp payload is deleted in a `finally` block; generated local logs are private. No credentials or production previews are committed.

Verification gates: `python3 scripts/trending/test_trending_kv.py` checks refresh, key restrictions, secret-safe argv, transport failure, readback mismatch and cleanup; `node scripts/trending/test-trending.mjs` covers the fail-closed public renderer. Successful private KV verification does **not** certify 5–8 meaningful public trends or the full 19-target SEO keyword coverage. Original Ren keyword-strategy document is not present in this checked-out source snapshot, so do not invent an exact 19-term completeness count.

## Production post-release verification — 2026-10-11

Live release of two guides and fail-closed Trending logic was verified across 116/116 sitemap URLs, with apex search HTTP 200, invalid Patreon webhook HTTP 401, invalid PayPal webhook HTTP 400, and all Pages settings/bindings preserved. Current production rollback is available.

The demo fixture `frontdoor/trending-demo-v1.json` was **excluded from the production package** and preview samples do not render in production. A direct request to that missing file returns the site's generic 200 HTML fallback, not JSON. This is due to the existing Cloudflare Pages `_routes.json` exclusion for `/frontdoor/*`, which bypasses the Worker entirely for static assets. A proposed Worker-only 404 guard could not alter that response; its rollout automatically reverted to the stable guide/Trending release. Do not alter all frontdoor routing just to force 404 without a separate regression audit. Acceptance is **no sample JSON or preview content exposed**, rather than a particular HTTP status on a missing static asset.

Mac LaunchAgent `com.grokarchivehub.trending-research` is enabled every six hours in research-only mode, with a private gap log and no public KV writes. The feed currently hides itself because fewer than five validated trend items qualify. No false search-trend assertions were published.
