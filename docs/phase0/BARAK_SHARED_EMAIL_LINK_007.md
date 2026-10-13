# REN-BARAK-SOURCE-007 — Shared email source-link remediation

**Source:** Private, unchanged Barak NAS manifest (11,089 email rows) and independently sampled public PDF responses, October 12, 2026.

## Verified discovery

- Original `barak-archive-emails.json` SHA-256: `143775c906197ed527001a255d5cda9706ce87f1a035cd636dff92095af7695b`.
- 5,603 email rows had an enabled `sourceFile` link: 5,587 attachment-backed slots and 16 archive-labeled recovered-email rows. All 5,603 links were **exactly the same** URL/source ID. The other three recovered-email rows had no source link.
- The shared endpoint returned a one-page, 10,605-byte scanned institutional-letterhead PDF (SHA-256 `c942c3a25e8eb2b8a6e3adfbe62b93f1976950e84356d76e782b61a1cec9762e`). Its observed content cannot substantiate 5,603 distinct email records or 16 recovered parent bodies. Do not characterize it as an email PDF or as proof of misconduct.
- The separate `barak-archive-pdfs.json` inventory has 14,728 distinct source URLs. A bounded independent sample of eight returned valid, differently hashed PDFs. Sampling does not validate all 14,728, and no PDF text or private identifiers were published.

## Fix and acceptance boundary

1. **Public manifest review candidate** privately replaces shared `sourceFile` on all 5,603 affected email rows with an empty value, sets `sourceFileEnabled=false` for all 5,606 nonmetadata email slots (including three originally unlinked recovered rows), and adds `sourceVerificationStatus=unverified_shared_source_link`. Every other record ID, archived class, attachment join, mailbox key, and primary field remains unchanged.
2. **Viewer defense in depth:** deny direct source PDF actions for all `email` rows, even if older cached JSON advertises a source URL; retain the link action for individually sourced `pdf` records. Label recovered-class parent source identity and the legacy `parentPdfMirror` flag as **unverified**. Distinguish attachments from parent messages.
3. **Testing:** `tests/test_barak_source_link_integrity.mjs` checks 10 explicit link and language cases; all 16 Phase 0 regression suites must pass.
4. **Release:** keep the original unmodified manifest in a mode-0600 NAS owner-only backup and the browser-script backup before atomic deployment. Verify active NAS and public JSON reflect 0 email source links, 11,089 unchanged email rows, 14,728 unchanged PDF records, and no UI action linking email slots to the shared PDF.
5. **Rollback:** use the preserved original SHA above and a separately verified original viewer SHA. Restore both atomically if any source IDs/classes or attachment links regress.

This does **not** verify the 19 recovered parents, resolve all duplicate mailbox-slot keys, validate each attachment PDF, or approve public counts. The source-identity gate stays **BLOCKED** until parent evidence is individually authenticated. No original email contents, personal identifiers, or raw source manifests are committed to GitHub.
