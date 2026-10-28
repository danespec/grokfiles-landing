# Final markdown review — live acceptance, October 28, 2026

This completes the **Still open (small)** section of the uploaded revised edit list. It supersedes the earlier 120-page acceptance snapshot for current inventory. The production release is Pages **83676ff2** and wiki **gah-wiki-gateway:adsense-final-polish-20261027**. Source PR: [#252](https://github.com/danespec/grokfiles-landing/pull/252). This is not an AdSense approval claim.

## Seven named prose shortfalls

Added distinct explanations grounded in the existing page records: separate July watch-status rows and dates; distinguish the attorney-log artifact ID, page footer and proposed name match; attribute OIG findings separately from underlying records; delimit the August 11 autopsy reference; distinguish CH0080 file intervals from video coverage; explain editorial responsibility; and make public research submissions more checkable. The autopsy and camera articles no longer repeat their ledes as the Claim paragraph. No newly retrieved or authenticated records are claimed.

| Page | Strict unique block words | Existing unique-shingle words |
|---|---:|---:|
| [/archive/EFTA00039660](https://grokarchivehub.com/archive/EFTA00039660) | 385 | 726 |
| [/archive/EFTA00035147](https://grokarchivehub.com/archive/EFTA00035147) | 376 | 736 |
| [/archive/EFTA00039025](https://grokarchivehub.com/archive/EFTA00039025) | 434 | 779 |
| [/investigations/autopsy-exhibit-list-limits](https://grokarchivehub.com/investigations/autopsy-exhibit-list-limits) | 415 | 651 |
| [/investigations/ch0080-video-file-windows](https://grokarchivehub.com/investigations/ch0080-video-file-windows) | 419 | 642 |
| [/about](https://grokarchivehub.com/about) | 441 | 849 |
| [/community](https://grokarchivehub.com/community) | 444 | 912 |

A conservative whole-block screen also found eight additional borderline pages: EFTA00013764 and the Musk, Bannon, Dershowitz, Gates/Nikolic, Brunel, Hoffman and Bezos reels. Each received distinct context about its own existing email, schedule or source fields. All remain indexable; the extra work did not remove substantive stories to pass the screen.

## Receipt canonical decisions

All **29** formerly mixed destination choices are resolved. **15** receipt/dossier pairs now point directly to their cited indexable article. **14** source-only wiki cards remain **noindex,follow** and self-canonical because there is no equivalent indexed article to own that record. Assigning a merely related story would misstate equivalence. These are intentional source aids, not unresolved indexing candidates. Every non-self receipt canonical was checked against a 200, self-canonical, indexable destination. None points at a noindex target or through a canonical chain.

See [all 29 decisions](adsense-final-receipt-decisions.json). All **69** wiki receipts remain accessible and noindex in both the meta tag and response header; none is in a sitemap.

## Listing hubs

The /latest, /forum, /topics, /barak/receipts, /barak/entities and /barak/source-map hubs now return **noindex,follow** in meta and header and are excluded from the sitemap. Their public navigation and source access remain available. The resulting inventory is **114** indexable pages: **107** main editorial pages, **5** main dossiers and **2** wiki investigations. Sitemap and indexable sets match exactly.

## Live verification

- Fresh linked crawl: **1086 routes**, **999 HTML 200 responses**, completed **2026-10-28T16:45:27.673045+00:00**. No unexpected HTTP failures or indexable pages missing from sitemaps.
- **114/114** indexable pages meet 300 words under both documented screens; strict minimum **300**. Zero duplicate titles, descriptions or indexable bodies; zero robots meta/header mismatches.
- Fresh HEAD checks: **90 URLs**, covering all 69 wiki receipts, the six hubs and 15 edited pages. Main artifact, live wiki and source publication-policy hashes match.
- The live asset/reader regression checker passed with no failures, including source signatures/hashes, missing-file 404s, manuscript acknowledgement and reader APIs. Full per-asset results are included in the JSON record.
- All eight local regression gates and GitHub identifier-gate CI passed. Wiki preview and production checks preserve the existing security/authentication/rate-limit guard hashes and rollback container.

The fresh crawl ran after both host releases. The strict screen counts paragraph/list blocks of at least 20 words that occur on only one indexable page, once each, excluding interface text and repeated Claim/Bias/Silence/Confidence labels. The earlier screen removes words in repeated 12-word sequences. The supplied reviewer raw crawl was not attached, so these are reproducible independent implementations, not a claim to run Grok's exact code. Word count is an audit heuristic, not a Google rule or a substitute for editorial judgment.

[Complete per-URL proof, both word counts, canonicals, HEAD and asset checks](adsense-final-polish-live.json).

## Remaining non-code step

Allow the requested 2–4 weeks for recrawl before seeking another AdSense review, and check the resulting indexing state. Search-engine recrawl timing and review decisions are outside this deployment. No AdSense review was submitted.
