# Full re-audit — October 27, 2026

Scope: all 23 findings in the owner's [independent re-audit](https://cursor.com/canvas/store-6bd0f6da-0bdb-492e-8b5c-09f71d9880a1/27ce28b8-e96f-42a9-8fdd-c4599fd301b9), plus the listed internal-link and heading follow-ups. Baseline: `d5e2a9f`. A local pass or an origin pass does not establish that a cached public URL is current.

## Current release gate

Implementation is merged in PRs #223 and #224 and deployed as Pages `75361086` (merge `a6916b47863006e53e45c56c54218aa37eecae04`) and the immutable wiki image recorded in `wiki-production.json`. The canonical public crawl captured 338 routes and checked 334 HTML pages. It resolved 138 archive targets with zero 404/noindex targets; all 230 share images and 15 redirect probes passed. Main pages have zero published identifiers missing dossier links. **Overall acceptance remains incomplete:** cached wiki `/archive`, `/research-index` and `/not-a-real-gah-page` still serve old HTML, and P1-7 physical robots consolidation remains open. See `production-acceptance.json` for the actual failures; they have not been waived.

| ID | Acceptance criterion | Implementation / verification |
|---|---|---|
| P0-1 | Slug-promoted identifiers have indexable dossiers | Existing registry retained; 69 dossier route tests pass. |
| P0-2 | Wiki host, sitemap and canonicals agree | Existing 72-URL wiki policy retained; origin and public sitemap contracts pass. |
| P0-3 | Main/wiki reciprocal links | 69 reciprocal cards retained; direct wiki links added to remaining main pages. |
| P0-4 | Stories link their published identifiers | Shared renderer links registered published IDs; pending IDs are not promoted. |
| P0-5 | Tracker source links work | Prior direct DOJ links retained; link gate passes. |
| P1-1 | Case/padding variants redirect once | Existing normalized route gate retained. |
| P1-2 | Uniform dossiers and real review links | All 69 have the same seven H2 sections, citation section and corrected review destinations. Original source material and hashes retained. |
| P1-3 | Remove operational jargon | Tracker, dossiers, topics and black-book guide cleaned; full rendered-page checks reject known phrases. |
| P1-4 | Official PDFs precede labelled mirrors | Updated source sections on 29 reel/video pages. Current sitemap has 24 reels; the non-EFTA Raskin letter correctly uses its official congressional PDF. Captions are not rewritten. |
| P1-5 | Flagships lead; complete archive count | Six flagships first, all 69 dossiers listed, stale ten-record pending block removed. |
| P1-6 | Musk dossier has no raw OCR dump | Existing reviewed dossier retained; source gate passes. |
| P1-7 | Canonical sitemaps and one wildcard robots group | Orphan sitemap becomes a 301 to `/sitemap-efta.xml`. **Physical wildcard consolidation remains OPEN:** Cloudflare prepends a managed group and current credentials cannot change that setting. RFC 9309 and Google's specification merge matching groups, but that does not satisfy the requested physical formatting. Training and access protections remain enabled. |
| P1-8 | Methodology/Barak point to indexable canonical pages | Existing redirects retained; all 15 production redirect probes pass. |
| P1-9 | Page-specific social images | 196 reproducible page cards generated; renderer replaces shared hero/default images. Existing record-specific cards retained. |
| P1-10 | Appropriate JSON-LD and wiki OG metadata | Shared renderer supplies missing WebPage/CollectionPage entities; isolated three-hub checks pass. Public wiki archive/research-index are **pending cache purge**. Existing Article/CreativeWork entities retained. |
| P1-11 | H1 precedes section headings | Prior hub fixes retained; `/barak/entities` gets its missing H1. |
| P1-12 | Guide links and current wiki dates | Existing guide sources and October 27 wiki date retained. |
| P2-1 | Accurate homepage badge | Existing “Primary documents first” retained. |
| P2-2 | Branded generic and identifier 404s | Shared branded generic 404 with noindex; identifier-specific 404s retained; API routes excluded. Public wiki `/archive/foo` is current; `/not-a-real-gah-page` is a stale cached 404 and **pending purge**. |
| P2-3 | OG title matches title minus brand | All 334 locally rendered pages pass; public wiki research-index remains blocked by stale cache. |
| P2-4 | EFTA00000468 central dossier and story links | Existing central dossier preserved; uniform citations retain story backlinks. |
| P2-5 | Consistent single brand suffix | Shared title normalization; rebuilt citation labels remove old brand suffixes. Public wiki research-index suffix is **pending cache purge**. |
| P2-6 | Honest black-book guide without broken locator links | Rebuilt 83-ID guide: 80 official DOJ links, three explicitly unconfirmed IDs, consistent noindex,follow, useful title/OG. No links to noindex archive locators. Main legacy path redirects to wiki guide. |

## Evidence and limits

- `source-route-baseline.json` records the sanitized pre-change public route metadata; raw page captures stay outside the repository.
- `scripts/rebuild_reader_quality_20261027.py` reads immutable baseline HTML from git and regenerates the dossiers, source sections and share cards. Requires Pillow and BeautifulSoup; `GAH_CARD_FONT` can select a portable font.
- `tests/test_reader_quality_20261027.mjs` exercises the actual worker and preserves script/API behavior. Existing source, wiki, authorship, layout and link gates also pass.
- Local rendered coverage: 334 HTML pages (333 sitemap URLs plus the black-book guide), 69 identical dossier H2 sequences, zero remaining shared hero images or known public-jargon failures.
- Isolated wiki preview checks all 69 cards, three collection hubs, black-book counts/robots, two generic 404s, the 72-URL sitemap, public resolver and unauthenticated protected-API rejection. Security, authentication and request-limit files are byte-identical to production.
- Search Console indexing and official DOJ PDF availability are separate from HTML/link correctness; do not infer either from these checks.
- Production IDs, immutable image hashes and canonical crawl failures are recorded in the adjacent JSON files. Cache-busted requests and loopback origin checks have not been substituted for public acceptance.


## Remaining concrete actions

1. Purge the Cloudflare cache for `https://wiki.grokarchivehub.com/archive`, `https://wiki.grokarchivehub.com/research-index` and `https://wiki.grokarchivehub.com/not-a-real-gah-page` (or the full zone cache to clear other previously cached 404s). The existing Wrangler OAuth credentials cannot purge cache. The new gateway returns current HTML at origin, and the public black-book guide and fresh generic 404 are already current. Re-run the canonical checks after purge; do not mark the existing failure report as passed.
2. Resolve P1-7's physical wildcard grouping through authorized Cloudflare configuration while retaining crawler/training protections. Existing credentials cannot change that setting. RFC semantics alone are not recorded as physical consolidation.

Live visual inspection caught and corrected a semantic grouping gap after the initial release: standalone headings now carry their prose into the proper section, and paired grid panels are categorized separately. New tests verify that the Hold the Letter observation, source hash and evidentiary limits actually appear under their corresponding sections.
