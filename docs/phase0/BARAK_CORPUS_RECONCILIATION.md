# Barak corpus reconciliation manifest

Generated 2026-10-09. Source-backed comparison of the Barak email-leak
corpus (local `barak_emails.db`, 31,718 emails) against the GAH site's
Barak inventory claims (19 recovered parents; 11,089 email slots).
**These are treated as separate collections throughout — no assumption
that they are the same collection.** No raw correspondence is published
below; only metadata, counts, and methodology.

## Corpus A — Barak email leak (local)

- Source: Internet Archive item `gmail-06`, 15 zips (`Gmail01.zip`–`Gmail15.zip`).
- Ingest: `barak_pipeline.py` → `barak_emails.db` (complete 2026-10-09).
- Records: **31,718 emails**; `COUNT(DISTINCT body_hash)` = 31,718 (exact-duplicate bodies deduped at ingest).
- Record identifiers: `(zip, folder, msg_id)` — e.g. `Gmail01/Inbox!1`, msg_id 847–1435. Folders follow Gmail-export label conventions (`Inbox`, `Inbox!1`, `Inbox!2`, …).
- Date range (25,666 with parseable dates): **2009-04-22 to 2016-03-23**.
- Bodies: full message bodies present for all 31,718 records.
- Per-zip counts: Gmail01 2,246; Gmail02 2,496; Gmail03 2,933; Gmail04 2,961; Gmail05 2,959; Gmail06 2,964; Gmail07 3,961; Gmail08 3,146; Gmail09 2,390; Gmail10 1,106; Gmail11 82; Gmail12 474; Gmail13 2,445; Gmail14 1,464; Gmail15 91.

## Corpus B — GAH site Barak inventory (snapshot `7bfc664`)

- Source: `assets/barak-data.v298.js` (`window.BARAK_PORTAL_DATA`), 305 items; five data generations carry an identical `emailSourceRecovery` block.
- Claimed slot inventory: **11,089 email slots** = 5,587 `missingParentWithAttachments` + 5,505 `metadataOnlySlot`. Slot-level source (`/assets/barak-archive-emails.json`, 11,089 rows) is **absent from the snapshot**.
- Claimed recovered parents: **19** (`coverage.emailSourceRecovery.recoveredEmail`), described as reconstructed from Gmail-export PDF sources "where mailbox and slot aligned". **No item-level identifiers for the 19 exist in the snapshot** — no subjects, dates, message IDs, or hashes; the 181 `parent-pdf` items are mirrors with redacted header/snippet fragments and zero message bodies.
- Record identifiers: `(mailbox, messageSlot)` — e.g. `Inbox|136`, `Inbox!1|144`. 181 distinct pairs.
- Arithmetic check: 5,587 + 5,505 = **11,092 ≠ 11,089** (off by 3); 19 + 5,587 + 5,505 = 11,111. The discrepancy is internal to the site's metadata.

## Join analysis

| Aspect | Corpus A (leak) | Corpus B (site) | Joinable? |
|---|---|---|---|
| Identifier namespace | `(zip, folder, msg_id)`; msg_ids in the hundreds–thousands (e.g. 268–845, 847–1435) | `(mailbox, messageSlot)`; slots like 22, 136, 412 | **No** — different schemes, no mapping published |
| Mailbox labels | `Gmail01/Inbox`, `Gmail01/Inbox!1` … | `Inbox`, `Inbox!1` … | Label families overlap, numbering does not align |
| Content | Full bodies | Redacted snippets only | No content join possible |
| The 19 parents | No identifiers to match against | No identifiers published | **Unmatchable** |

Attempted: direct join on mailbox/slot vs folder/msg_id — no reliable key.
Attempted: content match via snippet dates/subjects — snippets are redacted
(`[redacted entity]`, `[redacted path]`); no confident match. Not attempted:
publishing or quoting correspondence.

## Findings

1. **The 31,718-email leak cannot be shown to contain any of the 19.**
   The 19 have no published identifiers (subject, date, message ID, hash),
   so presence/absence in the leak is undeterminable from available sources.
   This is a provenance gap in the site's claim, not evidence about the leak.
2. **The leak does not resolve the 11,089-slot arithmetic discrepancy.**
   The discrepancy (11,092 vs 11,089) is internal to the site's slot metadata;
   the leak is a different collection counted in different units (emails vs
   slots). No reconciliation path exists between them.
3. **Corpus boundaries are distinct.** Leak: Barak Gmail 2009–2016, 31,718
   full-body emails, deduped. Site inventory: 11,089 claimed slots (metadata
   only) + 19 claimed recovered parents (metadata only) + 181 redacted
   mirrors. Treating the leak as the site's slot inventory would be a
   category error.
4. **Missing source artifacts** (blockers, unchanged): `/assets/barak-archive-emails.json`
   (11,089 rows), `/assets/barak-archive-pdfs.json` (14,728 rows), and the 19
   parent PDFs/records themselves.

## Method

All figures above were produced by SQL against `barak_emails.db` and by
parsing `assets/barak-data.v298.js` directly on 2026-10-09 — not by trusting
prose. Re-run: the queries are listed inline; the validator
`docs/phase0/validate_barak_deps.py` covers the site side.
