# Source PDF and editorial completion

The handoff exposed a real gap: the previous HTML-only graph excluded source assets and query-bearing viewer routes. Evidence PDF paths were excluded from the Worker, allowing Pages fallback HTML to bypass the missing-asset guard. The PDF exclusion is removed; missing PDF paths now return real 404s. CI checks the route coverage and source byte hashes.

Restored 49 PDF assets from acquisition manifests, all matching recorded SHA-256 hashes. Removed direct links to 37 unavailable PDF copies, retaining citation text and an unavailable label. The Book of Black source remains acknowledgement-protected; anonymous requests still return 403, and public HTML links to the reader notice instead of directly to the protected PDF. Existing reader data attributes and controls are preserved.

Replaced mechanical metadata truncation with complete reviewed headlines and source-specific descriptions, preserving EFTA identifiers. All 336 indexable self-canonical HTML pages pass length and ellipsis checks. The two previously thin descriptions are expanded. Internal source .html links and PDF-viewer links now use their final destinations. Barak receipts/timeline lead with published reading and label source lookups; source citations remain available. Remaining internal discovery wording and GROK marker comments are removed.

The research MCC timeline remains primary. All three companion pages are noindex,follow, declare the primary canonical and remain accessible outside the sitemap. Main editorial inventory is 193 pages plus 69 dossiers; wiki inventory is 74. Existing bot exclusions and the accepted robots formatting exception are unchanged.

## Live results

| Check | Result |
|---|---|
| Linked PDF GET and HEAD | 49/49 return 200 application/pdf; bytes and acquisition hashes match |
| Fake PDF paths | Both tested URLs return 404 |
| Internal destination redirects | 0 among 829 tested destinations |
| Indexable metadata | 336 pages; 0 ellipsis titles or descriptions |
| Research ownership/indexing | 78 contracts pass |
| Indexable jargon scan | 0 matches outside the stated policy pages |

## Hub outbound links

Counts include duplicate outbound anchors and exclude same-page fragment links. File/data links are shown separately from HTML destinations. Noindex source tools are labelled rather than promoted into editorial pages.

| Hub | Indexable HTML | Noindex HTML | Source files/data | Actions/other | Labelled lookups |
|---|---:|---:|---:|---:|---:|
| https://grokarchivehub.com/barak | 35 | 11 | 0 | 1 | 0 |
| https://grokarchivehub.com/barak/receipts | 62 | 48 | 0 | 0 | 26 |
| https://grokarchivehub.com/barak/timeline | 61 | 31 | 1 | 0 | 12 |
| https://grokarchivehub.com/investigations/new-mexico-doj-epstein-records | 53 | 17 | 184 | 1 | 0 |
| https://wiki.grokarchivehub.com/research-index | 13 | 4 | 0 | 1 | 0 |

## PDF checks by URL

