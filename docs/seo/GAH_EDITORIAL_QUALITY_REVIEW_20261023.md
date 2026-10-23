# Editorial quality review — October 23, 2026

Reviewed the 184 distinct URLs advertised by the main and archive sitemaps before this release. The review extracted main content, headings, metadata, paragraphs and links. Word count was used for triage, not as a quality threshold. Shared navigation, correction notices and methodological disclosures were not treated as evidence of low value on their own.

## Findings and changes

Six promoted source cards explicitly lacked verified readable document text: EFTA00035206, EFTA00035715, EFTA00035828, EFTA00579174, EFTA00579182 and EFTA00643676. Their main contribution was identifier lookup and repeated source-gap language. They now remain accessible as concise locators, use WebPage rather than Article schema, and emit matching noindex/ad-exclusion metadata and headers. No document-specific conclusions were invented to fill the gap.

Those six URLs were removed from the editorial archive sitemap and moved into the archive landing page's separately labeled awaiting-verification group alongside the four previously excluded source gaps. The main sitemap retains 155 entries; the archive sitemap now has 29. Six overlap, giving 178 distinct advertised URLs. This is not a count of Google-indexed pages.

Four short methodology guides now include practical research workflows and examples: tracing a claim through a source map, recording PDF pages and Bates footers, checking redactions, separating fields in an aviation row, and applying confidence labels to individual claims. The flight-row example is explicitly illustrative. The guides link to existing source dossiers and published analysis rather than adding new allegations.

The photos page was not empty: its content lived outside a main landmark, so the initial main-content extraction missed it. The corrected page has a main landmark, accessible input/page labels, a live status region, image alternative text, a useful description and a static verification guide with reviewed source links. Its existing API search and pagination remain in place. The old bulk-PDF count is no longer presented as the gallery introduction.

## Verification

- Real Worker routing checks: six locators remain HTTP 200 on GET/HEAD with noindex, ad exclusion and self-canonicals; the archive sitemap contains 29 entries and retains reviewed source controls.
- Gallery transform: one main landmark, stable skip target, accessible controls, static links, no-JavaScript explanation, image alternative text, idempotence and JavaScript syntax.
- Existing regressions: archive foundation/promotion/wave2 policy, HTML metadata, wiki proxy credential stripping and staging isolation, and published Trump-series routes/discovery.
- Twelve linked editorial/source-render URLs outside the sitemap returned HTTP 200 during the link check. This does not establish that every external source or every private route was audited.

The earlier wiki cache blocker was resolved after the owner applied a cache-bypass rule and purge. All twenty ordinary archive samples served the corrected utility template; three repeated wiki requests returned DYNAMIC without a cached Age header. That verification is separate from the current editorial changes.

This release does not claim completion of every possible content audit, a Google recrawl, or an AdSense approval. Existing source records and locators remain available; no public records were deleted.
