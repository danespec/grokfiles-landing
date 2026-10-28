# October 28 AdSense content-consolidation acceptance

This report addresses the supplied `adsense-edit-list.md`. It records the changes and observed checks; it does not claim Google approval or describe the requested 300-word threshold as a Google rule. No AdSense review request was submitted.

Production: Pages `7932a1da`; wiki `gah-wiki-gateway:adsense-final-index-20261027`, immutable image `sha256:6f24c288bdecd8e6d55224793b5d2c610196902b774e9b4c53d2c47d8bfdb1e9`.

Source releases: [#248](https://github.com/danespec/grokfiles-landing/pull/248), [#249](https://github.com/danespec/grokfiles-landing/pull/249), [#250](https://github.com/danespec/grokfiles-landing/pull/250). Contact correction: [#247](https://github.com/danespec/grokfiles-landing/pull/247). Full response evidence: [adsense-live-acceptance.json](adsense-live-acceptance.json).

## Captured output

```text
Baseline indexable inventory: 336
Final indexable inventory: 120
Sitemaps: {'https://grokarchivehub.com/sitemap.xml': 113, 'https://grokarchivehub.com/sitemap-efta.xml': 5, 'https://wiki.grokarchivehub.com/sitemap.xml': 2}
Pages with fewer than 300 unique prose words: 0
Minimum unique prose count: 310
Duplicate title groups: 0
Duplicate description groups: 0
Duplicate indexable body groups: 0
Meta/header robots mismatches: 0
Indexable archive/wiki/reel triple copies: 0
Wiki receipt cards accessible and noindex: 69; receipt URLs in wiki sitemap: 0
Verified linked evidence/data assets: 206
Verified linked PDF signatures and SHA-256 values: 49
Direct missing-asset 404 probes: 15
Contact mailto links: 2
Failures: 0
```

The final sitemaps contain 113 main editorial URLs, five substantive dossier URLs and two wiki investigations. All 120 sitemap URLs return 200, are indexable and self-canonical; the indexable URL set equals the sitemap set.

## Acceptance checklist

| Requested check | Result |
|---|---|
| Every indexable HTML page has at least 300 unique prose words | PASS under the documented repeatable screen below; all per-URL counts are listed. |
| No duplicate indexable bodies or archive/wiki/reel triple copies | PASS; all receipt twins and selected story companions are noindex, with explicit prose-home canonicals. |
| Wiki receipts removed from search inventory and sitemap | PASS; 69 remain 200 with noindex in meta and header; wiki sitemap contains only the two substantive investigations. |
| Thin archive IDs removed from sitemap | PASS; all 47 named thin IDs are noindex. Only five substantive ID pages remain in sitemap-efta. |
| Directory shells noindex | PASS; the named main and wiki shells remain accessible with noindex. |
| Motherlode research process pages not padded | PASS; the four named process pages are noindex, with source access preserved. |
| Contact has a real published email action | PASS; both mailto actions point to the existing grokcloudflare@gmail.com address. No message was sent and mailbox delivery was not tested. |
| Evidence and book assets do not serve homepage fallbacks | PASS; linked assets, arbitrary missing paths, manuscript bytes and reader JSON responses were checked. |
| Initial search inventory reaches the suggested 80–120 range | PASS; 120 pages. |

## Editorial work and consolidation

Expanded the GADECO investigation, FBI classification brief, Saudi fund proposal, MCC attribution correction, DOJ review-email story, redaction methodology, MCC memorandum dossier and flight-log correction introduction using the records and limits already described on those pages. The distinct GADECO earnings-disclosure and valuation paragraphs were moved into the investigation; its short news companion is noindex and canonical to that home. The redaction guide now links its second worked example directly to the official EFTA02730468 PDF already cited by the FBI brief.

Expanded the source-specific readings on the eight reel pages identified by preview measurement as borderline, separating draft circulation from execution, proposed itineraries from travel, calendar entries from attendance, email recipients from replies, third-party mentions from contact, and publication listings from disputed production histories. Original captions remain explicitly historical and source limitations remain attached. These are editorial interpretations of previously described records, not claims of new retrieval or newly authenticated primary documents.

St. Thomas and Ryan/Thiel companions now have one designated substantive home. Phang, the autopsy exhibit, CH0080 and August 8 source-chain companions use their selected article homes. Source dossiers and receipts remain accessible rather than being deleted.

### Two source-based choices that resolve conflicts in the edit list

- EFTA02300238 is assigned to the Hoffman logistics reel, not the December Barak trip. Its existing source-specific record describes a November 28 email about proposed November 30 travel. The cloned December-trip label was corrected in the visible dossier/receipt context, registry and editorial metadata; the separate December-trip investigation owns its actual trip cluster. No new byte comparison against DOJ is claimed.
- The existing `/news/efta00000468-removal-restoration-audit` owns the removal/restoration chronology. It already has the detailed source trail and 843 unique prose words in the preview screen. The dossier, wiki receipt and short explainer are noindex and canonical to that substantive article rather than maintaining another competing prose home.

### Initial editorial holds

38 additional articles with at least 300 screened unique words were placed on reversible noindex holds to reach the owner’s initial inventory target. This is editorial prioritization, not a claim that those pages violate Google policy or are under 300 words. Designated substantive canonical homes, all requested expansions, the five retained dossier pages and the two wiki investigations were protected; the remaining candidates were ranked by unique prose depth. The exact decisions and counts are in [adsense-editorial-holds.json](adsense-editorial-holds.json). Three dynamically included supporting video pages were also excluded after the live crawl found them beyond the static preview count. All remain available to readers.

## Method and timing

Paragraph/list prose excluding navigation, tables, code and repeated template labels; words in 12-word sequences shared by multiple indexable pages excluded. Audit heuristic, not a Google word-count requirement.

The initial fresh linked crawl checked 1086 distinct routes and captured 999 HTML 200 responses at 2026-10-28T14:32:30.325141+00:00. It found 123 indexable pages, all clearing the prose screen. After the three media exclusions and the explicit methodology citation link, the four changed responses were fetched again with GET and HEAD at 2026-10-28T14:38:42.588007+00:00; their updated captures were used to rerun the complete metadata/prose analysis and compare fresh live sitemaps. Unchanged response captures were retained; this is not presented as a second full recrawl after the last deployment.

The unique-prose calculation is an auditable heuristic: it excludes navigation, tables, code, repeated template labels and words belonging to 12-word sequences shared across indexable pages. It is not a semantic judgment of journalistic value, and another reviewer may count differently. Exact source/receipt semantics and confidentiality limits were preserved through the tests.

The former requirement that Barak hub links mostly lead to indexable pages was superseded by this edit list’s instruction to deindex thin directories and source aids. The asset-regression JSON reports those two old hub-ratio checks as superseded, not passed; the new noindex/canonical/source-access gates are independently checked.

## Remaining indexable pages and unique prose counts

| URL | Unique prose words | Total screened prose words |
|---|---:|---:|
| https://grokarchivehub.com/ | 926 | 926 |
| https://grokarchivehub.com/about | 581 | 653 |
| https://grokarchivehub.com/archive-scope | 739 | 739 |
| https://grokarchivehub.com/archive/EFTA00013764 | 386 | 413 |
| https://grokarchivehub.com/archive/EFTA00035147 | 512 | 512 |
| https://grokarchivehub.com/archive/EFTA00035574 | 493 | 493 |
| https://grokarchivehub.com/archive/EFTA00039025 | 582 | 582 |
| https://grokarchivehub.com/archive/EFTA00039660 | 507 | 507 |
| https://grokarchivehub.com/barak/entities | 855 | 1018 |
| https://grokarchivehub.com/barak/receipts | 688 | 742 |
| https://grokarchivehub.com/barak/source-map | 689 | 739 |
| https://grokarchivehub.com/book-of-black/methodology | 630 | 630 |
| https://grokarchivehub.com/community | 680 | 680 |
| https://grokarchivehub.com/corrections | 644 | 691 |
| https://grokarchivehub.com/corrections/flight-log-count-and-aircraft-reconciliation | 445 | 445 |
| https://grokarchivehub.com/dispatches/august-8-attorney-log-colon-miro | 575 | 600 |
| https://grokarchivehub.com/dispatches/doe-v-black-october-2026-dismissal | 1100 | 1100 |
| https://grokarchivehub.com/dispatches/epstein-source-watch-october-2026 | 770 | 770 |
| https://grokarchivehub.com/dispatches/fara-leads-explained | 702 | 739 |
| https://grokarchivehub.com/dispatches/how-to-read-the-barak-records | 899 | 963 |
| https://grokarchivehub.com/document-autopsies/doug-band-transcript | 605 | 641 |
| https://grokarchivehub.com/evidence-briefs | 789 | 881 |
| https://grokarchivehub.com/evidence-briefs/adfin-southern-trust-series-a-2013 | 869 | 887 |
| https://grokarchivehub.com/evidence-briefs/coinbase-return-first-15m-exit | 770 | 800 |
| https://grokarchivehub.com/evidence-briefs/efta02810827-amador-jpmorgan-forensic-report | 1048 | 1048 |
| https://grokarchivehub.com/evidence-briefs/fbi-epstein-not-evidentiary-scrub | 528 | 528 |
| https://grokarchivehub.com/evidence-briefs/financial-trust-black-family-partners-2012 | 738 | 778 |
| https://grokarchivehub.com/evidence-briefs/honeycomb-spv-spotify-tencent-music | 877 | 907 |
| https://grokarchivehub.com/evidence-briefs/jpmorgan-4725-wires-1-1-billion-explainer | 744 | 782 |
| https://grokarchivehub.com/evidence-briefs/kyara-i-unresolved-profitable-spv | 705 | 719 |
| https://grokarchivehub.com/evidence-briefs/kyara-spv-wearality-blockstream-oh2 | 759 | 804 |
| https://grokarchivehub.com/evidence-briefs/leon-black-158m-170m-epstein-payments | 815 | 834 |
| https://grokarchivehub.com/evidence-briefs/levitection-signed-term-sheet-no-close | 841 | 855 |
| https://grokarchivehub.com/evidence-briefs/mcc-4chan-two-posters-attribution-audit | 502 | 502 |
| https://grokarchivehub.com/evidence-briefs/michael-chertoff-reporty-advisory-agreement | 988 | 1000 |
| https://grokarchivehub.com/evidence-briefs/neoteny-3-fund-subscription-no-portfolio-attribution | 755 | 769 |
| https://grokarchivehub.com/evidence-briefs/ng911-email-planned-fcc-meetings-no-proven-access-chain | 909 | 909 |
| https://grokarchivehub.com/evidence-briefs/reporty-southern-trust-ergo-1m-2015 | 982 | 982 |
| https://grokarchivehub.com/evidence-briefs/shared-administration-no-money-crossover | 889 | 915 |
| https://grokarchivehub.com/evidence-briefs/todd-blanche-no-evidence | 925 | 942 |
| https://grokarchivehub.com/forum | 1365 | 1365 |
| https://grokarchivehub.com/investigations | 1193 | 1533 |
| https://grokarchivehub.com/investigations/andrew-search-warrants-quashed-2026-doj-judicial-review | 982 | 1001 |
| https://grokarchivehub.com/investigations/andriesz-adfin-lutnick-paper-trail | 2626 | 2626 |
| https://grokarchivehub.com/investigations/autopsy-exhibit-list-limits | 430 | 443 |
| https://grokarchivehub.com/investigations/barak-epstein-putin-qatar-carbyne | 2050 | 2093 |
| https://grokarchivehub.com/investigations/barak-gadeco-fee-2014 | 675 | 675 |
| https://grokarchivehub.com/investigations/barak-hfa-cycurity-2015 | 1147 | 1147 |
| https://grokarchivehub.com/investigations/barak-saudi-rothschild-proposal-2015 | 445 | 445 |
| https://grokarchivehub.com/investigations/barak-scheduling-records-2010-2018 | 1261 | 1261 |
| https://grokarchivehub.com/investigations/barak-st-thomas-dec-2014 | 2395 | 2506 |
| https://grokarchivehub.com/investigations/black-family-partners-18m-to-5-5m-repricing | 1094 | 1112 |
| https://grokarchivehub.com/investigations/black-family-partners-financial-trust-esww-sale | 1139 | 1157 |
| https://grokarchivehub.com/investigations/black-family-partners-source-of-funds-gap | 1021 | 1021 |
| https://grokarchivehub.com/investigations/black-phaidon-2015-tax-model-house-oversight | 663 | 701 |
| https://grokarchivehub.com/investigations/ch0080-video-file-windows | 422 | 435 |
| https://grokarchivehub.com/investigations/clinton-foundation-cgi-epstein-source-audit | 1129 | 1142 |
| https://grokarchivehub.com/investigations/darren-indyke-investment-execution-layer | 990 | 1047 |
| https://grokarchivehub.com/investigations/doj-oip-epstein-review-public-figure-flags-2026 | 707 | 727 |
| https://grokarchivehub.com/investigations/efta-compliance-tracker | 1016 | 1082 |
| https://grokarchivehub.com/investigations/epstein-december-6-7-2007-decision-gap | 865 | 924 |
| https://grokarchivehub.com/investigations/epstein-july-2007-decision-gap | 1072 | 1097 |
| https://grokarchivehub.com/investigations/epstein-npa-defense-access-victim-notification | 628 | 659 |
| https://grokarchivehub.com/investigations/epstein-wolff-trump-cnn-emails-2015 | 645 | 788 |
| https://grokarchivehub.com/investigations/fbi-vault-redaction-chronology-phang | 1000 | 1046 |
| https://grokarchivehub.com/investigations/financial-trust-environmental-solutions-worldwide | 1704 | 1734 |
| https://grokarchivehub.com/investigations/george-mitchell-epstein-source-audit | 1204 | 1204 |
| https://grokarchivehub.com/investigations/giuffre-maxwell-docket-1320-privilege-gap | 2057 | 2069 |
| https://grokarchivehub.com/investigations/gratitude-america-money-trail-2015-2019 | 1775 | 1775 |
| https://grokarchivehub.com/investigations/hold-the-letter | 602 | 645 |
| https://grokarchivehub.com/investigations/jpmorgan-nine-sars-epstein | 1097 | 1122 |
| https://grokarchivehub.com/investigations/leon-black-2023-sdny-referral-status | 615 | 615 |
| https://grokarchivehub.com/investigations/new-mexico-doj-epstein-records | 929 | 995 |
| https://grokarchivehub.com/investigations/new-mexico-indyke-kahn-financial-network-2026 | 949 | 971 |
| https://grokarchivehub.com/investigations/nikolic-gates-epstein-bridge | 1011 | 1030 |
| https://grokarchivehub.com/investigations/norway-brende-epstein-hearing-2026 | 940 | 940 |
| https://grokarchivehub.com/investigations/sascha-riley-claims-evidence-audit | 1820 | 1820 |
| https://grokarchivehub.com/investigations/truesec-il-energy-twin-spvs-2013 | 787 | 799 |
| https://grokarchivehub.com/investigations/trump-2015-campaign-records | 654 | 1055 |
| https://grokarchivehub.com/investigations/trump-acosta-epstein-doj-timeline | 636 | 833 |
| https://grokarchivehub.com/investigations/trump-israel-russia-un-vote-2016 | 782 | 952 |
| https://grokarchivehub.com/investigations/trump-moscow-deal-campaign-2015-2016 | 640 | 806 |
| https://grokarchivehub.com/investigations/wyden-banker-302-deutsche-interviews | 1674 | 1674 |
| https://grokarchivehub.com/latest | 4376 | 4774 |
| https://grokarchivehub.com/methodology/digitization-ocr-pipeline | 620 | 620 |
| https://grokarchivehub.com/methodology/redaction-breadcrumbs | 472 | 499 |
| https://grokarchivehub.com/news/doj-march-2025-review-emails-released | 359 | 371 |
| https://grokarchivehub.com/news/efta00000468-removal-restoration-audit | 843 | 843 |
| https://grokarchivehub.com/news/house-judiciary-trump-epstein-staff-report-oct26-2026 | 668 | 668 |
| https://grokarchivehub.com/news/maurene-comey-unlawful-firing-ruling-oct26-2026 | 723 | 723 |
| https://grokarchivehub.com/news/phang-fbi-notes-in-camera-october-16 | 354 | 392 |
| https://grokarchivehub.com/news/raskin-epstein-state-foreign-mlat-oversight-2026 | 767 | 767 |
| https://grokarchivehub.com/privacy | 786 | 801 |
| https://grokarchivehub.com/reels/alan-dershowitz-schedule-efta00352969 | 310 | 406 |
| https://grokarchivehub.com/reels/andrew-doj-judicial-review-efta00088020 | 369 | 496 |
| https://grokarchivehub.com/reels/bill-gates-nikolic-points-efta02730265 | 327 | 442 |
| https://grokarchivehub.com/reels/bill-richardson-counsel-memo-efta00014374 | 357 | 477 |
| https://grokarchivehub.com/reels/efta00035613-july-2019-donation-proposal | 356 | 504 |
| https://grokarchivehub.com/reels/efta00035773-oig-voluntary-interview-waiver | 384 | 532 |
| https://grokarchivehub.com/reels/efta00035828-epstein-cell-diagram | 411 | 559 |
| https://grokarchivehub.com/reels/elon-musk-holiday-email-efta02338119 | 338 | 434 |
| https://grokarchivehub.com/reels/ghislaine-maxwell-travel-coordination-efta02332402 | 357 | 467 |
| https://grokarchivehub.com/reels/indyke-kahn-civil-complaint-flight-records | 371 | 501 |
| https://grokarchivehub.com/reels/jean-luc-brunel-mc2-account-efta01972778 | 325 | 445 |
| https://grokarchivehub.com/reels/jeff-bezos-email-list-efta00759004 | 373 | 483 |
| https://grokarchivehub.com/reels/larry-summers-harvard-planning-efta02239873 | 393 | 489 |
| https://grokarchivehub.com/reels/leon-black-dechert-158-million-efta02730996 | 392 | 507 |
| https://grokarchivehub.com/reels/les-wexner-attorney-proffer-efta02731082 | 424 | 520 |
| https://grokarchivehub.com/reels/mark-zuckerberg-mentions-efta00034221 | 385 | 481 |
| https://grokarchivehub.com/reels/reid-hoffman-island-logistics-efta02300238 | 367 | 463 |
| https://grokarchivehub.com/reels/shawn-ryan-peter-thiel-account-response | 748 | 860 |
| https://grokarchivehub.com/reels/stephen-hawking-email-request-efta00695049 | 368 | 478 |
| https://grokarchivehub.com/reels/steve-bannon-barak-calendar-efta02240144 | 338 | 434 |
| https://grokarchivehub.com/research/epstein-final-48-hours-mcc | 735 | 773 |
| https://grokarchivehub.com/research/evidence/birthday-book | 807 | 807 |
| https://grokarchivehub.com/research/evidence/epstein-death | 2468 | 2542 |
| https://grokarchivehub.com/topics | 1010 | 1070 |
| https://grokarchivehub.com/visual-evidence | 613 | 640 |
| https://wiki.grokarchivehub.com/research/ehud-barak-epstein-documentary-record | 1983 | 1999 |
| https://wiki.grokarchivehub.com/research/trump-epstein-documented-timeline | 2156 | 2172 |

## Canonical and noindex decisions

| URL | HTTP | Meta / header robots | Canonical | Reason |
|---|---:|---|---|---|
| https://wiki.grokarchivehub.com/receipts/EFTA00000468 | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/news/efta00000468-removal-restoration-audit | The existing detailed removal/restoration audit owns this chronology; retain source and explainer access |
| https://wiki.grokarchivehub.com/receipts/EFTA00007893 | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/reels/ghislaine-maxwell-travel-coordination-efta02332402 | Duplicate receipt; main-site page owns the prose |
| https://wiki.grokarchivehub.com/receipts/EFTA00013764 | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/archive/EFTA00013764 | Duplicate receipt; main-site page owns the prose |
| https://wiki.grokarchivehub.com/receipts/EFTA00014374 | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/reels/bill-richardson-counsel-memo-efta00014374 | Duplicate receipt; main-site page owns the prose |
| https://wiki.grokarchivehub.com/receipts/EFTA00016622 | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/reels/indyke-kahn-civil-complaint-flight-records | Duplicate receipt; main-site page owns the prose |
| https://wiki.grokarchivehub.com/receipts/EFTA00022062 | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/reels/andrew-doj-judicial-review-efta00088020 | Duplicate receipt; main-site page owns the prose |
| https://wiki.grokarchivehub.com/receipts/EFTA00033413 | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/archive/EFTA00033413 | Duplicate receipt; main-site page owns the prose |
| https://wiki.grokarchivehub.com/receipts/EFTA00034221 | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/reels/mark-zuckerberg-mentions-efta00034221 | Duplicate receipt; main-site page owns the prose |
| https://wiki.grokarchivehub.com/receipts/EFTA00035035 | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/archive/EFTA00035035 | Duplicate receipt; main-site page owns the prose |
| https://wiki.grokarchivehub.com/receipts/EFTA00035053 | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/archive/EFTA00035053 | Duplicate receipt; main-site page owns the prose |
| https://wiki.grokarchivehub.com/receipts/EFTA00035119 | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/archive/EFTA00035119 | Duplicate receipt; main-site page owns the prose |
| https://wiki.grokarchivehub.com/receipts/EFTA00035147 | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/archive/EFTA00035147 | Duplicate receipt; main-site page owns the prose |
| https://wiki.grokarchivehub.com/receipts/EFTA00035420 | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/archive/EFTA00035420 | Duplicate receipt; main-site page owns the prose |
| https://wiki.grokarchivehub.com/receipts/EFTA00035421 | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/archive/EFTA00035421 | Duplicate receipt; main-site page owns the prose |
| https://wiki.grokarchivehub.com/receipts/EFTA00035442 | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/archive/EFTA00035442 | Duplicate receipt; main-site page owns the prose |
| https://wiki.grokarchivehub.com/receipts/EFTA00035570 | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/archive/EFTA00035570 | Duplicate receipt; main-site page owns the prose |
| https://wiki.grokarchivehub.com/receipts/EFTA00035574 | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/archive/EFTA00035574 | Duplicate receipt; main-site page owns the prose |
| https://wiki.grokarchivehub.com/receipts/EFTA00035613 | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/reels/efta00035613-july-2019-donation-proposal | Duplicate receipt; main-site page owns the prose |
| https://wiki.grokarchivehub.com/receipts/EFTA00035657 | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/archive/EFTA00035657 | Duplicate receipt; main-site page owns the prose |
| https://wiki.grokarchivehub.com/receipts/EFTA00035773 | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/reels/efta00035773-oig-voluntary-interview-waiver | Duplicate receipt; main-site page owns the prose |
| https://wiki.grokarchivehub.com/receipts/EFTA00035828 | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/reels/efta00035828-epstein-cell-diagram | Duplicate receipt; main-site page owns the prose |
| https://wiki.grokarchivehub.com/receipts/EFTA00039025 | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/archive/EFTA00039025 | Duplicate receipt; main-site page owns the prose |
| https://wiki.grokarchivehub.com/receipts/EFTA00039356 | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/investigations/autopsy-exhibit-list-limits | Duplicate receipt; main-site page owns the prose |
| https://wiki.grokarchivehub.com/receipts/EFTA00039416 | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/investigations/ch0080-video-file-windows | Duplicate receipt; main-site page owns the prose |
| https://wiki.grokarchivehub.com/receipts/EFTA00039660 | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/archive/EFTA00039660 | Duplicate receipt; main-site page owns the prose |
| https://wiki.grokarchivehub.com/receipts/EFTA00080260 | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/archive/EFTA00080260 | Duplicate receipt; main-site page owns the prose |
| https://wiki.grokarchivehub.com/receipts/EFTA00088020 | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/reels/andrew-doj-judicial-review-efta00088020 | Duplicate receipt; main-site page owns the prose |
| https://wiki.grokarchivehub.com/receipts/EFTA00128841 | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/archive/EFTA00128841 | Duplicate receipt; main-site page owns the prose |
| https://wiki.grokarchivehub.com/receipts/EFTA00153569 | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/archive/EFTA00153569 | Duplicate receipt; main-site page owns the prose |
| https://wiki.grokarchivehub.com/receipts/EFTA00176507 | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/archive/EFTA00176507 | Duplicate receipt; main-site page owns the prose |
| https://wiki.grokarchivehub.com/receipts/EFTA00224262 | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/archive/EFTA00224262 | Duplicate receipt; main-site page owns the prose |
| https://wiki.grokarchivehub.com/receipts/EFTA00338082 | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/reels/alan-dershowitz-schedule-efta00352969 | Duplicate receipt; main-site page owns the prose |
| https://wiki.grokarchivehub.com/receipts/EFTA00352969 | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/reels/alan-dershowitz-schedule-efta00352969 | Duplicate receipt; main-site page owns the prose |
| https://wiki.grokarchivehub.com/receipts/EFTA00356456 | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/investigations/barak-st-thomas-dec-2014 | Duplicate receipt; main-site page owns the prose |
| https://wiki.grokarchivehub.com/receipts/EFTA00646811 | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/archive/EFTA00646811 | Duplicate receipt; main-site page owns the prose |
| https://wiki.grokarchivehub.com/receipts/EFTA00695049 | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/reels/stephen-hawking-email-request-efta00695049 | Duplicate receipt; main-site page owns the prose |
| https://wiki.grokarchivehub.com/receipts/EFTA00759004 | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/reels/jeff-bezos-email-list-efta00759004 | Duplicate receipt; main-site page owns the prose |
| https://wiki.grokarchivehub.com/receipts/EFTA00962798 | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/reels/jean-luc-brunel-mc2-account-efta01972778 | Duplicate receipt; main-site page owns the prose |
| https://wiki.grokarchivehub.com/receipts/EFTA01410768 | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/archive/EFTA01410768 | Duplicate receipt; main-site page owns the prose |
| https://wiki.grokarchivehub.com/receipts/EFTA01703108 | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/archive/EFTA01703108 | Duplicate receipt; main-site page owns the prose |
| https://wiki.grokarchivehub.com/receipts/EFTA01972778 | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/reels/jean-luc-brunel-mc2-account-efta01972778 | Duplicate receipt; main-site page owns the prose |
| https://wiki.grokarchivehub.com/receipts/EFTA02213201 | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/reels/indyke-kahn-civil-complaint-flight-records | Duplicate receipt; main-site page owns the prose |
| https://wiki.grokarchivehub.com/receipts/EFTA02239649 | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/reels/larry-summers-harvard-planning-efta02239873 | Duplicate receipt; main-site page owns the prose |
| https://wiki.grokarchivehub.com/receipts/EFTA02239873 | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/reels/larry-summers-harvard-planning-efta02239873 | Duplicate receipt; main-site page owns the prose |
| https://wiki.grokarchivehub.com/receipts/EFTA02240144 | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/reels/steve-bannon-barak-calendar-efta02240144 | Duplicate receipt; main-site page owns the prose |
| https://wiki.grokarchivehub.com/receipts/EFTA02262778 | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/reels/mark-zuckerberg-mentions-efta00034221 | Duplicate receipt; main-site page owns the prose |
| https://wiki.grokarchivehub.com/receipts/EFTA02300238 | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/reels/reid-hoffman-island-logistics-efta02300238 | November 2014 Hoffman travel-planning record; not evidence for the separate December Barak trip |
| https://wiki.grokarchivehub.com/receipts/EFTA02332402 | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/reels/ghislaine-maxwell-travel-coordination-efta02332402 | Duplicate receipt; main-site page owns the prose |
| https://wiki.grokarchivehub.com/receipts/EFTA02338119 | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/reels/elon-musk-holiday-email-efta02338119 | Duplicate receipt; main-site page owns the prose |
| https://wiki.grokarchivehub.com/receipts/EFTA02346686 | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/investigations/barak-st-thomas-dec-2014 | Duplicate receipt; main-site page owns the prose |
| https://wiki.grokarchivehub.com/receipts/EFTA02596796 | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/investigations/barak-st-thomas-dec-2014 | Duplicate receipt; main-site page owns the prose |
| https://wiki.grokarchivehub.com/receipts/EFTA02656769 | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/reels/shawn-ryan-peter-thiel-account-response | Duplicate receipt; main-site page owns the prose |
| https://wiki.grokarchivehub.com/receipts/EFTA02662212 | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/reels/bill-richardson-counsel-memo-efta00014374 | Duplicate receipt; main-site page owns the prose |
| https://wiki.grokarchivehub.com/receipts/EFTA02730265 | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/reels/bill-gates-nikolic-points-efta02730265 | Duplicate receipt; main-site page owns the prose |
| https://wiki.grokarchivehub.com/receipts/EFTA02730996 | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/reels/leon-black-dechert-158-million-efta02730996 | Duplicate receipt; main-site page owns the prose |
| https://wiki.grokarchivehub.com/receipts/EFTA02731023 | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/reels/leon-black-dechert-158-million-efta02730996 | Duplicate receipt; main-site page owns the prose |
| https://wiki.grokarchivehub.com/receipts/EFTA02731082 | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/reels/les-wexner-attorney-proffer-efta02731082 | Duplicate receipt; main-site page owns the prose |
| https://wiki.grokarchivehub.com/receipts/EFTA02810827 | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/archive/EFTA02810827 | Duplicate receipt; main-site page owns the prose |
| https://wiki.grokarchivehub.com/receipts/EFTA02858481 | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/archive/EFTA02858481 | Duplicate receipt; main-site page owns the prose |
| https://wiki.grokarchivehub.com/receipts/EFTA02858491 | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/archive/EFTA02858491 | Duplicate receipt; main-site page owns the prose |
| https://wiki.grokarchivehub.com/receipts/EFTA00035206 | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/archive/EFTA00035206 | Duplicate receipt; main-site page owns the prose |
| https://wiki.grokarchivehub.com/receipts/EFTA00035715 | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/archive/EFTA00035715 | Duplicate receipt; main-site page owns the prose |
| https://wiki.grokarchivehub.com/receipts/EFTA00153570 | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/archive/EFTA00153570 | Duplicate receipt; main-site page owns the prose |
| https://wiki.grokarchivehub.com/receipts/EFTA00153571 | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/archive/EFTA00153571 | Duplicate receipt; main-site page owns the prose |
| https://wiki.grokarchivehub.com/receipts/EFTA00579174 | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/archive/EFTA00579174 | Duplicate receipt; main-site page owns the prose |
| https://wiki.grokarchivehub.com/receipts/EFTA00579182 | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/archive/EFTA00579182 | Duplicate receipt; main-site page owns the prose |
| https://wiki.grokarchivehub.com/receipts/EFTA00643676 | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/archive/EFTA00643676 | Duplicate receipt; main-site page owns the prose |
| https://wiki.grokarchivehub.com/receipts/EFTA00704168 | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/archive/EFTA00704168 | Duplicate receipt; main-site page owns the prose |
| https://wiki.grokarchivehub.com/receipts/EFTA01245620 | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/archive/EFTA01245620 | Duplicate receipt; main-site page owns the prose |
| https://grokarchivehub.com/barak | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/barak | Navigation directory or utility, not a substantive article |
| https://grokarchivehub.com/document-autopsies | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/document-autopsies | Navigation directory or utility, not a substantive article |
| https://grokarchivehub.com/archive/EFTA00007893 | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/reels/ghislaine-maxwell-travel-coordination-efta02332402 | Source locator supporting the chosen prose home |
| https://grokarchivehub.com/archive/EFTA01972778 | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/reels/jean-luc-brunel-mc2-account-efta01972778 | Source locator supporting the chosen prose home |
| https://grokarchivehub.com/archive/EFTA02213201 | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/reels/indyke-kahn-civil-complaint-flight-records | Source locator supporting the chosen prose home |
| https://grokarchivehub.com/archive/EFTA00016622 | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/reels/indyke-kahn-civil-complaint-flight-records | Source locator supporting the chosen prose home |
| https://grokarchivehub.com/archive/EFTA02332402 | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/reels/ghislaine-maxwell-travel-coordination-efta02332402 | Source locator supporting the chosen prose home |
| https://grokarchivehub.com/archive/EFTA00338082 | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/reels/alan-dershowitz-schedule-efta00352969 | Source locator supporting the chosen prose home |
| https://grokarchivehub.com/archive/EFTA00352969 | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/reels/alan-dershowitz-schedule-efta00352969 | Source locator supporting the chosen prose home |
| https://grokarchivehub.com/archive/EFTA00695049 | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/reels/stephen-hawking-email-request-efta00695049 | Source locator supporting the chosen prose home |
| https://grokarchivehub.com/archive/EFTA00759004 | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/reels/jeff-bezos-email-list-efta00759004 | Source locator supporting the chosen prose home |
| https://grokarchivehub.com/archive/EFTA02338119 | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/reels/elon-musk-holiday-email-efta02338119 | Source locator supporting the chosen prose home |
| https://grokarchivehub.com/archive/EFTA02239649 | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/reels/larry-summers-harvard-planning-efta02239873 | Source locator supporting the chosen prose home |
| https://grokarchivehub.com/archive/EFTA02239873 | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/reels/larry-summers-harvard-planning-efta02239873 | Source locator supporting the chosen prose home |
| https://grokarchivehub.com/archive/EFTA02731082 | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/reels/les-wexner-attorney-proffer-efta02731082 | Source locator supporting the chosen prose home |
| https://grokarchivehub.com/archive/EFTA02240144 | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/reels/steve-bannon-barak-calendar-efta02240144 | Source locator supporting the chosen prose home |
| https://wiki.grokarchivehub.com/research-index | 200 | noindex,follow / noindex,follow | https://wiki.grokarchivehub.com/research-index | Research directory; preserve access without presenting it as an article |
| https://grokarchivehub.com/archive/EFTA02262778 | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/reels/mark-zuckerberg-mentions-efta00034221 | Source locator supporting the chosen prose home |
| https://grokarchivehub.com/archive/EFTA00014374 | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/reels/bill-richardson-counsel-memo-efta00014374 | Source locator supporting the chosen prose home |
| https://grokarchivehub.com/archive/EFTA02346686 | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/investigations/barak-st-thomas-dec-2014 | Source locator supporting the chosen prose home |
| https://grokarchivehub.com/archive/EFTA02596796 | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/investigations/barak-st-thomas-dec-2014 | Source locator supporting the chosen prose home |
| https://grokarchivehub.com/archive/EFTA02662212 | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/reels/bill-richardson-counsel-memo-efta00014374 | Source locator supporting the chosen prose home |
| https://grokarchivehub.com/archive/EFTA00962798 | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/reels/jean-luc-brunel-mc2-account-efta01972778 | Source locator supporting the chosen prose home |
| https://grokarchivehub.com/videos | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/videos | Navigation directory or utility, not a substantive article |
| https://grokarchivehub.com/archive/EFTA02730265 | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/reels/bill-gates-nikolic-points-efta02730265 | Source locator supporting the chosen prose home |
| https://grokarchivehub.com/archive/EFTA00088020 | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/reels/andrew-doj-judicial-review-efta00088020 | Source locator supporting the chosen prose home |
| https://grokarchivehub.com/archive/EFTA02300238 | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/reels/reid-hoffman-island-logistics-efta02300238 | November 2014 Hoffman travel-planning record; not evidence for the separate December Barak trip |
| https://grokarchivehub.com/archive/EFTA00034221 | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/reels/mark-zuckerberg-mentions-efta00034221 | Source locator supporting the chosen prose home |
| https://grokarchivehub.com/archive/EFTA02730996 | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/reels/leon-black-dechert-158-million-efta02730996 | Source locator supporting the chosen prose home |
| https://grokarchivehub.com/archive/EFTA02731023 | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/reels/leon-black-dechert-158-million-efta02730996 | Source locator supporting the chosen prose home |
| https://grokarchivehub.com/archive/EFTA00022062 | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/reels/andrew-doj-judicial-review-efta00088020 | Source locator supporting the chosen prose home |
| https://grokarchivehub.com/archive/EFTA00035773 | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/reels/efta00035773-oig-voluntary-interview-waiver | Source locator supporting the chosen prose home |
| https://grokarchivehub.com/archive/EFTA00035828 | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/reels/efta00035828-epstein-cell-diagram | Source locator supporting the chosen prose home |
| https://grokarchivehub.com/archive/EFTA00035613 | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/reels/efta00035613-july-2019-donation-proposal | Source locator supporting the chosen prose home |
| https://grokarchivehub.com/archive/EFTA00356456 | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/investigations/barak-st-thomas-dec-2014 | Source locator supporting the chosen prose home |
| https://grokarchivehub.com/archive/EFTA02656769 | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/reels/shawn-ryan-peter-thiel-account-response | Source locator supporting the chosen prose home |
| https://grokarchivehub.com/archive/EFTA00643676 | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/archive/EFTA00643676 | Thin source locator; preserve original PDF and record boundaries |
| https://grokarchivehub.com/photos | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/photos | Navigation directory or utility, not a substantive article |
| https://grokarchivehub.com/archive/EFTA00035206 | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/archive/EFTA00035206 | Thin source locator; preserve original PDF and record boundaries |
| https://grokarchivehub.com/videos/peter-thiel-epstein-record-efta02656769 | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/reels/shawn-ryan-peter-thiel-account-response | Companion to the consolidated interview account and response |
| https://grokarchivehub.com/archive/EFTA00035715 | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/archive/EFTA00035715 | Thin source locator; preserve original PDF and record boundaries |
| https://grokarchivehub.com/videos/shawn-ryan-released-interview-response | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/reels/shawn-ryan-peter-thiel-account-response | Companion to the consolidated interview account and response |
| https://grokarchivehub.com/archive/EFTA00579182 | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/archive/EFTA00579182 | Thin source locator; preserve original PDF and record boundaries |
| https://grokarchivehub.com/videos/shawn-ryan-leah-naming-allegation | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/reels/shawn-ryan-peter-thiel-account-response | Companion to the consolidated interview account and response |
| https://grokarchivehub.com/videos/barak-hotel-name-efta00356456 | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/investigations/barak-st-thomas-dec-2014 | Companion to the consolidated December 2014 investigation |
| https://grokarchivehub.com/archive/EFTA00579174 | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/archive/EFTA00579174 | Thin source locator; preserve original PDF and record boundaries |
| https://grokarchivehub.com/reels/barak-st-thomas-ronen-cohen | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/investigations/barak-st-thomas-dec-2014 | Companion to the consolidated December 2014 investigation |
| https://grokarchivehub.com/guides | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/guides | Navigation directory or utility, not a substantive article |
| https://grokarchivehub.com/videos/barak-epstein-caribbean-invitation-2014 | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/investigations/barak-st-thomas-dec-2014 | Companion to the consolidated December 2014 investigation |
| https://grokarchivehub.com/archive/EFTA02810827 | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/archive/EFTA02810827 | Thin source locator; preserve original PDF and record boundaries |
| https://grokarchivehub.com/archive/EFTA00704168 | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/archive/EFTA00704168 | Thin source locator; preserve original PDF and record boundaries |
| https://grokarchivehub.com/newsletter | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/newsletter | Navigation directory or utility, not a substantive article |
| https://grokarchivehub.com/archive/EFTA00153571 | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/archive/EFTA00153571 | Thin source locator; preserve original PDF and record boundaries |
| https://grokarchivehub.com/archive/EFTA00153570 | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/archive/EFTA00153570 | Thin source locator; preserve original PDF and record boundaries |
| https://grokarchivehub.com/archive/EFTA01410768 | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/archive/EFTA01410768 | Thin source locator; preserve original PDF and record boundaries |
| https://grokarchivehub.com/internet-vs-receipts | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/internet-vs-receipts | Navigation directory or utility, not a substantive article |
| https://grokarchivehub.com/archive/EFTA00646811 | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/archive/EFTA00646811 | Thin source locator; preserve original PDF and record boundaries |
| https://grokarchivehub.com/videos/barak-ronen-cohen-ticket-7hlsoq | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/investigations/barak-st-thomas-dec-2014 | Companion to the consolidated December 2014 investigation |
| https://grokarchivehub.com/videos/shawn-ryan-leah-interview-response | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/reels/shawn-ryan-peter-thiel-account-response | Companion to the consolidated interview account and response |
| https://grokarchivehub.com/archive/EFTA00035119 | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/archive/EFTA00035119 | Thin source locator; preserve original PDF and record boundaries |
| https://grokarchivehub.com/archive/EFTA00128841 | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/archive/EFTA00128841 | Below requested unique-prose threshold; retained as reader/source access |
| https://grokarchivehub.com/archive/EFTA00176507 | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/archive/EFTA00176507 | Below requested unique-prose threshold; retained as reader/source access |
| https://grokarchivehub.com/investigations/barak-14-leads-evidence-index | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/investigations/barak-14-leads-evidence-index | Below requested unique-prose threshold; retained as reader/source access |
| https://grokarchivehub.com/archive/EFTA00224262 | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/archive/EFTA00224262 | Below requested unique-prose threshold; retained as reader/source access |
| https://grokarchivehub.com/archive/EFTA00080260 | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/archive/EFTA00080260 | Below requested unique-prose threshold; retained as reader/source access |
| https://grokarchivehub.com/archive/EFTA00153569 | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/archive/EFTA00153569 | Below requested unique-prose threshold; retained as reader/source access |
| https://grokarchivehub.com/archive/EFTA01245620 | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/archive/EFTA01245620 | Thin source locator; preserve original PDF and record boundaries |
| https://grokarchivehub.com/archive/EFTA00035657 | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/archive/EFTA00035657 | Below requested unique-prose threshold; retained as reader/source access |
| https://grokarchivehub.com/archive/EFTA00035421 | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/archive/EFTA00035421 | Below requested unique-prose threshold; retained as reader/source access |
| https://grokarchivehub.com/archive/EFTA00035420 | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/archive/EFTA00035420 | Below requested unique-prose threshold; retained as reader/source access |
| https://grokarchivehub.com/archive/EFTA02858491 | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/archive/EFTA02858491 | Thin source locator; preserve original PDF and record boundaries |
| https://grokarchivehub.com/archive/EFTA00035035 | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/archive/EFTA00035035 | Below requested unique-prose threshold; retained as reader/source access |
| https://grokarchivehub.com/internet-vs-receipts/doj-celebrity-names | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/internet-vs-receipts/doj-celebrity-names | Below requested unique-prose threshold; retained as reader/source access |
| https://grokarchivehub.com/archive/EFTA00035442 | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/archive/EFTA00035442 | Below requested unique-prose threshold; retained as reader/source access |
| https://grokarchivehub.com/start | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/start | Below requested unique-prose threshold; retained as reader/source access |
| https://grokarchivehub.com/investigations/barak-ushakov-2013-2015 | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/investigations/barak-ushakov-2013-2015 | Below requested unique-prose threshold; retained as reader/source access |
| https://grokarchivehub.com/archive/EFTA00000468 | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/news/efta00000468-removal-restoration-audit | The existing detailed removal/restoration audit owns this chronology; retain source and explainer access |
| https://grokarchivehub.com/archive/EFTA02858481 | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/archive/EFTA02858481 | Thin source locator; preserve original PDF and record boundaries |
| https://grokarchivehub.com/archive/EFTA00035053 | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/archive/EFTA00035053 | Below requested unique-prose threshold; retained as reader/source access |
| https://grokarchivehub.com/archive/EFTA00035570 | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/archive/EFTA00035570 | Below requested unique-prose threshold; retained as reader/source access |
| https://grokarchivehub.com/reels | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/reels | Navigation directory or utility, not a substantive article |
| https://grokarchivehub.com/investigations/barak-timeline-without-causation | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/investigations/barak-timeline-without-causation | Below requested unique-prose threshold; retained as reader/source access |
| https://grokarchivehub.com/reels/raskin-epstein-mlat-letter-october-2026 | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/reels/raskin-epstein-mlat-letter-october-2026 | Below requested unique-prose threshold; retained as reader/source access |
| https://grokarchivehub.com/archive/EFTA00033413 | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/archive/EFTA00033413 | Below requested unique-prose threshold; retained as reader/source access |
| https://grokarchivehub.com/internet-vs-receipts/2007-draft-indictment | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/internet-vs-receipts/2007-draft-indictment | Below requested unique-prose threshold; retained as reader/source access |
| https://grokarchivehub.com/archive/EFTA01703108 | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/archive/EFTA01703108 | Below requested unique-prose threshold; retained as reader/source access |
| https://grokarchivehub.com/book-of-black | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/book-of-black | Below requested unique-prose threshold; retained as reader/source access |
| https://grokarchivehub.com/investigations/barak-receipts-presence-not-conduct | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/investigations/barak-receipts-presence-not-conduct | Below requested unique-prose threshold; retained as reader/source access |
| https://grokarchivehub.com/investigations/barak-entity-control-layer | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/investigations/barak-entity-control-layer | Below requested unique-prose threshold; retained as reader/source access |
| https://grokarchivehub.com/dispatches/phang-ecf59-oct16-2026 | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/news/phang-fbi-notes-in-camera-october-16 | Companion reporting consolidated under one article |
| https://grokarchivehub.com/methodology/source-map-methodology | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/methodology/source-map-methodology | Below requested unique-prose threshold; retained as reader/source access |
| https://grokarchivehub.com/news/gadeco-chinese-consortium-declined | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/investigations/barak-gadeco-fee-2014 | Companion reporting consolidated under one article |
| https://grokarchivehub.com/internet-vs-receipts/efta00000468-removal | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/news/efta00000468-removal-restoration-audit | The existing detailed removal/restoration audit owns this chronology; retain source and explainer access |
| https://grokarchivehub.com/archive | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/archive | Navigation directory or utility, not a substantive article |
| https://grokarchivehub.com/archive/ids | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/archive/ids | Navigation directory or utility, not a substantive article |
| https://grokarchivehub.com/entities | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/entities | Navigation directory or utility, not a substantive article |
| https://wiki.grokarchivehub.com/ | 200 | noindex,follow / noindex,follow | https://wiki.grokarchivehub.com/ | Research directory; preserve access without presenting it as an article |
| https://wiki.grokarchivehub.com/archive | 200 | noindex,follow / noindex,follow | https://wiki.grokarchivehub.com/archive | Research directory; preserve access without presenting it as an article |
| https://grokarchivehub.com/investigations/the-motherlode/survivor-accountability | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/investigations/the-motherlode/survivor-accountability | Research process rather than published investigative findings |
| https://grokarchivehub.com/investigations/the-motherlode | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/investigations/the-motherlode | Research process rather than published investigative findings |
| https://grokarchivehub.com/investigations/the-motherlode/us-runs | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/investigations/the-motherlode/us-runs | Research process rather than published investigative findings |
| https://grokarchivehub.com/investigations/the-motherlode/phone-cdr | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/investigations/the-motherlode/phone-cdr | Research process rather than published investigative findings |
| https://grokarchivehub.com/videos/barak-st-thomas-december-2014 | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/investigations/barak-st-thomas-dec-2014 | Companion to the consolidated December 2014 investigation |
| https://grokarchivehub.com/investigations/august-8-attorney-log-colon-miro | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/dispatches/august-8-attorney-log-colon-miro | Companion reporting consolidated under one article |
| https://grokarchivehub.com/archive/EFTA00039356 | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/investigations/autopsy-exhibit-list-limits | Source locator supporting the chosen prose home |
| https://grokarchivehub.com/archive/EFTA00039416 | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/investigations/ch0080-video-file-windows | Source locator supporting the chosen prose home |
| https://grokarchivehub.com/investigations/fara-review-signals-not-legal-conclusions | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/investigations/fara-review-signals-not-legal-conclusions | Editorial hold in initial 120-page index: source remains accessible; prioritize greater original prose depth and designated canonical homes |
| https://grokarchivehub.com/banking-records | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/banking-records | Editorial hold in initial 120-page index: source remains accessible; prioritize greater original prose depth and designated canonical homes |
| https://grokarchivehub.com/investigations/birthday-book-source-object-not-identity-proof | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/investigations/birthday-book-source-object-not-identity-proof | Editorial hold in initial 120-page index: source remains accessible; prioritize greater original prose depth and designated canonical homes |
| https://grokarchivehub.com/investigations/fbi-review-holdings-vault-parts-12-13 | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/investigations/fbi-review-holdings-vault-parts-12-13 | Editorial hold in initial 120-page index: source remains accessible; prioritize greater original prose depth and designated canonical homes |
| https://grokarchivehub.com/methodology/confidence-labels-open-slots | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/methodology/confidence-labels-open-slots | Editorial hold in initial 120-page index: source remains accessible; prioritize greater original prose depth and designated canonical homes |
| https://grokarchivehub.com/news/epstein-wall-street-records-act-2026 | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/news/epstein-wall-street-records-act-2026 | Editorial hold in initial 120-page index: source remains accessible; prioritize greater original prose depth and designated canonical homes |
| https://grokarchivehub.com/news/state-attorneys-general-efta-ii-2026 | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/news/state-attorneys-general-efta-ii-2026 | Editorial hold in initial 120-page index: source remains accessible; prioritize greater original prose depth and designated canonical homes |
| https://grokarchivehub.com/reels/clinton-cgi-publicis-transfer-source-audit | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/reels/clinton-cgi-publicis-transfer-source-audit | Editorial hold in initial 120-page index: source remains accessible; prioritize greater original prose depth and designated canonical homes |
| https://grokarchivehub.com/dispatches | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/dispatches | Editorial hold in initial 120-page index: source remains accessible; prioritize greater original prose depth and designated canonical homes |
| https://grokarchivehub.com/methodology | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/methodology | Editorial hold in initial 120-page index: source remains accessible; prioritize greater original prose depth and designated canonical homes |
| https://grokarchivehub.com/investigations/late-july-watch-status-records | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/investigations/late-july-watch-status-records | Editorial hold in initial 120-page index: source remains accessible; prioritize greater original prose depth and designated canonical homes |
| https://grokarchivehub.com/investigations/open-receipt-slots-epstein-death | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/investigations/open-receipt-slots-epstein-death | Editorial hold in initial 120-page index: source remains accessible; prioritize greater original prose depth and designated canonical homes |
| https://grokarchivehub.com/dispatches/doj-oip-epstein-records-oct21-2026 | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/dispatches/doj-oip-epstein-records-oct21-2026 | Editorial hold in initial 120-page index: source remains accessible; prioritize greater original prose depth and designated canonical homes |
| https://grokarchivehub.com/dispatches/epstein-open-receipt-slots | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/dispatches/epstein-open-receipt-slots | Editorial hold in initial 120-page index: source remains accessible; prioritize greater original prose depth and designated canonical homes |
| https://grokarchivehub.com/news/bank-of-america-aml-penalties-epstein-settlement-2026 | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/news/bank-of-america-aml-penalties-epstein-settlement-2026 | Editorial hold in initial 120-page index: source remains accessible; prioritize greater original prose depth and designated canonical homes |
| https://grokarchivehub.com/guides/epstein-black-book-redacted-doj | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/guides/epstein-black-book-redacted-doj | Editorial hold in initial 120-page index: source remains accessible; prioritize greater original prose depth and designated canonical homes |
| https://grokarchivehub.com/methodology/how-not-to-overread-flight-logs | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/methodology/how-not-to-overread-flight-logs | Editorial hold in initial 120-page index: source remains accessible; prioritize greater original prose depth and designated canonical homes |
| https://grokarchivehub.com/evidence-briefs/southern-trust-gates-client-definition | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/evidence-briefs/southern-trust-gates-client-definition | Editorial hold in initial 120-page index: source remains accessible; prioritize greater original prose depth and designated canonical homes |
| https://grokarchivehub.com/document-autopsies/leon-black-transcript | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/document-autopsies/leon-black-transcript | Editorial hold in initial 120-page index: source remains accessible; prioritize greater original prose depth and designated canonical homes |
| https://grokarchivehub.com/dispatches/epstein-jail-logs | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/dispatches/epstein-jail-logs | Editorial hold in initial 120-page index: source remains accessible; prioritize greater original prose depth and designated canonical homes |
| https://grokarchivehub.com/about-the-operator | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/about-the-operator | Editorial hold in initial 120-page index: source remains accessible; prioritize greater original prose depth and designated canonical homes |
| https://grokarchivehub.com/dispatches/efta-files-guide | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/dispatches/efta-files-guide | Editorial hold in initial 120-page index: source remains accessible; prioritize greater original prose depth and designated canonical homes |
| https://grokarchivehub.com/investigations/doj-oig-report-as-backbone | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/investigations/doj-oig-report-as-backbone | Editorial hold in initial 120-page index: source remains accessible; prioritize greater original prose depth and designated canonical homes |
| https://grokarchivehub.com/guides/doj-epstein-data-sets | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/guides/doj-epstein-data-sets | Editorial hold in initial 120-page index: source remains accessible; prioritize greater original prose depth and designated canonical homes |
| https://grokarchivehub.com/guides/epstein-flight-logs-doj | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/guides/epstein-flight-logs-doj | Editorial hold in initial 120-page index: source remains accessible; prioritize greater original prose depth and designated canonical homes |
| https://grokarchivehub.com/reels/gratitude-america-10-million-efta00080260 | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/reels/gratitude-america-10-million-efta00080260 | Editorial hold in initial 120-page index: source remains accessible; prioritize greater original prose depth and designated canonical homes |
| https://grokarchivehub.com/news | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/news | Editorial hold in initial 120-page index: source remains accessible; prioritize greater original prose depth and designated canonical homes |
| https://grokarchivehub.com/barak/fara-review | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/barak/fara-review | Editorial hold in initial 120-page index: source remains accessible; prioritize greater original prose depth and designated canonical homes |
| https://grokarchivehub.com/guides/epstein-files-transparency-act | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/guides/epstein-files-transparency-act | Editorial hold in initial 120-page index: source remains accessible; prioritize greater original prose depth and designated canonical homes |
| https://grokarchivehub.com/guides/epstein-2007-draft-federal-indictment | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/guides/epstein-2007-draft-federal-indictment | Editorial hold in initial 120-page index: source remains accessible; prioritize greater original prose depth and designated canonical homes |
| https://grokarchivehub.com/editorial-policy | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/editorial-policy | Editorial hold in initial 120-page index: source remains accessible; prioritize greater original prose depth and designated canonical homes |
| https://grokarchivehub.com/evidence-briefs/epstein-code-words-documentary-test | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/evidence-briefs/epstein-code-words-documentary-test | Editorial hold in initial 120-page index: source remains accessible; prioritize greater original prose depth and designated canonical homes |
| https://grokarchivehub.com/investigations/palm-beach-2006-police-jet-aviation-call-records | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/investigations/palm-beach-2006-police-jet-aviation-call-records | Editorial hold in initial 120-page index: source remains accessible; prioritize greater original prose depth and designated canonical homes |
| https://grokarchivehub.com/redacted-files | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/redacted-files | Editorial hold in initial 120-page index: source remains accessible; prioritize greater original prose depth and designated canonical homes |
| https://grokarchivehub.com/news/fbi-vault-epstein-review-part-14-october-2026 | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/news/fbi-vault-epstein-review-part-14-october-2026 | Editorial hold in initial 120-page index: source remains accessible; prioritize greater original prose depth and designated canonical homes |
| https://grokarchivehub.com/guides/how-to-search-epstein-files | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/guides/how-to-search-epstein-files | Editorial hold in initial 120-page index: source remains accessible; prioritize greater original prose depth and designated canonical homes |
| https://grokarchivehub.com/guides/epstein-client-list-explained | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/guides/epstein-client-list-explained | Editorial hold in initial 120-page index: source remains accessible; prioritize greater original prose depth and designated canonical homes |
| https://grokarchivehub.com/barak/timeline | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/barak/timeline | Editorial hold in initial 120-page index: source remains accessible; prioritize greater original prose depth and designated canonical homes |
| https://grokarchivehub.com/videos/jpmorgan-nine-sars-reporting-timeline | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/videos/jpmorgan-nine-sars-reporting-timeline | Supporting media page outside the initial curated article index; retain watch access |
| https://grokarchivehub.com/videos/ask-gah-search-epstein-files | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/videos/ask-gah-search-epstein-files | Supporting media page outside the initial curated article index; retain watch access |
| https://grokarchivehub.com/videos/hold-the-letter-victim-notification | 200 | noindex,follow / noindex,follow | https://grokarchivehub.com/videos/hold-the-letter-victim-notification | Supporting media page outside the initial curated article index; retain watch access |

## Asset and reader regression

The JSON includes each linked asset’s HTTP status, MIME type, first bytes and SHA-256 value. All 49 restored PDFs still begin with `%PDF-` and match their recorded hashes. The acknowledged Book of Black manuscript remains 17,775,835 bytes with SHA-256 `e28da16e03c8b7e9819bf5010874ab2d5ed13564636f59a55ca1ce70fbec5eff`; anonymous access remains 403 and tested reader APIs return JSON. The 44 usable archived snapshots remain distinct from homepage HTML; two former challenge captures remain removed, with official-source citations retained.

## Deployment controls and next review

Both hosts use the same publication-policy bytes; the main artifact and repository hashes match the immutable wiki image’s recorded code hash. Security/auth/rate-limit guard hashes were unchanged. Existing robots.txt training preferences, source-PDF guards, acknowledgement rules and protected APIs were retained. No cache purge was required.

The edit list recommends waiting two to four weeks for recrawl before reapplying. That waiting/review step remains for the owner after search engines have revisited the changed inventory. This single-location live check cannot establish all Cloudflare regions, future deployments, search-engine indexing or AdSense approval.
