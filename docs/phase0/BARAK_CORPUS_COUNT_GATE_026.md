# GAH-BARAK-COUNT-026 — Reconciliation acceptance gate

**Status: OPEN — do not describe the inventory as reconciled.** Reviewed October 11, 2026. This document describes *source-labeled populations*, not a master email count. It does not publish raw correspondence, personal data, or unverified persons.

## October 12 source-verified update (supersedes historical site counter)

The recovered *public* email-slot manifest is now independently accessible from the verified wiki archive. Its actual corrected bytes (SHA-256 `38ebc8dbe4906c1fe6132b75f2af2d5cf690e5c829d34615fddf514d74d3bb73`) contain **11,089 distinct row IDs and archive IDs**, with a **mutually exclusive, exhaustive partition of manifest rows**:

- **5,587** `attachment_backed_slot` rows; **5,483** `metadata_only_slot` rows; **19** `recovered_email`-labeled rows. Total **5,587 + 5,483 + 19 = 11,089**. Zero unlabeled or unknown-class rows, zero missing mailbox/slot values, and zero enabled direct email-source links after the separate PR #49 remediation.
- There are **7,310** distinct normalized `(mailbox, messageSlot)` pairs and **3,779** repeated-pair groups (7,558 rows). Each row has a unique ID, but the repeated keys **do not establish** independent email messages or explain whether duplication is intentional. A group ID/slot is not a cryptographically authenticated parent.
- The prior **5,505 metadata-only** portal counter is an outdated *display label*, not a supported class count in the hash-verified 11,089-row snapshot. Its historical mismatch (**11,092**, over by three if adding only attachment and metadata counters) is retained below as the October 11 finding, **not** as the corrected present-state result.
- The updated `assets/barak-data-050.js` active data source now reports **5,483** metadata-only *inventory rows* in both `sourceTypeCounts` and `emailSourceRecovery`, and the viewer labels the **19** as *archive-labeled recovered slots (unverified)*. Older versioned data scripts remain immutable historical snapshots, not the active routed payload.
- This is a **row-class reconciliation only**. There are **zero independently authenticated recovered parent bodies** in this audit; it does not certify attachment authenticity, prove 7,310 unique messages, or join the separate 31,718 full-body/40,976 HTML corpora. This is **not a master email count**.

Reproduce the observed row-level aggregate with `python3 scripts/barak/reconcile_slot_classes.py --manifest /private/owner-only/barak-archive-emails.json --expect-sha256 38ebc8dbe4906c1fe6132b75f2af2d5cf690e5c829d34615fddf514d74d3bb73`. The private data file must never enter GitHub. This command only emits aggregate counts, SHA-256, missing-key and source-link flags. The source-document authenticity gate remains **OPEN/BLOCKED**; this addendum **supersedes the outdated "row-level copy missing" requirement** in the historical October 11 acceptance checklist below.

## Independent datasets, distinct counting units

| Dataset / checkpoint | Unit | Count | Source & custody | Join readiness |
|---|---|---:|---|---|
| Site Barak archive inventory | email slots | **11,089** | `assets/barak-data-050.js`, `coverage.sourceInputs.archiveEmailSlots`, also older `assets/barak-data.v298.js` | Slot-level inventory not present in current repository |
| Site Barak attachment-backed display | displayed slot class | **5,587** | `coverage.sourceTypeCounts["Attachment-backed slots"]` | Aggregate only |
| Site Barak metadata-only display | displayed slot class | **5,505** | `coverage.sourceTypeCounts["Metadata-only slots"]` | Aggregate only |
| Site Barak recovered emails display | recovered parents/items | **19** | `coverage.sourceTypeCounts["Recovered emails"]` | Individual 19 parent IDs/hashes missing from current public snapshot |
| NAS extraction `037A` | attachment-backed slots | **5,587** | NAS 037A extraction inventory (`GAH-GROK-EMAIL-SOURCE-INVENTORY-037A.csv`) and final audit (`GAH-GROK-037A-FINAL.md`) | Summarized metadata, source file under inaccessible `/root/` |
| NAS extraction `037A` | metadata-only slots | **5,483** | Same as above, August 17, 2026 | Distinct classification from site’s displayed 5,505 |
| NAS extraction `037A` | recovered email bodies | **19** | Same as above | Event-grade body count; 19 parent-to-slot joins not proven in current repo |
| Internet Archive `gmail-06` ingestion | deduplicated *full-body* emails | **31,718** | `docs/phase0/BARAK_CORPUS_RECONCILIATION.md` (Oct 9); separate `barak_emails.db`, 15 Gmail zip inputs | Different key namespace and corpus window; **do not** merge with 11,089 slots |
| NAS raw HTML mailbox audit | raw HTML message files | **40,976** | `evidence-data/barak-epstein-putin-qatar-carbyne/nas-raw-mail-audit.json` (Oct 6): 38,886 Gmail + 2,090 Hyperion | Separate accounts and file units; ends before Jan–Feb 2019 correspondence |

