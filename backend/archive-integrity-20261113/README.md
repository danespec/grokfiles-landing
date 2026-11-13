# Archive integrity repair — 2026-11-13

The archive linked identifier strings from OCR as if each were a standalone document. Some are Bates pages within another PDF. This release adds explicit, verified page mappings without publishing transcripts or expanding archive sitemaps.

- The NAS gateway loads a private reviewed registry. It checks exact file hashes, identifier/path correspondence, bounds and existing missing-source guards. Unknown or changed sources fail closed.
- Mapped archive records remain noindex and ad-excluded. Metadata distinguishes a Bates page from a standalone document. PDF requests redirect to the existing parent PDF with its page fragment.
- The Pages Worker retains its transcript privacy shield and displays only validated parent/page headers from the source gateway.
- Automatic related links require a resolvable source or a verified mapping. At most 64 unique candidates are checked; there is no request-time corpus scan.
- A registry entry can restore an already published dossier's physical PDF without inventing OCR text. The source response explicitly marks OCR unavailable.

The private registry, corpus inventories, physical file hashes and reconciliation ledger are retained outside this public repository. Only mappings verified against printed PDF identifiers and already available parent sources are activated. OCR mentions alone do not authorize publication.

Run:
```sh
node backend/archive-integrity-20261113/test-archive-integrity.mjs
node backend/archive-integrity-20261113/test-worker-integrity.mjs /private/path/gateway.candidate.js /private/path/staging-response-fixtures.json
python3 backend/archive-integrity-20261113/patch_gateway.py INPUT_SERVER OUTPUT_SERVER
```

Apply the patch independently to runtime and stored-source baselines; do not interchange them. Stage against the current image with unchanged credentials, read-only corpus mounts and backend hostname mappings. Verify parent delivery/ranges, missing guards, source/metadata, search, public canonical/noindex behavior and editorial controls before promotion.

Rollback the NAS gateway using its private pre-release runtime snapshot and stored-source backup; restore the configured image and any affected registry files. Roll back Pages to its recorded pre-release deployment. Restore only changed index records if a separate metadata repair was applied. Do not alter WAF, Access, monetization or sitemap policies.
