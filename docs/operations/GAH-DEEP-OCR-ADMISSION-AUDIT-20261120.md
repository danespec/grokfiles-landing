# GAH — Full-file OCR admission review

Date: November 20, 2026. Owner mandate: aggressively expand genuine EFTA discovery without abandoning protected identities, provenance or nonduplicate editorial context.

## Source-verified complete-OCR screening

After the previous 64 KB OCR screening produced 116,285 new EFTA candidates, the NAS completed a second pass against each **entire physical OCR text file**, with exact EFTA ID and source-PDF presence, a full SHA-256 content fingerprint, and risk-indicator inspection beyond the initial 64 KB window.

| Measure | Result |
|---|---:|
| Candidate EFTA IDs read | 116,285 |
| Exact OCR files resolved | 116,285 |
| Matching source PDFs present | 116,285 |
| Full OCR SHA-256 fingerprints | 116,285 |
| Files with OCR extending beyond 64 KB | 117 |
| Additional risk indicators found later in document | 24 |
| No additional risk markers beyond the previous scan | **116,261** |
| Read errors | 0 |
| Full OCR bytes hashed | 275,332,614 |

Risk categories overlap: 20 additional address matches, three telephone patterns, one identity-number pattern, and two protected-context patterns. The 24 are on hold pending targeted review. None of the broader files is automatically approved for public indexing just because simple patterns did not trigger.

## Content quality and duplicate check

Among the 116,261 deeper-screened candidates:
- **116,261 unique SHA-256 full-OCR fingerprints**; zero byte-for-byte duplicate groups *within this candidate set*. This does not rule out near-duplicates, document series variations, or duplicates with the existing 12,100 published pages.
- Median raw OCR length: 1,524 bytes; 90th percentile: 4,507 bytes.
- Exact full OCR byte distributions: 56,914 at 800–1,499 bytes; 26,748 at 1,500–2,399; 17,417 at 2,400–3,999; 13,431 at 4,000–7,999; 1,337 at 8,000–15,999; 414 at 16,000+.
- **15,182 candidates contain at least 4 KB of OCR**, have a source PDF, have a unique candidate-set fingerprint, and triggered no additional risk indicator in the full-file scan. This is a **review-priority tier**, not a cap or a publishing approval.

An EFTA file can contain a protected name without containing a literal risk-marker term. Further source and privacy review remains necessary before Google indexing or excerpt publication. Brief source stubs should remain discoverable by exact-ID/keyword catalog search rather than be mass-promoted to thin indexable pages.

## Delivery and custody

- Reproducible offline scanner: backend/wiki-deep-ocr-20261120/deep-ocr-review.cjs.
- Aggregate, non-identifying results and tests are committed to repository.
- Full private review manifest with per-ID SHA-256, OCR length, source flags and risk category is stored with chmod 600 in the authorized NAS user directory gah-unified-efta-private-20261120. Do not copy that manifest into public static assets or GitHub.
- The live wiki has already deployed ID-only full-text search across the existing 670,469-document Meilisearch index. The 12,100 previously approved EFTA source URLs and the 89 wiki research URLs retain their existing indexing policy; search-query results are noindex.

## Privacy hardening of live keyword search

The keyword search form uses POST with a 4 KB request limit. The search term is in the request body, not a query-string URL that Google Analytics could capture. The resulting HTML does not echo the submitted query; it returns only exact EFTA IDs and source-format labels. Legacy GET searches display the form without running the query. CSP, no-store, noindex and no ad restrictions remain.
