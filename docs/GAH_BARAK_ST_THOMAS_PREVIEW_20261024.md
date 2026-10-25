# Barak St. Thomas — preview verification, October 24, 2026
Status: **PREVIEW READY; NOT PUBLISHED TO PRODUCTION.** Thomas's script explicitly requires preview review and his word before production changes.

- Protected preview: https://d992d88a.gah-staging-517b8499.pages.dev/investigations/barak-st-thomas-dec-2014
- Draft PR: https://github.com/danespec/grokfiles-landing/pull/197
- Preview source commit: e6cbfe7; base: b5a1c8a.
- Intended production URL: https://grokarchivehub.com/investigations/barak-st-thomas-dec-2014
- No slug collision found. No dedicated St. Thomas/Ronen Cohen investigation was found in the current codebase or public sitemap; existing Barak investigations were preserved.

## Requested checklist
| Gate | Evidence and status |
|---|---|
| Live production URL returns 200 | **PENDING APPROVAL/DEPLOYMENT.** Public production route currently returns 404, as expected for this unpublished page. No claim of publication is made. |
| Eight sections render in order, no placeholders | **PASS in local browser and Worker integration test.** Story; sequence; eight anomalies; two readings; photo negative; open questions; source register; companion pieces. Protected deployed preview still requires owner login for authenticated visual confirmation. |
| Every source ID resolves or has a source-family label | **PASS.** Thirteen register entries, including the requested eleven plus the twin 18189 and naming-convention comparator 25238. All in-page anchors resolve. Leak IDs explicitly labeled Barak leak; four DOJ EFTA links return 200. |
| Both readings labeled; no factual Cohen=Barak assertion | **PASS.** Re-read the rendered full article. A is Thomas's hypothesis, B is the alternative; both identifications explicitly unproven. The differing return dates and security evidence remain visible. No invented boarding, check-in, seat, manifest or passport scene. |
| Bahamas photograph absent | **PASS.** No img elements in the article. Only the purpose-built text card is referenced by OG/Twitter metadata. No external video thumbnails or photo embeds. The excluded photograph is described only as a negative control. |
| Main sitemap contains exact URL | **PASS in production-config Worker test; LIVE CHECK PENDING DEPLOYMENT.** Generated line reproduced below. One entry, without duplicates. |
| JSON-LD and search metadata | **PASS.** Article JSON parses and has context, headline, published/modified date 2026-10-24, author GrokArchiveHub, publisher, canonical URL, image and citations. Description includes all four requested search strings. Title preserves the requested non-identifying headline and includes Ehud Barak St. Thomas 2014. Production-config response index,follow; staging privacy test noindex,nofollow,noarchive. No external rich-results-validator result is claimed. |
| Required inbound internal links | **PASS in Worker integration test:** five requested source pages plus investigations hub return 200 and contain the link. Existing five source pages return 200 publicly; their new inbound links await production publication. Individual routes below. |
| IG reel and YouTube links | **PASS HTTP resolution.** Reel, exact October 24 long and three Shorts all return 200. Long/Short titles and IDs recovered from GAH's public channel; no claim of watching the videos is made. |
| Preview first, deploy only on Thomas's word | **ENFORCED.** Protected preview deployed; draft PR unmerged. Production unchanged. Owner review/approval required by the user's script, not an added skill approval requirement. |

Generated main sitemap line (production-config Worker, not yet the live sitemap):
```xml
<url><loc>https://grokarchivehub.com/investigations/barak-st-thomas-dec-2014</loc><lastmod>2026-10-24</lastmod></url>
```

## Inbound discovery routes
| Route | Existing public HTTP | Updated Worker HTTP / new link |
|---|---:|---|
| /barak/entities | 200 | 200 / present |
| /topics | 200 | 200 / present |
| /latest | 200 | 200 / present |
| /investigations/barak-epstein-putin-qatar-carbyne | 200 | 200 / present |
| /investigations/barak-14-leads-evidence-index | 200 | 200 / present |
| /investigations | Not independently rechecked | 200 / present |

## Cited DOJ archive links
All returned HTTP 200 from the public site:
- /archive/EFTA00356456
- /archive/EFTA02596796
- /archive/EFTA02346686
- /archive/EFTA02300238

Leak IDs 18414, 18189, 18310, 18018, 18243, 25238, 19004, 15729 and 14998 are labeled by source family, with valid register anchors; no invented public leak URLs.

## Companion links
All returned HTTP 200:
- https://www.instagram.com/reel/DeyQU7ylNfe/
- https://www.youtube.com/watch?v=ukhO7KsskqQ
- https://www.youtube.com/shorts/EgYM0u4w1sA
- https://www.youtube.com/shorts/dHwT8S3B0Og
- https://www.youtube.com/shorts/TIJmqHyke9I

The similarly titled older long video 0WSgi2Ds17o was not used in place of the October 24 publication.

## Editorial boundaries retained
The supplied research is attributed to Thomas via Ren, October 24, reporting an October 21 verification pass. Corpus-wide counts and negative findings were not independently rerun for this build. Exact-name negative searches are scoped and do not establish that a person does not exist. The 31,718-message index is distinguished from the existing Qatar page's 40,976 raw HTML messages. Hotel reservation naming is documented; concealment motive is an interpretation. Fare class does not identify a traveler or exclude security personnel. Summers/Pritzker invitations are not represented as attendance.

## Validation
Passed:
- node tests/test_barak_st_thomas_20261024.mjs
- node tests/test_trump_campaign_records.mjs
- node tests/test_home_064.mjs
- node tests/test_staging_harden.mjs (20 passed, 0 failed)
- git diff --check

The static source was reviewed in the browser using the managed local preview, including all eight sections. Deployed staging returned 302 to the expected Cloudflare Access owner login. Browser review of the authenticated deployed page is therefore not claimed. Access controls were preserved.

## Remaining release steps
1. Thomas reviews the protected preview and explicitly approves production.
2. Reconcile the PR against any newer main commits; rerun affected checks if code changes.
3. Merge and deploy the approved snapshot through the existing Cloudflare production process.
4. Verify the exact public article returns 200, all eight sections and source links render, no noindex, correct card/meta/schema, all five inbound links and the live sitemap line. Record the actual deployment ID and verification results.
