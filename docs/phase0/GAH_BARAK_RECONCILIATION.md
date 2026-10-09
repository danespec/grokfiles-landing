# GAH Barak Archive Reconciliation

**Subagent C — Barak Archive Reconstruction**
Date: 2026-10-09
Repo: `~/workspace/gah-repo`, branch `ren/production-snapshot-20261009`, commit `7bfc664`
Governing spec: `~/workspace/gah-repo/GAH_REBUILD_APPROVED_V2.md` (formal Barak reconciliation required before any public UI)

## Headline result

The three public figures **can be defined from in-repo metadata but cannot be row-level reconciled from this snapshot**:

- **19** = recovered parent messages (email headers + body reconstructed from Gmail-export PDF mirrors). Definition confirmed; **zero** of the 19 exist as records in the snapshot.
- **5,587** = attachment-backed slots = `missingParentWithAttachments`. The in-repo metadata explicitly defines these as slots whose **parent message is missing** but attachments exist. They are not recovered emails and must never be presented as such.
- **5,505** = metadata-only slots (index metadata only: no parent, no attachments).
- **Internal arithmetic does not close**: the metadata states 11,089 total email slots, but 5,587 + 5,505 = 11,092 (off by 3), and 19 + 5,587 + 5,505 = 11,111. The metadata does not state whether the 19 are included in the 11,089. **This is a hard blocker for public UI** — see §Blockers.
- The slot-level data needed to recount (`/assets/barak-archive-emails.json`, 11,089 rows; `/assets/barak-archive-pdfs.json`, 14,728 rows) is **absent from the snapshot** (deliberately excluded large data). The 19 parent PDFs are likewise absent.

## Method

All counts below were produced by parsing the snapshot, not by trusting prose:

- `assets/barak-data.v298.js` (and generations `-027`, `-036`, `-048`, `-050`): `window.BARAK_PORTAL_DATA` parsed as JSON; `items[]` counted by `type` / `sourceLabel`; `coverage.emailSourceRecovery` read verbatim. All five generations carry an **identical** `emailSourceRecovery` block and **zero items with a message body** in every generation (300–305 items each).
- `_worker.js`: `/barak` and `/barak/emails` route handlers inspected (`serveBarakPortalWithReviewLinks`, L5563; route table L262, L17724).
- Live pages `https://grokarchivehub.com/barak` and `/barak/timeline` and `/barak/emails` fetched as text and checked against the data (text fetch only, no browser interaction).

## Formal reconciliation table

| # | Category | In-repo figure | Definition (from data, not prose) | What it is NOT |
|---|----------|----------------|----------------------------------|----------------|
| A | Recovered parent messages | 19 (`coverage.emailSourceRecovery.recoveredEmail`) | Parent email records (sender, date, subject, body) reconstructed from matching Gmail-export PDF sources "where mailbox and slot aligned" (live `/barak/emails` text). No native `.eml`/`.html`/`.mbox` parents exist (`dockerParentFilesFound: 0`). | Not a count of anything downloadable in this snapshot; not a subset of B or C (B is defined as *missing* parent). |
| B | Attachment-backed slots | 5,587 (`attachmentBackedSlot` **=** `missingParentWithAttachments`) | Slots where the parent message is **missing** but attachment files are present. The equality of the two fields in the metadata is the definition: attachment-backed ⇔ missing parent with attachments. | **Not recovered emails. Not evidence of 5,587 emails.** The difference 5,587 − 5,505 = 82 is meaningless and must never be computed or implied. |
| C | Metadata-only slots | 5,505 (`metadataOnlySlot`) | Slots with index metadata only (subject/date/participants from the export index); no parent body, no attachments. | Not emails; not downloadable documents. |
| — | Total email slots | 11,089 (`sourceInputs.archiveEmailSlots`, `archiveIndex.emailCount`) | Stated total of the email-slot inventory. | **Does not equal B + C (11,092) nor A + B + C (11,111). See arithmetic audit.** |

