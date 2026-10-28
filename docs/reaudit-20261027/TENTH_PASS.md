# Live acceptance for the October 28 asset and metadata handoff

This record replaces the earlier completion claim. It covers the supplied handoff and the additional three linked images found during its verification. It does not claim that every possible site behavior or search-engine outcome has been tested.

HTML crawl captured: 2026-10-28T11:58:22.811389+00:00. Asset capture completed: 2026-10-28T12:04:57.709290+00:00. Analysis: 2026-10-28T12:17:11.814154+00:00.

Production: Pages `176aea34`; wiki `gah-wiki-gateway:asset-identity-tenth-20261027`, immutable image `sha256:a212985d833d6a62016103fe7dfff3d9030813976e1d56d6ca896318ce320715`. Wiki rollback: `grok_wiki_gateway_before_asset_identity_tenth_20261027`. Main rollback: `532a38d9`.

Source changes: [PR #245](https://github.com/danespec/grokfiles-landing/pull/245) and [PR #246](https://github.com/danespec/grokfiles-landing/pull/246). Exact machine-readable per-URL results: [tenth-pass-acceptance.json](tenth-pass-acceptance.json).

## Captured output

```text
HTML routes checked: 1086; HTML 200 responses: 999
Sitemaps: main 193 + dossiers 69 + wiki 74 = 336; eligible indexable pages: 336
Duplicate title groups: 0; duplicate description groups: 0
Robots mismatches: 0; descriptions with ellipses: 0
ETFA editorial HTML pages: 0; indirect/utility-link findings: 0
HTML pages with GROK_ comments: 0
Source snapshots: 44 real bodies; homepage canonicals: 0
Linked evidence/data assets: 206 HTTP 200 with content checks
PDF full GETs and SHA-256 checks: 49; PDF HEADs: 49
Arbitrary missing evidence/book source paths: 15 direct 404 responses
Dossier ID/H1, source order and reciprocal-link checks: 69
Failures: 0
```

The 82 redirects in the crawl are seeded aliases and cross-host ownership routes; the five 302 responses are account/authentication gates. Those totals are not presented as broken-link counts. Viewer query identifiers are retained by the crawler.

## Barak content links

| Hub | Noindex / content pages | Ratio |
|---|---:|---:|
| `/barak/receipts` | 5 / 17 | 29.4% |
| `/barak/timeline` | 2 / 13 | 15.4% |

Counts use unique same-site page URLs inside `main`, excluding the same page, file downloads and the 20 distinct header/footer destinations actually present in these captures. All target URLs and exclusions are recorded in the JSON. This differs from the handoff’s undocumented list of 22 template URLs; the full target lists make the calculation reviewable. Unresolved detail links remain available on the explicit `/barak/raw-receipts` noindex directory, with their review limits.

## 44 source snapshots and two official-source replacements

| URL | Status | Content type | Archived title | Homepage canonical count |
|---|---:|---|---|---:|
| https://grokarchivehub.com/evidence-data/blanche-no-evidence/source/html/doj-efta-2026-01-30-release | 200 | text/plain; charset=utf-8 | Office of Public Affairs \|  Department of Justice Publishes 3.5 Million Responsive Pages in Compliance with the Epstein Files Transparency Act \| United States Department of Justice | 0 |
| https://grokarchivehub.com/evidence-data/blanche-no-evidence/source/html/sjc-grassley-epstein-exchange-2026-07-15 | 200 | text/plain; charset=utf-8 | Grassley Questions Blanche at Attorney G... \| United States Senate Committee on the Judiciary | 0 |
| https://grokarchivehub.com/evidence-data/doug-band/source/html/angel-urena-clinton-epstein-statement-x-2019-07-08 | 200 | text/plain; charset=utf-8 | Angel Ureña on X: "Statement on Jeffrey Epstein. https://t.co/98ha9YYd1l" / X | 0 |
| https://grokarchivehub.com/evidence-data/doug-band/source/html/doj-phase-one-epstein-files-release-2025-02-27 | 200 | text/plain; charset=utf-8 | Office of Public Affairs \|  Attorney General Pamela Bondi Releases First Phase of Declassified Epstein Files \| United States Department of Justice | 0 |
| https://grokarchivehub.com/evidence-data/doug-band/source/html/doj-phase-one-flight-log-media-page-1391276 | 200 | text/plain; charset=utf-8 | Epstein Files Phase One – B. Flight Log_Released in U.S. v. Maxwell \| United States Department of Justice | 0 |
| https://grokarchivehub.com/evidence-data/doug-band/source/html/house-oversight-clinton-contempt-remarks-2026-01-21 | 200 | text/plain; charset=utf-8 | Chairman Comer: Clintons Must be Held Accountable for Refusing to Comply with Duly Issued Bipartisan Subpoenas - United States House Committee on Oversight and Government Reform | 0 |
| https://grokarchivehub.com/evidence-data/doug-band/source/html/house-oversight-clinton-deposition-videos-2026-03-02 | 200 | text/plain; charset=utf-8 | Oversight Committee Releases Bill and Hillary Clinton Deposition Videos - United States House Committee on Oversight and Government Reform | 0 |
| https://grokarchivehub.com/evidence-data/doug-band/source/html/house-oversight-clinton-subpoenas-2025-08-05 | 200 | text/plain; charset=utf-8 | Chairman Comer Subpoenas Bill and Hillary Clinton, Former U.S. Attorneys General and FBI Directors, and Records Related to Jeffrey Epstein - United States House Committee on Oversight and Government Reform | 0 |
| https://grokarchivehub.com/evidence-data/doug-band/source/html/house-oversight-clintons-caved-depositions-2026-02-03 | 200 | text/plain; charset=utf-8 | Chairman Comer Announces the Clintons Caved, Will Appear for Depositions - United States House Committee on Oversight and Government Reform | 0 |
| https://grokarchivehub.com/evidence-data/doug-band/source/html/house-oversight-doug-band-ti-request-page-2026-03-03 | 200 | text/plain; charset=utf-8 | 03.3.2026 Doug Band TI Request Letter - United States House Committee on Oversight and Government Reform | 0 |
| https://grokarchivehub.com/evidence-data/doug-band/source/html/house-oversight-release-leon-black-doug-band-transcripts-2026-07-17 | 200 | text/plain; charset=utf-8 | Oversight Committee Releases Leon Black and Doug Band Transcripts - United States House Committee on Oversight and Government Reform | 0 |
| https://grokarchivehub.com/evidence-data/doug-band/source/html/house-oversight-seven-ti-requests-2026-03-03 | 200 | text/plain; charset=utf-8 | Chairman Comer Seeks Seven Transcribed Interviews as Part of Epstein Investigation - United States House Committee on Oversight and Government Reform | 0 |
| https://grokarchivehub.com/evidence-data/leon-black/source/html/apollo-independent-review-release-2021-01-25 | 200 | text/plain; charset=utf-8 | Apollo Global Management Announces Conclusion and Release of Independent Review | 0 |
| https://grokarchivehub.com/evidence-data/leon-black/source/html/apollo-letter-clients-partners-2026-02-18 | 200 | text/plain; charset=utf-8 | Apollo Sent the Following Letter to Clients and Partners | 0 |
| https://grokarchivehub.com/evidence-data/leon-black/source/html/house-oversight-release-leon-black-doug-band-2026-07-17 | 200 | text/plain; charset=utf-8 | Oversight Committee Releases Leon Black and Doug Band Transcripts - United States House Committee on Oversight and Government Reform | 0 |
| https://grokarchivehub.com/evidence-data/leon-black/source/html/house-oversight-subpoenas-leon-black-2026-06-26 | 200 | text/plain; charset=utf-8 | Chairman Comer Issues Two Subpoenas to Leon Black - United States House Committee on Oversight and Government Reform | 0 |
| https://grokarchivehub.com/evidence-data/leon-black/source/html/sec-apollo-8k-2021-01-25 | 200 | text/plain; charset=utf-8 | 8-K | 0 |
| https://grokarchivehub.com/evidence-data/leon-black/source/html/sec-apollo-black-letter-ex99-2-2021-01-25 | 200 | text/plain; charset=utf-8 | EX-99.2 | 0 |
| https://grokarchivehub.com/evidence-data/leon-black/source/html/sec-apollo-dechert-report-ex99-1-2021-01-25 | 200 | text/plain; charset=utf-8 | EX-99.1 | 0 |
| https://grokarchivehub.com/evidence-data/new-mexico-doj/source/html/doj-2026-01-30-release | 200 | text/plain; charset=utf-8 | Office of Public Affairs \|  Department of Justice Publishes 3.5 Million Responsive Pages in Compliance with the Epstein Files Transparency Act \| United States Department of Justice | 0 |
| https://grokarchivehub.com/evidence-data/new-mexico-doj/source/html/doj-epstein-disclosures | 200 | text/plain; charset=utf-8 | Department of Justice \|  DOJ Disclosures \| United States Department of Justice | 0 |
| https://grokarchivehub.com/evidence-data/new-mexico-doj/source/html/doj-oip-efta-foia-library | 200 | text/plain; charset=utf-8 | Office of Information Policy \|  FOIA Library | 0 |
| https://grokarchivehub.com/evidence-data/new-mexico-doj/source/html/nmd-2026-02-19-zorro-reopen | 200 | text/plain; charset=utf-8 | Statement from the New Mexico Department of Justice Regarding Zorro Ranch - New Mexico Department of Justice | 0 |
| https://grokarchivehub.com/evidence-data/new-mexico-doj/source/html/nmd-2026-03-09-zorro-search | 200 | text/plain; charset=utf-8 | Statement from New Mexico Department of Justice Spokesperson Regarding Today's Search of the Former 'Zorro Ranch’ - New Mexico Department of Justice | 0 |
| https://grokarchivehub.com/evidence-data/new-mexico-doj/source/html/nmd-2026-06-09-world-without-exploitation | 200 | text/plain; charset=utf-8 | At World Without Exploitation Annual Conference, New Mexico Attorney General Raúl Torrez Tells Survivors: “We Will Be True and Honest Warriors on Your Behalf”   - New Mexico Department of Justice | 0 |
| https://grokarchivehub.com/evidence-data/new-mexico-doj/source/html/nmd-2026-07-09-press-release | 200 | text/plain; charset=utf-8 | Attorney General Raúl Torrez: USDOJ is Hindering Our Criminal Investigation by Withholding Unredacted Epstein Files - New Mexico Department of Justice | 0 |
| https://grokarchivehub.com/evidence-data/new-mexico-doj/source/html/nmd-2026-07-15-efta-ii-release | 200 | text/plain; charset=utf-8 | Attorney General Raúl Torrez, Representative Leger Fernández Push New Legislation to Force DOJ to Release Remaining Epstein Files - New Mexico Department of Justice | 0 |
| https://grokarchivehub.com/evidence-data/new-mexico-doj/source/html/nmd-zorro-tip-page | 200 | text/plain; charset=utf-8 | Zorro Ranch & Jeffrey Epstein Investigation - New Mexico Department of Justice | 0 |
| https://grokarchivehub.com/evidence-data/new-mexico-doj/source/html/nmlegis-hisc-page | 200 | text/plain; charset=utf-8 | Interim Committee - New Mexico Legislature | 0 |
| https://grokarchivehub.com/evidence-data/new-mexico-doj/source/html/nmlegis-hr1-page | 200 | text/plain; charset=utf-8 | Legislation - New Mexico Legislature | 0 |
| https://grokarchivehub.com/evidence-data/new-mexico-doj/source/html/sen-heinrich-2026-07-15-clayton | 200 | text/plain; charset=utf-8 | Heinrich Presses Jay Clayton on DOJ Obst... \| Senator Martin Heinrich | 0 |
| https://grokarchivehub.com/evidence-data/new-mexico-doj/source/html/sen-hirono-2026-07-15-blanche | 200 | text/plain; charset=utf-8 | Hirono Presses Attorney General Nominee ... \| Senator Mazie Hirono | 0 |
| https://grokarchivehub.com/evidence-data/new-mexico-doj/source/html/truth-commission-drive-folder | 200 | text/plain; charset=utf-8 | Subpoenas - Google Drive | 0 |
| https://grokarchivehub.com/evidence-data/new-mexico-doj/source/html/truth-commission-home | 200 | text/plain; charset=utf-8 | Truth Commission \| Fadduol, Cluff, Hardy & Conaway | 0 |
| https://grokarchivehub.com/evidence-data/new-mexico-doj/source/html/truth-commission-meetings | 200 | text/plain; charset=utf-8 | Meeting & Archives — Truth Commission | 0 |
| https://grokarchivehub.com/evidence-data/new-mexico-doj/source/html/truth-commission-subpoenas | 200 | text/plain; charset=utf-8 | Subpoenas — Truth Commission | 0 |
| https://grokarchivehub.com/evidence-data/new-mexico-doj/source/html/uscode-2256-definitions | 200 | text/plain; charset=utf-8 | 18 USC 2256: Definitions for chapter | 0 |
| https://grokarchivehub.com/evidence-data/new-mexico-doj/source/html/uscode-child-victim-3509 | 200 | text/plain; charset=utf-8 | 18 USC 3509: Child victims' and child witnesses' rights | 0 |
| https://grokarchivehub.com/evidence-data/new-mexico-doj/source/html/uscode-cvra-3771 | 200 | text/plain; charset=utf-8 | 18 USC 3771: Crime victims' rights | 0 |
| https://grokarchivehub.com/evidence-data/new-mexico-doj/source/html/uscode-foia-552 | 200 | text/plain; charset=utf-8 | 5 USC 552: Public information; agency rules, opinions, orders, records, and proceedings | 0 |
| https://grokarchivehub.com/evidence-data/new-mexico-doj/source/html/uscode-jencks-3500 | 200 | text/plain; charset=utf-8 | 18 USC 3500: Demands for production of statements and reports of witnesses | 0 |
| https://grokarchivehub.com/evidence-data/new-mexico-doj/source/html/uscode-privacy-act-552a | 200 | text/plain; charset=utf-8 | 5 USC 552a: Records maintained on individuals | 0 |
| https://grokarchivehub.com/evidence-data/new-mexico-doj/source/html/uscode-rule-16 | 200 | text/plain; charset=utf-8 | 18 USC App Fed R Crim P Rule 16: Discovery and Inspection | 0 |
| https://grokarchivehub.com/evidence-data/new-mexico-doj/source/html/uscode-rule-6 | 200 | text/plain; charset=utf-8 | 18 USC App Fed R Crim P Rule 6: The Grand Jury | 0 |

42 snapshot files match the SHA-256 values in their original source manifests. The two Blanche snapshots have no comparable recorded manifest hash; their restored bytes are hashed separately in `tenth-restored-assets.json`. Every returned body differs from the homepage. Snapshots remain noindex and are served as plain text to avoid executing archived third-party HTML.

## Missing paths, linked data and acknowledged reader

| URL / mode | Status | Content type | First bytes |
|---|---:|---|---|
| https://grokarchivehub.com/evidence-data/zzz/nope.txt | 404 | text/plain; charset=utf-8 | `"Evidence asset not found"` |
| https://grokarchivehub.com/evidence-data/zzz/nope.json | 404 | text/plain; charset=utf-8 | `"Evidence asset not found"` |
| https://grokarchivehub.com/evidence-data/zzz/nope.tsv | 404 | text/plain; charset=utf-8 | `"Evidence asset not found"` |
| https://grokarchivehub.com/evidence-data/zzz/nope.csv | 404 | text/plain; charset=utf-8 | `"Evidence asset not found"` |
| https://grokarchivehub.com/evidence-data/zzz/nope.pdf | 404 | text/plain; charset=utf-8 | `"Evidence asset not found"` |
| https://grokarchivehub.com/evidence-data/zzz/nope.html | 404 | text/plain; charset=utf-8 | `"Evidence asset not found"` |
| https://grokarchivehub.com/evidence-data/zzz/nope.png | 404 | text/plain; charset=utf-8 | `"Evidence asset not found"` |
| https://grokarchivehub.com/evidence-data/zzz/nope | 404 | text/plain; charset=utf-8 | `"Evidence asset not found"` |
| https://grokarchivehub.com/evidence-data/new-mexico-doj/source/html/zzz-nope | 404 | text/plain; charset=utf-8 | `"Evidence asset not found"` |
| https://grokarchivehub.com/book-of-black/source/zzz-nope.pdf | 404 | text/plain; charset=utf-8 | `"Evidence asset not found"` |
| https://grokarchivehub.com/book-of-black/source/zzz-nope.txt | 404 | text/plain; charset=utf-8 | `"Evidence asset not found"` |
| https://grokarchivehub.com/book-of-black/source/zzz-nope.html | 404 | text/plain; charset=utf-8 | `"Evidence asset not found"` |
| https://grokarchivehub.com/book-of-black/source/zzz-nope.png | 404 | text/plain; charset=utf-8 | `"Evidence asset not found"` |
| https://grokarchivehub.com/evidence-data/new-mexico-doj/source/html/doj-epstein-library | 404 | text/plain; charset=utf-8 | `"Evidence asset not found"` |
| https://grokarchivehub.com/evidence-data/new-mexico-doj/source/html/ecfr-touhy-subpart-b | 404 | text/plain; charset=utf-8 | `"Evidence asset not found"` |
| https://grokarchivehub.com/evidence-data/blanche-no-evidence/source/captions/senate-isvp-july15-combined-captions.txt | 200 | text/plain; charset=utf-8 | `"[00:15:48] SENATOR: SENATOR: WELL, SENATOR: WELL, EVERYBODY, SENATOR: WELL, EVER"` |
| https://grokarchivehub.com/evidence-data/doj-oip-epstein-review-2026-10-09/source-manifest.json | 200 | application/json; charset=utf-8 | `"{\n  \"schema\": \"gah.editorial-source-summary.v1\",\n  \"publication\": \"2026-10-12\",\n"` |
| https://grokarchivehub.com/research/epstein-final-48-hours-mcc-source-ledger.tsv | 200 | text/tab-separated-values; charset=utf-8 | `"event_id\ttime\tpublished_record_and_limits\tsource_links\nMCC-EVT-002\tJul. 7, 2019 "` |
| https://grokarchivehub.com/book-of-black/source/Book_of_Black_V6HHT.pdf | 403 | text/plain; charset=utf-8 | `"Book of Black source asset requires reader acknowledgement."` |
| https://grokarchivehub.com/book-of-black/source/Book_of_Black_V6HHT.pdf; acknowledgement cookie; bytes=0-7 | 206 | application/pdf | `"%PDF-1.3"` |
| https://grokarchivehub.com/book-of-black/source/Book_of_Black_V6HHT.pdf; acknowledgement cookie | 200 | application/pdf | `"%PDF-1.3\n%\ufffd\ufffd\ufffd\ufffd\ufffd\ufffd\ufffd\ufffd\ufffd\n3 0 obj\n<< /Filter /FlateDecode /Length 1365 >>\nstream\nx\u0001\ufffdXM"` |
| https://grokarchivehub.com/api/book-of-black/status | 200 | application/json; charset=utf-8 | `"{\"ok\":true,\"manifest\":{\"schema_version\":\"book_of_black_source_manifest_v1\",\"task"` |
| https://grokarchivehub.com/api/book-of-black/page/1 | 200 | application/json; charset=utf-8 | `"{\"ok\":true,\"page\":{\"page\":1,\"text\":\"The Book of Black\\n\\n\\n\\n\\nChapter 1 \u2014 The F"` |
| https://grokarchivehub.com/api/book-of-black/page/2 | 200 | application/json; charset=utf-8 | `"{\"ok\":true,\"page\":{\"page\":2,\"text\":\"Chapter 2 \u2014 The Operators\\n\\n\\n\\n\\nThey don\u2019"` |
| https://grokarchivehub.com/api/book-of-black/page/100 | 200 | application/json; charset=utf-8 | `"{\"ok\":true,\"page\":{\"page\":100,\"text\":\" \u2022 January 2007: Alias \u201cSilver Lance\u201d acti"` |
| https://grokarchivehub.com/api/book-of-black/search?q=black | 200 | application/json; charset=utf-8 | `"{\"ok\":true,\"query\":\"black\",\"filters\":{\"status\":\"\",\"page\":\"\",\"verified_connection"` |
| https://grokarchivehub.com/api/book-of-black/ledger | 200 | application/json; charset=utf-8 | `"{\"schema_version\":\"book_of_black_ledger_v1\",\"generated_at\":\"2026-07-15T20:26:02."` |
| https://grokarchivehub.com/api/book-of-black/status | 200 | application/json; charset=utf-8 | `"{\"ok\":true,\"manifest\":{\"schema_version\":\"book_of_black_source_manifest_v1\",\"task"` |

Acknowledged manuscript: **17,775,835 bytes**, SHA-256 `e28da16e03c8b7e9819bf5010874ab2d5ed13564636f59a55ca1ce70fbec5eff`, matching the original manifest. The range response begins `%PDF-`; anonymous access remains 403. Reader status, pages 1/2/100, search and ledger return JSON, with no 1101 response in the tested requests. The TSV is an export of the existing 19 published chronology entries, including their uncertainty text and source links; it is not presented as a recovered original file.

## Twelve non-regression checks

| Check | Captured result |
|---|---|
| 1. Sitemap identities | 193 main + 69 dossiers + 74 wiki; all 200, indexable, self-canonical; zero eligible omissions. |
| 2. Dossiers | All 69 retain the ID in title/H1, justice.gov PDF as first outside source link, and reciprocal wiki receipt link. |
| 3. ID normalization | Three main lowercase/unpadded examples and wiki lowercase example return 301 to the canonical ID. |
| 4. www | Homepage returns 301 to apex. |
| 5. Missing pages | All seven named main/wiki negative routes return 404; malformed viewer ID ZZZ also returns 404 on both hosts. |
| 6. Robots agreement | Zero HTML meta/header mismatches; source-snapshot robots tags are also normalized to noindex. |
| 7. PDF integrity | All 49 restored linked PDFs pass full GET, signature/hash and HEAD checks; fake PDF and CSV paths return 404. |
| 8. Direct links | Zero internal .html, /api/pdf or Cloudflare email-protection links in the crawled HTML; Patreon sign-in links retain nofollow. |
| 9. robots.txt | Both captured in full in JSON; search allow rules and correct sitemap lines retained. Main managed training blocks and content signals were not edited. |
| 10. MCC and docket watch | Three MCC companions stay noindex and canonical to the primary, outside sitemaps; five docket-watch filings retain noindex and their existing real PDF links. |
| 11. Metadata and copy | 336 indexable pages: zero duplicate title/description groups, title <=70 and description <=155, zero ellipses. No remaining audited reader jargon. |
| 12. Asset identity | Exact evidence inventory blocks unknown paths before canonical redirects/SPA fallback; known-file fallback and falsely labelled PDF cases are regression-tested. All 206 tested linked assets serve real content. |

## Additional image repairs

| URL | Status | Content type | SHA-256 |
|---|---:|---|---|
| https://grokarchivehub.com/evidence-data/birthday-book/recovered_pages/page_118.png | 200 | image/png | `4992e27b50a3196e1bab0045d2f564e5084717ee34702498e261dc9f077eccaf` |
| https://grokarchivehub.com/evidence-data/birthday-book/recovered_pages/page_119.png | 200 | image/png | `08eb60ed099003014b65e55344d2cf12b07e16d21b1d0219dd7bf3799a88f285` |
| https://grokarchivehub.com/evidence-data/doug-band/source/images/angel-urena-clinton-epstein-statement-image-2019-07-08.jpg | 200 | image/jpeg | `6fbef3cc7719a9504eac94a49befd9566240d18cb6ee194eba8c591b02f76c76` |

## Scope and limits

The HTML crawl covers the sitemap URLs, deployed first-party HTML, research-route registry, and recursively followed public HTML links: 1,086 distinct routes, including 135 viewer URLs with their identifiers. Source assets, account actions, API routes and unreviewed corpus locators are handled separately rather than counted as published pages. The asset audit includes 206 unique linked evidence/data URLs plus the targeted negatives and reader APIs. Existing security/auth/rate-limit guard fingerprints were unchanged during the immutable wiki cutover.

This is one live capture from the available network location, not proof about every Cloudflare region, future deployments, upstream-site availability, Google indexing or rankings. No cache purge was required.

## Two rejected access-challenge captures

Of the original 46 snapshot links, 44 now serve usable archived captures. The DOJ library and eCFR captures were access-challenge responses, so their citations were repointed to the official source URLs below. Their obsolete local capture URLs now return 404. These are not counted as restored snapshots or passing linked assets.

| Removed local capture | Official citation now linked | Local response |
|---|---|---|
| /evidence-data/new-mexico-doj/source/html/doj-epstein-library | https://www.justice.gov/epstein | 404, text/plain; Evidence asset not found |
| /evidence-data/new-mexico-doj/source/html/ecfr-touhy-subpart-b | https://www.ecfr.gov/current/title-28/chapter-I/part-16/subpart-B | 404, text/plain; Evidence asset not found |

Response captures were reused for unchanged pages/assets during final analysis; missing-path probes were fetched again after the last deployment, and the revised New Mexico citation HTML was fetched and checked. Per-response dates remain in the JSON. Upstream access challenges are not represented as complete research sources.

## Docket-watch captures

| URL | HTTP | Meta robots | Header robots | Canonical |
|---|---:|---|---|---|
| https://grokarchivehub.com/news/phang-docket-watch/events/phang-dcd-1-26-cv-01417-ecf-15-f7f4232e3a79 | 200 | noindex,follow | noindex,follow | https://grokarchivehub.com/news/phang-docket-watch/events/phang-dcd-1-26-cv-01417-ecf-15-f7f4232e3a79 |
| https://grokarchivehub.com/news/phang-docket-watch/events/phang-dcd-1-26-cv-01417-ecf-16-ca8aa7f37003 | 200 | noindex,follow | noindex,follow | https://grokarchivehub.com/news/phang-docket-watch/events/phang-dcd-1-26-cv-01417-ecf-16-ca8aa7f37003 |
| https://grokarchivehub.com/news/phang-docket-watch/events/phang-dcd-1-26-cv-01417-ecf-19-915344289ced | 200 | noindex,follow | noindex,follow | https://grokarchivehub.com/news/phang-docket-watch/events/phang-dcd-1-26-cv-01417-ecf-19-915344289ced |
| https://grokarchivehub.com/news/phang-docket-watch/events/phang-dcd-1-26-cv-01417-ecf-20-9dc484318d5e | 200 | noindex,follow | noindex,follow | https://grokarchivehub.com/news/phang-docket-watch/events/phang-dcd-1-26-cv-01417-ecf-20-9dc484318d5e |
| https://grokarchivehub.com/news/phang-docket-watch/events/phang-dcd-1-26-cv-01417-ecf-21-01be5d0ae0e1 | 200 | noindex,follow | noindex,follow | https://grokarchivehub.com/news/phang-docket-watch/events/phang-dcd-1-26-cv-01417-ecf-21-01be5d0ae0e1 |
