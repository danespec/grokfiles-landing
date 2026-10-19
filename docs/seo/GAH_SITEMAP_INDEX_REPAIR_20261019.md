# GAH-SEO-SITEMAP-002 — Fix stale apex sitemap-index.xml

2026-10-19. Finding during operator-provided Crawl stats audit: the secondary live https://grokarchivehub.com/sitemap-index.xml returned an XML sitemap index with three loc elements pointing to wiki.grokarchivehub.com/sitemap.xml, /sitemap-global.xml and /sitemap-archive-1.xml. Each of those wiki endpoints returned HTTP 200 **with zero URL entries** when tested. The correct apex https://grokarchivehub.com/sitemap.xml returned 200 with **145 existing canonical newsroom URLs**, and is already advertised by the apex robots.txt.

Change only apex GET/HEAD /sitemap-index.xml to a standards-compliant sitemapindex containing the single actual, healthy apex /sitemap.xml. No changes to actual URL sitemap, document permissions, Google-Extended training restrictions, Cloudflare WAF, wiki routing, member content, privacy or publishing.

GSC data through 2026-10-17 showed 21,627 requests across all GAH hosts, 20,194 on wiki and 1,304 on apex. Google Search's hostname-specific crawling budget means that wiki activity should not be assumed to steal apex capacity. Site response-code percentages apply to the whole domain property, not necessarily the apex. This secondary sitemap change is hygiene, NOT a demonstrated cause or cure of the 105 GSC discovered-not-indexed apex URLs in the October 11 indexing report.

Test: Worker syntax; isolated test; all 11 regression suites; after deploy verify /sitemap-index.xml XML parses as one sitemap pointing at /sitemap.xml, 145/145 existing page URLs remain HTTP200, and /robots.txt still points at /sitemap.xml. Do not claim Google has reindexed until verified in Search Console.
