# GAH-BARAK-RECOVERED-030 — reference integrity, not parent recovery

This is a metadata-and-structure audit, NOT certification of 19 recovered parent email bodies.

## First-party live snapshot checked October 13, 2026
- 11,089 email inventory rows; SHA-256 38ebc8dbe4906c1fe6132b75f2af2d5cf690e5c829d34615fddf514d74d3bb73.
- 14,728 PDF inventory rows; SHA-256 117f241ab522c6141bb203c935df3a7bd266ac285dd0292ee57a407fc120ce02.
- Nineteen archive-labeled recovered email rows; 16 contain a total of 43 DISTINCT PDF reference IDs, and three contain none.
- All 43 referenced IDs resolve to PDF inventory entries with syntactically allowlisted source URLs.
- An authorized Mac independently streamed exactly 43 referenced PDFs: 43 valid PDF header/EOF signatures and 43 distinct response SHA-256 hashes. HTTPS only, 15-second and 25 MB cap per response, at most two simultaneous transfers.
- The private owner-only digest ledger preserves record-specific evidence off GitHub (file permissions 0600); no PDF bodies or original correspondence retained.

These facts verify reference mapping and bounded response-byte integrity, not recovery, authorship, or chain-of-custody of the claimed parent email bodies. The three unlinked rows are unverified, NOT proven missing/withheld documents.

## Reproduce without republishing original manifests
Use scripts/barak/audit_recovered_references.py with --email-manifest and --pdf-manifest pointing to owner-authorized local files. Supply --expect-email-sha256 and --expect-pdf-sha256 with the hashes above; use --require-clean to reject unresolved references. The tool emits aggregate counts/hashes only and performs no network fetch. Offline fixtures: tests/test_barak_recovered_references_030.py.

## Open editorial/source gates
Source and authenticate each of the 19 alleged recovered parent bodies; reconstruct original parent-to-slot lineage, verify PDF/content hashes and document versions, and reconcile unique messages against separate email corpora without relying on overlapping slot keys. Keep issue #35 PARTIAL/OPEN. No new public allegations, private IDs, or commercial/security changes are authorized.
