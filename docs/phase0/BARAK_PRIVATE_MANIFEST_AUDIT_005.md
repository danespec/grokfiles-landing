# Barak manifest audit 005 — private aggregate verifier

This audit is a **review tool**, not a reconciliation announcement or a publication of private correspondence.

Run `python3 scripts/barak/audit_slot_manifest.py --emails PATH_TO_PRIVATE_EMAIL_MANIFEST --pdfs PATH_TO_PRIVATE_PDF_MANIFEST` **only in an authorized private environment**. The tool emits aggregate counts, duplicate-key intersection patterns, source SHA-256 hashes and outstanding acceptance gates. It does not print individual rows, source paths, mailboxes, names, recipient addresses, subject lines, or content excerpts. Review output privately before publication.

Distinct `archiveId` values do **not** establish that identical `(mailbox, messageSlot)` pairs represent distinct canonical emails. The script reports both populations and leaves the public count gate blocked pending source-identity adjudication. A syntactically present parent mirror or PDF link does **not** independently verify its provenance or the 19 recovered parent bodies. Linked PDF inventory rows are counted separately from email/slot rows.

Any public number requires an independent, redacted exception ledger; source-document hashes for each recovered parent; documented key semantics; a reviewed data contract; and editorial privacy approval. Do not import raw mailbox data into GitHub, the site, Zenodo, DocumentCloud, or a public log through this workflow.
