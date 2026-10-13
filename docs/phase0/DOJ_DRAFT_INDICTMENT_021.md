# GAH-DOJ-DRAFT-021 — 2007 draft indictment source finder

**Scope:** Ren keyword #13, historically "2007 draft indictment, 56 pages."

**Status:** A distinct *publicly indexed document locator* is now verified: DOJ EFTA01703108, Data Set 10, referenced by a 56-page externally hosted file record. Full DOJ source-byte identity and revision-chain authentication remain OPEN.

## Source records inspected October 13, 2026

1. **Official government canonical source (age-gated):** https://www.justice.gov/epstein/files/DataSet%2010/EFTA01703108.pdf ; its unauthenticated direct HEAD request returned HTTP302 to DOJ age verification. Reference dataset: https://www.justice.gov/epstein/doj-disclosures/data-set-10-files .
2. **Public independent file record:** https://commons.wikimedia.org/wiki/File:Jeffrey_Epstein_federal_draft_indictment_2007.pdf , describing a 56-page 2007 draft attributed to the URL in (1), posted January 31, 2026. The publicly hosted PDF stream was independently retrieved on the authorized Mac, without retaining the file, and tested for a PDF header and EOF. Exactly **4,622,305 bytes**, SHA-256 **e31d4a34caaef4ac4e1feed526ee2b5cb6bab65164d91ea58fb2b7a3170668b0**. The Commons file record, not our byte-stream verifier, supplies the 56-page count.
3. **DOJ OPR executive summary (2020):** https://www.justice.gov/opa/press-release/file/1336416/dl?inline= . Describes May 2007 proposed 60-count charges and an 82-page supporting prosecution memorandum.
4. **DOJ Office of the Solicitor General briefing:** https://www.justice.gov/osg/media/1185486/dl?inline= . Earlier references describe a 53-page proposed federal indictment. The relationship between that draft and this 56-page scan is **not established** without versioned originals.

## Editorial guardrails

- A document's number of **pages**, a proposed indictment's number of **counts**, and a supporting memorandum's **pages** are distinct quantities.
- The 2007 document was a **draft**. Do not present it as a filed indictment, a court finding or a criminal conviction.
- Do not transcribe or reconstruct redactions, victim data or unverified identities; do not mirror full sensitive PDF.
- External Commons hash is not a cryptographic equality check against current DOJ bytes; age-gated canonical document could change or be versioned independently.
- Do not extrapolate source release existence into a complete accounting of all drafts and communications.
- This guide covers the exact-document search intent for Ren #13; it does **not** close full draft-version authenticity or original NPA communication reviews.

## Release scope

- New canonical document-finder page `/guides/epstein-2007-draft-federal-indictment` with no names other than that in the official record.
- Guide hub eighth article, linked from NPA chronology.
- Exact allowlisted clean URL in `FRONTDOOR_ROUTE_ASSETS` and dated sitemap entry.
- Offline tests verify source IDs/URLs, 53/56-page separation, 60-count and 82-page context, canonical, indexability, crosslinks and corrections.
- Continuous regression count: 28 → 29 suites. No payment or membership configuration changed.
