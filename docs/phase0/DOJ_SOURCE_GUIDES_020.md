# GAH-DOJ-SOURCE-GUIDES-020 — Official record finders (Ren SEO gaps #06/#07)

October 13, 2026. Two original, source-first editorial guides with official DOJ record URLs, direct citations, editorial limitations, canonical SEO and internal navigation.

## Primary-release source verified

Official DOJ February 27, 2025 press announcement and its linked record list:
https://www.justice.gov/opa/pr/attorney-general-pamela-bondi-releases-first-phase-declassified-epstein-files

- Contact book: original government **C. Contact Book_Redacted** release (https://www.justice.gov/ag/media/1391321/dl?inline). This is the redacted official release, not an authenticated unredacted universal contact register. **Never** reproduce personal numbers, victim contact information, or allegations based on name presence.
- DOJ's **B. Flight Log_Released in U.S. v. Maxwell**, base PDF (https://www.justice.gov/ag/media/1391276/dl?inline) and Parts 1–6 with exact government links under `/ag/media/1391281`, `1391291`, `1391296`, `1391301`, `1391306`, `1391311`. The DOJ PDF list was independently extracted from the first-party press release and all sampled source endpoints returned HTTP200 at check time. They are official trial exhibit releases; no unverified assumption of complete 1997–2006 coverage.

## New site destinations

- `/guides/epstein-black-book-redacted-doj`: source provenance, privacy-safe redacted edition guidance, evidence limits, and careful separation from unrelated GAH *Book of Black* manuscript.
- `/guides/epstein-flight-logs-doj`: official PDF links, log-vs-passenger-manifest taxonomy, handwriting/OCR caveats, itinerary/date completeness and privacy safeguards.
- Both use explicit static Worker aliases, unique canonical/self URLs, indexable titles, descriptions, source citations and new sitemap entries; Guides index now lists seven editorial guides.

## Distinct gaps

Ren gap **#07**, official source/navigation for black book/contact book, now has a genuine government-released redacted PDF linked directly. This closes the lack of an *official publicly released document link* but **does not authenticate external unredacted editions or create a person index**. Ren partial **#06** now has the original government Maxwell flight-log PDFs with correct provenance, but full **1997–2006 year coverage completeness remains unverified**. Do not mark exhaustive flight corpus accepted. Other missing and partial keywords remain open in issue #31.

This release copies no PDF bytes, unredacted contact data, victims' PII or third-party mailbox records to GitHub. It also does not modify commerce, private wiki, security, NAS or WAF. An appearance in any log or contact book is not evidence of crime.

## QA and deployment

`tests/test_doj_primary_source_guides_020.mjs` validates official release/asset URLs, all seven flight-log PDF links, route mapping, canonical, sitemap, Guide Index cross-links, redaction warnings, and no-overclaim statements. Phase 0 CI now has **28 suites**. Must pass CI, protected Access staging, hash-matched Pages production deployment and live HTML/sitemap smoke tests.
