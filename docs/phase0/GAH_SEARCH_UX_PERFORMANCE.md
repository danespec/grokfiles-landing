# GAH Search Performance & Mobile UX — Evaluation (Subagent F)

Date: 2026-10-09. Repo: `~/workspace/gah-repo`, branch `ren/production-snapshot-20261009` (commit `7bfc664`), read-only.
Governing spec: `GAH_REBUILD_APPROVED_V2.md` — measurable criteria: speed, mobile usability, broken links, indexing, citability.

**Method:** static code/markup review of the snapshot + live timing probes against production (`grokarchivehub.com`) for `/api/search`, `/api/visual-evidence/search`, and `/sitemap.xml`. **No headless browser was available in this environment** (no Chromium/Playwright), so mobile rendering was evaluated by static CSS/DOM analysis, not screenshots. Viewport rendering tests remain to be run (see Blockers).

## Headline metrics (measured)

| Probe | Result |
|---|---|
| `/api/search` exact-ID (`EFTA00095936`), TTFB | 0.69–1.42s (cold 1.42s, warm ~0.7s); upstream `processingTimeMs` = **12ms** |
| `/api/search` keyword (`"flight logs"`), total | **2.64s**; upstream `processingTimeMs` = **1717ms** |
| `/api/search` response payload | 2.9 KB (exact-ID, 1 hit) · 15.8 KB (keyword, 10 hits) |
| `/api/visual-evidence/search` TTFB | ~0.70s (786 B, zero-result query) |
| `/sitemap.xml` TTFB | 0.50s, 13.5 KB, `Cache-Control: no-store` |
| `/search` page weight (static) | HTML 9.8 KB + `v3-ui-054.css` 40 KB + `consent-ui-054.css` 128 B + `v3-newsletter-062.js` 32 KB ≈ **82 KB** total |
| In-repo asset references | **567 refs across 149 HTML files — 0 missing** |
| Root pages with canonical | **41/41**, all matching `og:url` |
| Sitemap core entries | 99 URLs, deduped, noindex-filtered; Andrew verdict page present |
| Visual-evidence shards (in repo) | 118 shards, median **248 KB**, max 1.35 MB, total 27 MB |

**Latency decomposition (the key finding):** for exact-ID queries the upstream engine takes 12 ms but TTFB is ~700 ms — the cost is the **apex Worker → `wiki.grokarchivehub.com` cross-host proxy hop** (`proxyProofLayer`, `_worker.js:3932`), plus TLS. For keyword queries the upstream engine itself takes 1.7 s (`processingTimeMs`), dominating total time. So there are two separate latency problems: a ~0.7 s proxy floor on *every* search, and a ~1.7 s engine cost on keyword searches.

## 1. Mobile search usability (static review)

- **Header mini-search is desktop-only.** `.search-mini` is `display:none` below 1100 px (`assets/v3-ui-054.css:87-114`). On mobile there is no header search; the path is Menu → Search → `/search`. Acceptable, but mobile search costs two taps plus a page load — the v2 "search first action" homepage should close this gap.
- **Main search form is mobile-sound.** Input `font-size: 1.3rem` (no iOS auto-zoom, threshold is 16 px), submit button `min-height: 44px` and full-width below 430 px (`v3-ui-054.css:394-410`). The `.search-layout` collapses to one column below 900 px (`:452`).
- **Tap-target inconsistency.** `.btn` base is `min-height: 36px` (`v3-ui-054.css:95`) — under the 44 px target. Mobile nav links are 44 px (`:108`), the search button is 44 px, but generic `.btn` instances (recent-search chips, card links) are 36 px. Result-card "Open source" links are inline text with no padding — small targets on touch.
- **No results pagination.** The client hard-codes `limit: 10` (`assets/v3-newsletter-062.js:621`) and renders "Search complete · N results" with no "show more" affordance, even though the API returns `estimatedTotalHits` and accepts `limit` up to 50. Mobile users get the thinnest slice with no way to dig deeper.
- **No debounce needed** — search is submit-driven, not keystroke-driven. Fine.

## 2. Search latency — what will dominate at production scale

Request path for one `/search` submit (`_worker.js:5008-5135`):
1. Apex `handlePublicSearch` → `proxyProofLayer` → cross-host POST to `wiki.grokarchivehub.com` (~0.5–0.7 s floor, measured).
2. Possible **second** upstream call for inverted-query aliases (`PUBLIC_SEARCH_INVERTED_QUERY_ALIASES`) — worst case doubles the hop.
3. `enrichPublicSearchRowsWithVisualEvidence` (`_worker.js:4969`): manifest read + `Promise.all` over distinct shards — parallel, good — but each shard is ~248 KB median from env assets.
4. Response forced `Cache-Control: no-store` — **zero edge caching**, every keystroke-equivalent submit re-pays the full cost.

`handleVisualEvidenceSearch` (`_worker.js:2548`) fetches shards **sequentially** (`for … await`, up to `VISUAL_EVIDENCE_MAX_SEARCH_SHARDS = 16`). At ~10–30 ms per asset read that is 160–480 ms of avoidable serial latency on every broad visual search. (An in-memory LRU of 6 shards softens repeats only.)

At production data sizes the binding constraint is not payload (15.8 KB for 10 hits) but **round trips**: proxy hop + engine + serial shard fan-out + no-store.

## 3. Results-page performance

