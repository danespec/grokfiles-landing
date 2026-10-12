# GAH-BARAK-COUNT-026 — Reconciliation acceptance gate

**Status: OPEN — do not describe the inventory as reconciled.** Reviewed October 11, 2026. This document describes *source-labeled populations*, not a master email count. It does not publish raw correspondence, personal data, or unverified persons.

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

Run `python3 scripts/barak/test_barak_count_gate.py`. It checks live-source counter **inconsistency** remains accurately acknowledged and will flag metadata changes without a revised, evidenced reconciliation. It intentionally does **not** declare the reconciliation solved.