| URL | GET | HEAD | MIME |
|---|---:|---:|---|
| https://grokarchivehub.com/evidence-data/doug-band/source/pdfs/doj-phase-one-flight-log-released-us-v-maxwell-2025-02-27.pdf | 200 | 200 | application/pdf |
| https://grokarchivehub.com/evidence-data/doug-band/source/pdfs/house-oversight-doug-band-final-transcript-2026-06-30.pdf | 200 | 200 | application/pdf |
| https://grokarchivehub.com/evidence-data/doug-band/source/pdfs/house-oversight-doug-band-ti-request-letter-2026-03-03.pdf | 200 | 200 | application/pdf |
| https://grokarchivehub.com/evidence-data/doug-band/source/pdfs/house-oversight-gates-transcript-2026-06-10.pdf | 200 | 200 | application/pdf |
| https://grokarchivehub.com/evidence-data/doug-band/source/pdfs/house-oversight-groff-transcript-2026-06-09.pdf | 200 | 200 | application/pdf |
| https://grokarchivehub.com/evidence-data/doug-band/source/pdfs/house-oversight-kathryn-ruemmler-ti-request-2026-03-03.pdf | 200 | 200 | application/pdf |
| https://grokarchivehub.com/evidence-data/doug-band/source/pdfs/house-oversight-leon-black-final-transcript-2026-07-16.pdf | 200 | 200 | application/pdf |
| https://grokarchivehub.com/evidence-data/efta-compliance/source/pdfs/ecf25_notice_compliance.pdf | 200 | 200 | application/pdf |
| https://grokarchivehub.com/evidence-data/efta-compliance/source/pdfs/ecf26_attachment1_proposed_order.pdf | 200 | 200 | application/pdf |
| https://grokarchivehub.com/evidence-data/efta-compliance/source/pdfs/ecf26_motion_intervene.pdf | 200 | 200 | application/pdf |
| https://grokarchivehub.com/evidence-data/efta-compliance/source/pdfs/phang-v-blanche-ecf-15-order-2026-06-25.pdf | 200 | 200 | application/pdf |
| https://grokarchivehub.com/evidence-data/efta-compliance/source/pdfs/phang-v-blanche-ecf-16-memorandum-opinion-2026-06-25.pdf | 200 | 200 | application/pdf |
| https://grokarchivehub.com/evidence-data/efta-compliance/source/pdfs/phang-v-blanche-ecf-19-doj-show-cause-response-2026-07-02.pdf | 200 | 200 | application/pdf |
| https://grokarchivehub.com/evidence-data/efta-compliance/source/pdfs/phang-v-blanche-ecf-20-1-proposed-order-2026-07-13.pdf | 200 | 200 | application/pdf |
| https://grokarchivehub.com/evidence-data/efta-compliance/source/pdfs/phang-v-blanche-ecf-20-plaintiff-response-2026-07-13.pdf | 200 | 200 | application/pdf |
| https://grokarchivehub.com/evidence-data/efta-compliance/source/pdfs/phang-v-blanche-ecf-21-1-addendum-2026-07-15.pdf | 200 | 200 | application/pdf |
| https://grokarchivehub.com/evidence-data/efta-compliance/source/pdfs/phang-v-blanche-ecf-21-motion-to-intervene-2026-07-15.pdf | 200 | 200 | application/pdf |
| https://grokarchivehub.com/evidence-data/efta-compliance/source/pdfs/us-v-maxwell-ecf-863-doj-opposition-2026-06-24.pdf | 200 | 200 | application/pdf |
| https://grokarchivehub.com/evidence-data/leon-black/source/pdfs/house-oversight-band-transcript-2026-06-30.pdf | 200 | 200 | application/pdf |
| https://grokarchivehub.com/evidence-data/leon-black/source/pdfs/house-oversight-gates-transcript-2026-06-10.pdf | 200 | 200 | application/pdf |
| https://grokarchivehub.com/evidence-data/leon-black/source/pdfs/house-oversight-groff-transcript-2026-06-09.pdf | 200 | 200 | application/pdf |
| https://grokarchivehub.com/evidence-data/leon-black/source/pdfs/house-oversight-leon-black-final-transcript-2026-07-16.pdf | 200 | 200 | application/pdf |
| https://grokarchivehub.com/evidence-data/leon-black/source/pdfs/house-oversight-leon-black-ti-request-2026-03-03.pdf | 200 | 200 | application/pdf |
| https://grokarchivehub.com/evidence-data/new-mexico-doj/source/pdfs/courtlistener-maxwell-810.pdf | 200 | 200 | application/pdf |
| https://grokarchivehub.com/evidence-data/new-mexico-doj/source/pdfs/courtlistener-maxwell-811.pdf | 200 | 200 | application/pdf |
| https://grokarchivehub.com/evidence-data/new-mexico-doj/source/pdfs/courtlistener-maxwell-813.pdf | 200 | 200 | application/pdf |
| https://grokarchivehub.com/evidence-data/new-mexico-doj/source/pdfs/courtlistener-maxwell-819.pdf | 200 | 200 | application/pdf |
| https://grokarchivehub.com/evidence-data/new-mexico-doj/source/pdfs/courtlistener-maxwell-820.pdf | 200 | 200 | application/pdf |
| https://grokarchivehub.com/evidence-data/new-mexico-doj/source/pdfs/courtlistener-maxwell-823.pdf | 200 | 200 | application/pdf |
| https://grokarchivehub.com/evidence-data/new-mexico-doj/source/pdfs/courtlistener-maxwell-826.pdf | 200 | 200 | application/pdf |
| https://grokarchivehub.com/evidence-data/new-mexico-doj/source/pdfs/courtlistener-maxwell-839.pdf | 200 | 200 | application/pdf |
| https://grokarchivehub.com/evidence-data/new-mexico-doj/source/pdfs/courtlistener-maxwell-845.pdf | 200 | 200 | application/pdf |
| https://grokarchivehub.com/evidence-data/new-mexico-doj/source/pdfs/courtlistener-maxwell-846.pdf | 200 | 200 | application/pdf |
| https://grokarchivehub.com/evidence-data/new-mexico-doj/source/pdfs/courtlistener-maxwell-847.pdf | 200 | 200 | application/pdf |
| https://grokarchivehub.com/evidence-data/new-mexico-doj/source/pdfs/courtlistener-maxwell-848.pdf | 200 | 200 | application/pdf |
| https://grokarchivehub.com/evidence-data/new-mexico-doj/source/pdfs/courtlistener-maxwell-849.pdf | 200 | 200 | application/pdf |
| https://grokarchivehub.com/evidence-data/new-mexico-doj/source/pdfs/doj-2025-12-19-congress-letter.pdf | 200 | 200 | application/pdf |
| https://grokarchivehub.com/evidence-data/new-mexico-doj/source/pdfs/doj-2026-01-30-congress-letter.pdf | 200 | 200 | application/pdf |
| https://grokarchivehub.com/evidence-data/new-mexico-doj/source/pdfs/doj-2026-02-14-congress-letter.pdf | 200 | 200 | application/pdf |
| https://grokarchivehub.com/evidence-data/new-mexico-doj/source/pdfs/doj-efta-review-protocol.pdf | 200 | 200 | application/pdf |
| https://grokarchivehub.com/evidence-data/new-mexico-doj/source/pdfs/govinfo-cfr-28-part16-pdf.pdf | 200 | 200 | application/pdf |
| https://grokarchivehub.com/evidence-data/new-mexico-doj/source/pdfs/govinfo-plaw-119-38-efta.pdf | 200 | 200 | application/pdf |
| https://grokarchivehub.com/evidence-data/new-mexico-doj/source/pdfs/nmd-2026-06-30-letter.pdf | 200 | 200 | application/pdf |
| https://grokarchivehub.com/evidence-data/new-mexico-doj/source/pdfs/nmd-efta-ii-draft.pdf | 200 | 200 | application/pdf |
| https://grokarchivehub.com/evidence-data/new-mexico-doj/source/pdfs/nmlegis-hisc-jun01-agenda.pdf | 200 | 200 | application/pdf |
| https://grokarchivehub.com/evidence-data/new-mexico-doj/source/pdfs/nmlegis-hisc-jun01-handout.pdf | 200 | 200 | application/pdf |
| https://grokarchivehub.com/evidence-data/new-mexico-doj/source/pdfs/nmlegis-hisc-jun18-agenda.pdf | 200 | 200 | application/pdf |
| https://grokarchivehub.com/evidence-data/new-mexico-doj/source/pdfs/nmlegis-hr1-final.pdf | 200 | 200 | application/pdf |
| https://grokarchivehub.com/evidence-data/new-mexico-doj/source/pdfs/nmlegis-hr1-fir.pdf | 200 | 200 | application/pdf |

## Missing and protected sources

- https://grokarchivehub.com/evidence-data/zzz/nope.pdf — 404
- https://grokarchivehub.com/nonexistent-source-check.pdf — 404
- https://grokarchivehub.com/book-of-black/source/Book_of_Black_V6HHT.pdf — anonymous 403, no direct public HTML href

See ninth-pass-acceptance.json for hashes, response details, runtime guard proofs and graph scope. Search Console rankings, other edge regions, external DOJ availability and authenticated reader downloads are not claimed by these anonymous checks.