Related inventory figures in the same `coverage` block (for Subagent B's manifest): `archivePdfFiles: 14728`, `archiveMailboxes: 122`, `enrichedEmailMetadataRows: 738`, `parentPdfMirrorsLinked: 738`, `adminParentPdfMirrors: 3680`, `reviewedEftaReceipts: 14`, `barak171PublicOpenSlots: 80`.

Category relationships (verified, no inference):
- A ∩ B = ∅ by definition (B requires a missing parent; A requires a recovered parent).
- A vs C: metadata does not state whether the 19 are inside or outside the 11,089 slot total.
- B and C are the two disjoint slot classes of the export inventory — **subject to the off-by-3 inconsistency below**.

## Arithmetic audit (blocker)

From `assets/barak-data.v298.js`, `coverage` block (identical in all five data-file generations):

- Stated total: `archiveEmailSlots = 11089`; `archiveIndex.emailCount = 11089` ✓ consistent with each other.
- B + C = 5587 + 5505 = **11092** ≠ 11089 → **off by 3**.
- A + B + C = 19 + 5587 + 5505 = **11111** ≠ 11089.

Neither composition closes. Possible explanations (all unverified): three slots double-counted across B/C; three slots removed after the total was computed; the 19 partially overlap a slot class. **No composition may be asserted in public UI until ChatGPT or Thomas resolves which is correct against the excluded slot-level JSON.**

## What the snapshot actually contains (counted)

`assets/barak-data.v298.js` `items[]`: **305 items**, zero with a message body field.

| type | count | sourceLabel | count |
|------|-------|-------------|-------|
| parent-pdf | 181 | parent_pdf_mirror | 181 |
| open-slot | 80 | open_receipt_slot | 80 |
| receipt | 25 | reviewed_efta_receipt | 14 |
| entity | 16 | entity_reference | 16 |
| audio / video / photo | 3 | mailbox_attachment | 9 |
| | | private_mailbox_attachment | 1 |
| | | mailbox_pdf | 1 |
| | | media_*_slot | 3 |

Notes:
- The 181 `parent-pdf` items are **EFTA-derived parent-PDF mirrors** (`parentPdfMirrorsLinked: 738` → 181 cards), not the 19 recovered Barak parents.
- The 80 `open-slot` items correspond to `barak171PublicOpenSlots: 80` (BARAK-171 broad discovery), not the email slots.
- The 25 `receipt` items include 14 reviewed EFTA receipts (`reviewedEftaReceipts: 14`) — these are the EFTA lane, correctly kept as separate source rows.
- **No `recovered_email` item type exists in any generation.** The live `/barak/emails` page says the lane "lists only recovered_email records" — the snapshot's data file contains none to list.

## Public claims check (live pages vs data)

1. `/barak`: *"Attachment-backed slots (5,587) and metadata-only records (5,505) are indexed separately and are not presented as full emails."* — **SUPPORTED** by the metadata definitions. Caveat: `_worker.js` L5572 rewrites "metadata-only placeholders" → "metadata-only records" (and "placeholder(s)" → "record(s)") on the `/barak` page at serve time. This softens the missing-data signal the v2 brief requires. **Recommend removing that rewrite.**
2. `/barak` timeline section: *"Only recovered parent messages appear here."* — **NOT SUPPORTED by visible data.** The live `/barak/timeline` renders 12 rows: 7 EFTA archive-message rows and 5 BARAK-174 people/entity rows. Zero recovered parent messages appear. Either the claim is aspirational or the timeline is mislabeled; it must be corrected before it anchors the viewer.
3. `/barak/emails`: *"Nineteen parent messages were recovered from matching Gmail-export PDF sources where mailbox and slot aligned."* — **Asserted in metadata only** (`emailSourceRecovery.recoveredEmail: 19`). No individual parent records exist in the snapshot to audit. **Unverifiable here; do not render the 19 as browsable records until the parent PDFs/records are produced.**
4. `/barak/emails`: *"The docker archive export contains attachment folders only: no native .html, .eml, or .mbox parent files were found."* — **SUPPORTED** (`dockerParentFilesFound: 0`).
5. `/barak/timeline`: single table mixing EFTA rows and BARAK-174 entity rows with a per-row "Source Lane" column. The lane column is good; the v2 brief requires **two separate tables** (Barak-archive rows vs EFTA rows that mention Barak). Current state is non-conformant with the approved spec.

## Viewer schema: `/barak/emails/{id}`

Three viewer states, one per reconciled category. Barak-export records and EFTA records remain distinct collections throughout; EFTA references appear only in a dedicated `related_efta` array, never merged into the Barak record.

**Stable ID scheme** (extends the existing `BARAK-{lane}-{seq}` pattern seen in `barak/timeline.html`, e.g. `BARAK-174-008`):
- Recovered parents: `BARAK-EML-{nnn}` (zero-padded, nnn = 001–019), e.g. `BARAK-EML-007`.
- Attachment slots: `BARAK-SLOT-{nnn}` (only if slot-level rows are ever published).
- Metadata slots: `BARAK-META-{nnn}` (only if published).
- Existing lanes keep their IDs (`BARAK-174-*`, `BARAK-171-*`, `BARAK-096-*`, `BARAK-PVT-*`).

### State 1 — `recovered_email` (the only full viewer)

```json
{
  "id": "BARAK-EML-007",
  "archive_id": "BARAK-EML-007",
  "collection": "barak-export",
  "record_class": "recovered_email",
  "thread": { "position": "2 of 5", "thread_id": "BARAK-THR-…", "in_reply_to": "BARAK-EML-006" },
  "date": "2013-05-09T10:25:00",
  "date_quality": "source-supported | partial | undated",
  "participants": { "from": "…", "to": ["…"], "cc": ["…"] },
  "subject": "…",
  "body": { "original_language": "en", "original_text": "…", "translation": null },
  "attachments": [
    { "name": "…", "sha256": "…", "size_bytes": 0, "access": "open | download | open-slot" }
  ],
  "recovery": {
    "method": "Gmail-export PDF mirror; mailbox and slot aligned",
    "parent_pdf_hash": "sha256:…",
    "native_parent_found": false
  },
  "what_shows": "…",
  "what_does_not_prove": "…",
  "confidence": { "label": "…", "basis": "transcription | identification | provenance" },
  "related_efta": [
    { "efta_id": "EFTA01975333", "relation": "same thread preserved in DOJ set 10; names OCR-degraded", "link": "/archive/EFTA01975333" }
  ],
  "corrections": [],
  "open_slots": []
}
```

### State 2 — `attachment_slot` (parent missing; attachments only)

Same envelope with `record_class: "attachment_slot"`, `body: null`, and a mandatory disclosure block:

```json
"missing_record_disclosure": {
  "missing": "parent message body",
  "present": "N attachment file(s)",
  "note": "The parent email was not recovered. Attachments are presented without the message they were attached to; do not infer sender, date, or subject from the attachments alone."
}
```

Attachments render with open/download where a public-safe file exists, otherwise an `open-slot` row. **The slot must never be titled or counted as an email.**

### State 3 — `metadata_slot` (metadata only)

Same envelope with `record_class: "metadata_slot"`, `body: null`, `attachments: []`, and:

```json
"missing_record_disclosure": {
  "missing": "parent message body and all attachments",
  "present": "export-index metadata only (subject/date/participants as indexed)",
  "note": "This is a placeholder row from the export index, not a document. It is not presented as an email and is excluded from email counts."
}
```

### Schema rules (non-negotiable)

- `confidence.basis` ∈ {transcription, identification, provenance}. Never allegation confidence (per v2 brief).
- `what_shows` / `what_does_not_prove` are mandatory on every state — reuse the existing `claim` / `silence` card fields (`assets/barak-data.v298.js` item fields) as the content source.
- `related_efta` entries are independent DOJ records; the viewer must label the collection boundary ("Barak export" vs "DOJ EFTA release").
- No `record_class` may be rendered with another class's affordances (no body viewer on a slot; no email count that includes slots).

## Verified vs unverifiable — split summary

**Verified from the snapshot:**
- Category definitions and the B = missingParentWithAttachments identity (`assets/barak-data.v298.js`, `coverage.emailSourceRecovery`).
- `dockerParentFilesFound: 0`; 122 mailboxes; 738 enriched metadata rows; 14 reviewed EFTA receipts; 80 BARAK-171 open slots.
- 305 portal items, zero message bodies, in all five data-file generations.
- The `/barak` page's "placeholder → record" text rewrite (`_worker.js` L5572).
- Timeline structure: 12 live rows, lane column present, single mixed table (non-conformant with v2 two-table rule).

**Unverifiable from the snapshot (evidence excluded):**
- The 19 individual recovered parent messages (no records, no bodies, no parent PDFs in-repo).
- The 5,587 / 5,505 slot counts at row level (`/assets/barak-archive-emails.json` absent; `/assets/barak-archive-pdfs.json` absent).
- The off-by-3 arithmetic (11,089 vs 11,092 vs 11,111) — needs the slot-level JSON.
- Whether the 19 sit inside or outside the 11,089 total.
- The `/barak/emails`, `/barak/pdfs`, `/barak/documents`, `/barak/legal`, `/barak/media` page templates (proxied from upstream origin, not in snapshot).

## Blockers needing ChatGPT or Thomas

1. **Resolve the off-by-3**: 11,089 stated total vs 5,587 + 5,505 = 11,092. Reconcile against `/assets/barak-archive-emails.json` (excluded from snapshot) and state explicitly whether the 19 recovered parents are inside or outside the 11,089. **No public UI renders these numbers until this closes.**
2. **Produce the 19 parent records** (or confirm their canonical location): sender/date/subject/body + parent-PDF hashes. The viewer schema above is ready, but there is nothing to display. If the 19 live outside the repo (NAS/production DB), document the source of truth and the sync path.
3. **Fix or retract** the live `/barak` claim "Only recovered parent messages appear here" — the timeline shows none.
4. **Remove the `_worker.js` L5572 "placeholder → record" rewrite** on `/barak`, or justify it; it conflicts with the v2 missing-record disclosure requirement.
5. **Split the timeline into two tables** per the approved v2 spec (Barak-archive rows vs EFTA rows), keeping the existing per-row Source Lane column.
6. Confirm whether `/barak/emails` (which "lists only recovered_email records") currently renders an empty lane in production given the data file contains zero such records.
