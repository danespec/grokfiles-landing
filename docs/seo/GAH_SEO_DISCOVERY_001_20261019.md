# GAH-SEO-DISCOVERY-001 — Indexable News & Guides Directories

Date: October 19, 2026. Scope: source-first discovery. No changes to private source data, Worker authentication, payment processing, or research conclusions.

## Verified baseline
- Production robots.txt returns 200, allows ordinary search robots, and links the apex sitemap. Cloudflare managed rules disallow certain model-training crawlers, including Google-Extended; that is not equivalent to blocking Google Search.
- The live sitemap contained 143 distinct URLs, all 143 returned HTTP 200 in the bounded crawl. Reachable does not mean Google-indexed.
- /guides returned HTTP 404 despite seven public guide articles, some with backlinks to that broken directory.
- /news returned HTTP 200 but carried HTML and HTTP noindex,follow under the previous phang-news-backing-files-absent quality exclusion. Its prior content focused on the limited Phang docket-watch lane, even though four substantive editorial news reports are published elsewhere.
- The new Internet vs. Receipts articles are individually indexable and source-linked.

## Remediation
- /guides: new curated article directory, linking the seven official records and verification guides, with self-canonical metadata and CollectionPage structured data.
- /news: replace only the old Phang-only GET/HEAD landing page with a substantial index of four original editorial reports and the separate fact-check series. The /news/phang-docket-watch source-status and all review-gated routes stay unchanged and non-indexable.
- Remove only the stale /news noindex exclusion because the route now serves a sufficiently substantive editorial landing; preserve noindex on all other sensitive/thin/utility routes.
- Add homepage and Start Here discovery links, explicit route mapping, ad-free policy, and sitemap entries.
- Preserve original reporting source links and qualifications; avoid implying names, draft charges or proposed transactions establish guilt or completed actions.

## Validation
- Worker Node syntax.
- Existing 11-suite Phase0 regression.
- tests/test_seo_discovery_hubs.mjs.
- Live 200 + index,follow + canonical + unique heading and document title + sitemap presence for both repaired hubs.
- Existing 143 sitemap URLs should remain 200 after production release; Phang review restrictions unchanged.

## What cannot yet be measured
- Live GA4 traffic attribution or Google's actual indexation/ranking. The paid GSC Wizard connection is unavailable due to an expired trial. Google Search Console itself is free at https://search.google.com/search-console and should be used to inspect URL coverage, search queries, impressions, CTR, selected canonicals and sitemap submission. Code readiness cannot establish Google indexing or increased traffic.