- **Partial updates, no full-page reload.** `v3-newsletter-062.js` renders into `[data-search-results]` via `innerHTML`/DOM nodes, syncs `?q=` with `history.replaceState`, restores from URL on load. Good.
- **Render-blocking:** 2 stylesheets in `<head>` (40 KB total — fine), one inline consent-boot script (small), newsletter JS at end of `<body>` (parser-blocking but post-content). No JS in `<head>`. No images above the fold on `/search`.
- **XSS posture is correct:** result cards use `textContent` + `safeUrl` (http/https only); server side strips `/volume` and `/homes` hrefs (`v3-newsletter-062.js:634`).
- **Sitemap is regenerated per request** (`no-store`, `_worker.js:5537`) including async Phang-docket and video entries. At ~110 URLs / 0.5 s this is tolerable today but wasteful under crawler load; it will degrade as the sitemap grows.

## 4. Accessibility basics

- Present: skip link, `:focus-visible` outlines (`v3-ui-054.css:32`), `aria-label`s on both search inputs, labelled mobile nav.
- **Gap: results are not announced.** `[data-search-results]` has no `role="status"` / `aria-live` (`search.html` has `aria-live="polite"` only on the Ask-GAH panel, line 155). Screen-reader users get no feedback when results land.
- **Gap: no focus management.** After submit, focus stays in the input; there is no heading/focus move to the results region.
- Contrast: `--gold` #d4aa2f on `#0b0907` ≈ 7:1; `--muted` #a39b8e ≈ 5.5:1 — both pass.

## 5. Broken source links

- **In-repo: clean.** 567 `/assets/*` references across 149 HTML files resolve; 7,480 internal hrefs checked — all remaining "suspects" are legitimate Worker-served routes (`/evidence-data/*`, `/research-index`, `/topics`, `/wiki` redirect, `/barak/*`).
- **Needs live checking (not verifiable from the snapshot):** `/api/search` upstream availability on the wiki host; `/api/visual-evidence/efta/{id}` item URLs; `/archive/{EFTA}` routes; DOJ library outbound links; `/api/document-bundle/{EFTA}` URLs the search API now emits. Recommend a scheduled live link audit (see thresholds).

## 6. Canonical / sitemap / indexing integrity

- 41/41 root static pages carry self-referencing canonicals matching `og:url`; the Worker rewrites canonical/robots/OG at serve time (`enhanceHtmlText`, `_worker.js:6826`) and forces route-policy robots (`noindex,follow` on `/search`, `/barak/search`, reading-room, machine cards).
- Sitemap filters non-indexable routes (`sitemapEntryIsIndexable`, `_worker.js:5421`), dedupes, and serves `application/xml`. Discipline is intact — the rebuild must preserve the serve-time rewrite path, not just the static tags.

## 7. Dormant-code risk (flag for ChatGPT)

`FRONTDOOR_SITE_JS` (`_worker.js:689`) contains a legacy search handler (`runSearch`, `:768`) that binds `document.querySelector("[data-archive-search]")` — the **first** match — and dereferences `button.disabled` unconditionally. On `/search` the first match is the header mini-form, which has no `<button>` → `TypeError` on every invocation. It is currently **dormant** (`ensureGlobalExperienceShell` at `:6439` is never called; only `live.html` loads `/frontdoor/site.js`), and the working handler is `v3-newsletter-062.js` (multi-form aware, null-guarded, recent-search chips, exact-ID fallback). If the injection is ever re-enabled, `/search` breaks. **Recommend deleting the dormant search block from `FRONTDOOR_SITE_JS`** — one owner, one handler.

## Recommended measurable thresholds (performance budget)

Based on the measurements above, not generic advice:

| Criterion | Threshold | Current |
|---|---|---|
| Search TTFB, exact-ID (broadband) | p50 < 1.0 s, p95 < 1.5 s | ~0.7 s ✓ (after proxy fix, target < 0.4 s) |
| Search TTFB, keyword (broadband) | p50 < 1.5 s, p95 < 2.5 s | 1.7–2.6 s ✗ at p95 |
| Search interactive on 4G (results rendered) | < 3.5 s | ~3–4 s marginal |
| `/search` total transfer | < 150 KB | ~82 KB ✓ |
| `/api/search` response, limit=10 | < 50 KB | 16 KB ✓ (do not raise limit; add pagination instead) |
| Sitemap TTFB | < 1.0 s, cacheable | 0.5 s ✓ but `no-store` — switch to `s-maxage=3600` |
| Dead-link rate, file-open links (live audit) | < 0.5 % | unknown — needs live audit |
| In-repo asset/link integrity | 0 missing (CI-gated) | 0 ✓ |
| Touch targets, search-critical UI | ≥ 44 px | search button ✓, `.btn` 36 px ✗ → raise |
| Search input font-size (mobile) | ≥ 16 px | main ✓, mini n/a (desktop-only) |
| Results announced to AT | `role="status"` + focus move | ✗ missing |

## Blockers needing ChatGPT or Thomas

1. **Upstream search engine is not in this repo.** The 1.7 s keyword `processingTimeMs` and the wiki-host proxy target live outside the snapshot — only ChatGPT (deploy env access) can profile or fix the engine, or move the index behind the apex Worker to eliminate the ~0.7 s cross-host floor. Exact-ID responses are also good candidates for short edge caching (`s-maxage=60`) — needs ChatGPT to confirm upstream freshness semantics.
2. **No headless browser in this environment.** Mobile viewport rendering, tap-target measurement, and Core Web Vitals (LCP/CLS/INP) need a real render pass — ChatGPT or Thomas to run Playwright/Chromium against the snapshot or staging.
3. **Live link audit needs production.** `/archive/{id}`, `/api/document-bundle/{id}`, visual-evidence item URLs, and DOJ outbound links can only be verified live — propose a scheduled worker-side audit; needs Thomas's approval to run against production.
4. **`_worker.js` edits are centrally coordinated** (Rule 4): the dormant search-block removal and the sequential→parallel shard fan-out should go through ChatGPT to avoid conflicts.
