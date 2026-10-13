# REN-BARAK-ATTACHMENT-011: Bounded PDF Attachment Hash Census

**Release gate:** private provenance audit; **publication status: BLOCKED** until source identity, rights, and the relevant parent-document joins are independently established.

## Scope and observed baseline

The Barak PDFs inventory contains **14,728** records with unique PDF inventory IDs and URL fields. The earlier email-slot manifest (11,089 records) had a separate, remediated problem: 5,603 email rows linked to the same non-specific letterhead PDF. Email parent bodies remain **unverified** and must not be inferred from attachment presence.

On October 12, 2026 (Mac local time), the first **100** bounded attachment fetches succeeded: all 100 returned structurally complete PDF bytes (header `%PDF-` and end marker `%%EOF`), with **100 distinct SHA-256 hashes** across this sample. That validates the bytes returned for the sampled URLs at the moment of access; it does **not** prove authenticity, complete corpus coverage, corresponding email-parent identity, or safety of public redistribution.

The individual `record_id`, returned byte size, hash and UTC check time are kept in an **owner-only private ledger outside the repository**. Never publish the raw inventory, ledger, private correspondence, EFTA-derived excerpts or user identifiers via this release.

## Reproduction

The script `scripts/barak/audit_attachment_pdfs.py` reads an owner-authorized JSON file with an `items` list containing `id` and `sourceFile`. It rejects duplicate or blank record IDs and all non-allowlisted URL forms. It streams one PDF at a time using HTTPS only, a bounded transfer time and size cap, and writes only digest metadata.

Example **after** the inventory is obtained lawfully in a private environment:

```bash
python3 scripts/barak/audit_attachment_pdfs.py \
  --inventory /private/path/barak-archive-pdfs.json \
  --ledger /private/owner-only/barak-pdf-audit.jsonl \
  --limit 100 --timeout 20 --max-mb 25
```

The ledger is append-only and its existing record IDs are skipped on subsequent runs, so rerunning this command processes up to 100 previously unchecked records. Errors are recorded as **unavailable** and are not evidence of nonexistent documents. An auditor may separately review failed entries and their retry policy.

No document contents are saved to disk. The script never follows redirects to another host, never accepts arbitrary external URLs or filesystem paths, and never removes original evidence. It does not automatically publish results.

## Release tests and acceptance

`tests/test_barak_attachment_integrity.py` has synthetic-only tests for URL allowlisting, HTTPS-only fetch behavior, SHA-256 calculation, HTML/corrupt PDF rejection, bounded output size, HTTP failures, resumability, owner-only ledger permissions and duplicate inventory IDs. The full Phase 0 regression suite must pass in GitHub Actions before this script is merged.

A fully validated attachment census also requires stable release versioning, repeated 404/403/error triage, per-file bytes and hashes, source-document and EFTA lineage, deduplication semantics, privacy/editorial review, and verified parent-versus-attachment joins. **No public counts, narrative allegations, or source-authenticity claims are authorized by a successful PDF-structure audit alone.**

Related: issue #35 (Barak count/recovered-parent gate), PRs #49, #50 and #52.
