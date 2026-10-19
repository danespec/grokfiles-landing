# GAH-SEARCH-GROWTH-001 — Evidence-led editorial SEO

Date: October 19, 2026. Scope: two original investigations and their newsroom discovery. Original source documents, privacy protections, canonical paths, payments and authentication unchanged.

## GSC evidence, not ranking folklore
Owner-supplied Google Search Console domain-property Performance-on-Search export, July 18–October 17, 2026, all hosts combined. Pages.csv records:
- Main-host FBI Vault Part 13 source audit: 42 impressions, 0 clicks, average position 4.83.
- Main-host DOJ OIP March 2025 emails audit: 12 impressions, 1 click, average position 11.33.
- Main-host homepage: 75 impressions, 3 clicks, average position 7.48.
- Queries.csv contains 285 rows, overwhelmingly opaque numeric file identifiers rather than ordinary question searches. It cannot identify per-page query associations or broad-topic search demand.
- Wiki earns 39 of 44 total domain search clicks; main host 5.
- Coverage reports predate the October 19 technical repairs. Google Search Console shows an actual October 19 successful Googlebot smartphone crawl and index of Hold the Letter.

Google Search Central guidance: helpful people-first original reporting, concise descriptive page titles, crawlable contextual internal links, and faithful Article structured data. Reference URLs:
https://developers.google.com/search/docs/fundamentals/creating-helpful-content
https://developers.google.com/search/docs/appearance/title-link
https://developers.google.com/search/docs/crawling-indexing/links-crawlable
https://developers.google.com/search/docs/appearance/structured-data/article

## Changed
- FBI Vault Part 13 original article: shorter title and visible H1; clear answer-first summary; links to original DOJ source audit and public-figure claim-check explainer; metadata/OpenGraph/NewsArticle update; misplaced court citation in a sentence repaired. FBI Part 13 primary PDF, procedural nuances and victim-protection warnings unchanged.
- DOJ OIP full audit: shorter direct headline, summaries of what March 23 email flags do and do not establish, official 41-page DOJ PDF link, companion investigation links, metadata/OpenGraph/NewsArticle update.
- News directory: semantic source-audit cards with clear link text to both substantive original articles, complementing brief stories.
- Two source articles: optional user-initiated X share links with source-specific text and campaign utm_source=x, utm_medium=social, utm_campaign=gah_search_editorial_001. Sharing is not automatic or posted. Do not interfere with already-scheduled Oct 16–29 X queue.
- Metadata dateModified and sitemap lastmod: 2026-10-19 on the two genuinely revised articles only; original publication dates unchanged.

## Gate and measurement
Run dedicated HTML/source/metadata integrity tests, Worker syntax, all 11 Phase0 regression suites; deploy complete preserved production bundle only after those gates. Verify HTTP200, self-canonicals, indexability and original citations on actual production. Compare URL-filtered Search Console impressions, clicks, CTR, queries and position after future recrawl; traffic changes are not guaranteed. Avoid comparing wiki-dominated domain results to main-host results.

No keyword stuffing, false backlink purchases, artificial traffic, bulk AI doorway pages, exaggerated source claims, false victim/client list interpretations or public security changes.