## Arithmetic facts — not a provenance reconciliation

- The published site's **5,587 + 5,505 = 11,092**, exceeding its separate **11,089** claimed email slots by **3**. If its 19 recovered emails are an additional disjoint category, the three-category total is **11,111**, exceeding 11,089 by **22**. The site does not establish that these labels are a disjoint partition.
- Earlier NAS `037A` extraction reports **5,587 + 5,483 + 19 = 11,089**. This *arithmetically* partitions the stated count, **but no current item-level row identifiers demonstrate** mutually exclusive or exhaustive sets.
- The two metadata-only category counts differ by **22** (5,505 − 5,483). It is tempting to treat 19 of those as recovered-parent classifications and the other three as duplicates; **that is a hypothesis, not an audit finding**.
- Therefore **there is not enough evidence to call any three individual messages missing, duplicated, or recovered**, and no license to silently change counts in the public UI.

## Blockers and required acceptance

1. Recover the original per-slot `barak-archive-emails.json` (11,089 asserted rows) or the precise upstream report used to generate the Barak portal class counts. The historical 037A inventory references a private root-owned original that the connected NAS account cannot read. Scoped searches of authorized admin and research directories located no item-level copy.
2. Require a stable slot key (`mailbox`, `messageSlot`) plus an explicit class for every slot; compute duplicate key, null key, unknown class, set intersections, and canonical universe totals from *rows*, not marketing counters.
3. Resolve the **19 parent record IDs**, SHA-256 of source PDFs where available, file lineage, and whether parent slots are included inside or outside displayed classes.
4. Produce a **machine-checkable signed or hashed snapshot**: source file SHA-256, extraction date, versioned schema, observed counts, exception ledger, and repeatable script. Define `total = union(unique canonical slot keys)` and explain any overflow/overlap.
5. Only after that can the public portal change its counts or claim reconciliation. Separately join the 31,718 leak and 40,976 raw HTML messages only where a verified document hash or independently validated ID mapping exists.

## Safety and editorial release rules

- A 0-hit search is a *scoped negative* only: name the searched corpus, date/version, exact terms, Unicode/case/OCR normalization, excluded sources and corpus coverage. It is **not** evidence that a correspondence, relationship or event never existed.
- The proposed **Columbus Nova** comparison (0 in 1.38M DOJ documents versus 74 in Barak mail) is **NOT VERIFIED** by the repo manifests reviewed on October 11. Do not publish the counts until both independently reproduce from versioned corpora; count messages and matching occurrences separately, and inspect false positives and aliases.
- Private correspondence must pass public-interest, accuracy, provenance and privacy review. No automatically generated profiles, raw mailbox exports, invented contacts, or inferred guilt from association.

## Repeatable guard

Run `python3 scripts/barak/test_barak_count_gate.py`. It verifies the corrected active class counters against synthetic classification invariants, preserves the legacy mismatch as history, and keeps the parent-source authenticity gate open.
