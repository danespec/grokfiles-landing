# GAH-BARAK-LEDGER-036 — Verified item-level ledger and public count

Date: October 13, 2026. Read-only aggregate audit; no private messages
or individual subject/address/person details exported. Primary issue #35.

## Sources and provenance

- Current private NAS emails: 11,089 records; SHA256
  38ebc8dbe4906c1fe6132b75f2af2d5cf690e5c829d34615fddf514d74d3bb73
- Earlier NAS HTML-site emails: 11,089 records; SHA256
  143775c906197ed527001a255d5cda9706ce87f1a035cd636dff92095af7695b
- Private NAS PDFs: 14,728 records; SHA256
  117f241ab522c6141bb203c935df3a7bd266ac285dd0292ee57a407fc120ce02
- PDF source manifest: 14,728 keys; SHA256
  4e98968844892cef7fbe5552cf6a505134209407e7a40caef9f0574f3e9b0d23
- Private owner Mac JSON workpaper mode 0600:
  ~/_gah_builds/GAH-BARAK-LEDGER-036-private/source-ledger-reconciliation-20261013.json
- Reproducer: scripts/barak/reconcile_inventory_036.py, accepts only
  authorized local/NAS JSON paths; prints only structural counts and hashes.

## Inventory reconciliation

| Population | Verified count |
| --- | ---: |
| Current row IDs, unique | 11,089 |
| Attachment-backed rows | 5,587 |
| Metadata-only rows | 5,483 |
| Recovered_email-labeled rows | 19 |
| Distinct (mailbox,messageSlot) groups | 7,310 |
| Groups with one classified row | 3,531 |
| Groups with exactly two classified rows | 3,779 |
| Attachment-only groups | 1,824 |
| Metadata-only groups | 1,704 |
| Recovered-only groups | 3 |
| Attachment+metadata groups | 3,763 |
| Metadata+recovered groups | 16 |
| PDF records | 14,728 |
| Unique PDF IDs | 14,728 |
| Unique PDF sourceSid records/manifest keys | 14,728 |
| Email-to-PDF links | 14,728 |
| PDFs inversely linked to a known email row | 14,728 |
| PDFs with equal parentMailbox/messageSlot to parent email row | 14,728 |
| PDF-linked email rows | 5,603 |
| Recovered-label rows with linked PDFs | 16 (43 links) |
| Recovered-label rows without linked PDFs | 3 |

All source-to-manifest, email-to-PDF, PDF-to-email and mailbox/slot
reverse-link invariants passed. Zero orphan PDFs, missing manifest SIDs,
duplicate IDs, duplicate PDF links or mismatched inverse joins.

The 3,779 two-record groups are two CLASSIFICATIONS of the same
mailbox/slot key, not duplicate row IDs. Do NOT conflate 11,089
archive rows, 7,310 mailbox/slot groups, 5,603 PDF-linked rows,
31,718 leak-corpus messages or any other email collection.

## Recovered label is not authentication

Current sourceVerificationStatus: 5,606 rows
'unverified_shared_source_link', 5,483 rows missing that status.
All 19 recovered-labeled rows are UNVERIFIED in the current ledger.
An archive label, internal PDF index and reciprocal foreign key cannot
prove that a native parent .eml/.mbox original existed or that sender,
body or actual transmission is authenticated. Three recovered-label
rows have no linked PDF IDs, though have a parent mirror label;
the remaining 16 have 43 linked PDF entries. Do not generalize the
presence of a mirror label to an authenticated original email.

Current vs earlier emails: identical 11,089 IDs, classifications,
mailbox/slot fields, linkedPdfIds, source labels, subject/snippet
and other compared editorial fields. Exactly 5,606 records changed
sourceFileEnabled / sourceVerificationStatus to appropriately flag
the linked content as unverified and disabled. Raw correspondence
was not compared, copied or published as part of this read-only audit.

## Live-site correction

The active browser loads assets/barak-data-050.js, which ALREADY shows
Metadata-only slots=5,483. The older accessible v298 JS says 5,505
but is NOT loaded by current Barak pages. Do not alter that inactive
historical asset for this fix. The /barak landing HTML independently
had a hardcoded phrase wrongly saying 5,505 metadata-only and implying
its 19 recovered-labeled items were fully authenticated parent messages.

This release qualifies that exact live public paragraph through the
existing Pages Worker proof-layer HTML route, with 5,587, 5,483 and 19
row counts and an explicit non-authentication qualifier. It leaves
current live JS, corpus exports, source/PDF assets, other pages,
PDF.js, rate limiting, Access, Bot Fight, AdSense status, IndexNow
and all index/sitemap declarations unchanged.

Tests cover synthetic finite-source reconciliation, intentionally
broken foreign key rejection, pure HTML transform idempotence,
existing current data summary, and the full Phase0 regression suite.
Stage and production must separately pass public route/security smoke.

## Open gate

**Row accounting complete, original email authenticity NOT proven.**
Keep issue #35 OPEN for authenticated parent originals, original PDF
document provenance/bitmaps, privacy and legal review. Do not
publish private communications or claim misconduct by association.

Owner explicitly requires /photos remain indexed; this release does
not change photo access, sitemap entries, or indexing. AdSense
resubmission remains separate pending owner account/privacy gates.