# GAH Evidence Audit — snapshot `ren/production-snapshot-20261009`

Date: 2026-10-09. Auditor: Subagent D (Evidence Integrity & Provenance).
Scope: what the snapshot's in-repo data actually supports. Large binaries and private DBs were deliberately excluded from the snapshot (see `REN_README.md`); anything depending on them is marked **unverifiable-from-snapshot**, not false.

Method: inspected `evidence-data/` (47 folders), `_worker.js` provenance/manifest/bundle code paths, `methodology/confidence-labels-open-slots.html`, `corrections/` + `corrections.html`, `visual-evidence-index/`, `assets/barak-data*.js`, publication reports (`GAH_*_PUBLICATION_REPORT.json`), `CORE_SHA256SUMS.txt`.

## BACKED by in-repo data

1. **Source manifests exist and carry real provenance fields.** 44 of 47 `evidence-data/` folders ship `source-manifest.json` under schema `gah.source-manifest.v1` with per-source `public_url`, `sha256`, `status`, and role descriptions. Example: `evidence-data/barak-epstein-putin-qatar-carbyne/source-manifest.json` records DOJ dataset URLs (`https://www.justice.gov/epstein/files/DataSet%2011/EFTA02396786.pdf`) and SHA-256 hashes for 6 of 8 listed sources. Served at `/api/research/source-manifest/{manifest_id}` (`_worker.js:17599`).

2. **The document-evidence-bundle already separates facts, interpretation, and open questions.** Schema `gah.document-evidence-bundle.v1` (`_worker.js:4923`) returns `directly_establishes`, `does_not_establish`, `interpretation_and_silence`, and `open_receipt_slots` as distinct arrays — the V2 "documented facts / interpretations / unresolved questions" separation exists at the dossier level and is the pattern the provenance schema standardizes.

3. **Claims discipline is real where used.** 18 folders ship `claims.json` under `gah.claims.v1`; entries include bounded negative controls, e.g. `BEQC-02` ("EFTA01975333 does not establish that Putin received, answered or accepted the proposed contact") in `evidence-data/barak-epstein-putin-qatar-carbyne/claims.json:11`. The public methodology page (`methodology/confidence-labels-open-slots.html`) states: "A confidence label does not describe guilt, intent, agency, or liability."

4. **Deploy-level audit trail exists.** `GAH_*_PUBLICATION_REPORT.json` (schema `gah.publication.v1`) records per-deploy changed files, source package paths, and privacy notes (e.g. `GAH_DOCKET_1320_PUBLICATION_REPORT.json`). `CORE_SHA256SUMS.txt` hashes build artifacts. The Phang docket lane hashes document content (`_worker.js:7762-7808`, `sourceSha256`/`contentHash`/`materialHash`).

5. **Visual-evidence inventory is honestly accounted.** `visual-evidence-index/manifest.json` (schema `gah.visual-evidence-index.v1`) reports 76,948 manifest rows → 76,060 served items, with `duplicate_rows_skipped: 888` and `missing_images_skipped: 0` stated explicitly. The 76,948 public claim is backed — with the dedup caveat visible in-repo.

6. **Barak portal records carry what-it-shows / what-it-doesn't fields.** `assets/barak-data.v298.js` records include `claim`, `bias` ("used only as private meeting-logistics review material… not source facts"), and `silence` ("does not establish purpose, attendance beyond the text, relationship, legal meaning, or conduct") fields — the establishes/does-not-establish discipline at row level.

7. **Correction discipline exists at page level.** `corrections.html` defines the correction packet (exact route, wrong sentence, replacement source, narrow change) and `corrections/flight-log-count-and-aircraft-reconciliation.html` is a worked example.

## NOT backed / gaps (ordered by severity)

1. **Four parallel confidence vocabularies; the dominant one is undefined.** `claims.json` files use (a) `P4`-style labels (no public definition anywhere in the snapshot — 0 hits in `_worker.js`, methodology, editorial policy), (b) free-text `high`/`medium`/`High`/`Medium`/`HIGH`/`medium-high` (107 occurrences across 15 files — inconsistent capitalization, no definitions), (c) `HIGH_SOURCE_ROW_CLEAR` (Barak portal rows only, defined nowhere). The public methodology page uses (d) L1–L4, which describe *review posture*, not evidence quality. A bare `"confidence": "high"` on a claim is exactly the label most easily misread as certainty that an allegation is true — this directly violates the V2 hard rule. **Migration to (axis, level) form is a Phase 0 blocker.** (See `GAH_CONFIDENCE_STANDARDS.md`.)

2. **Hash and source-URL coverage is thin.** Across 325 manifest sources: 101 (31%) carry `sha256`, 57 (18%) carry `public_url`, 62 mention a dataset. The schema supports provenance; the data is two-thirds absent. Backfilling hashes/URLs is the highest-ROI audit-trail work.

3. **Correction tracking is page-level, not document-level.** There is no per-document `correction_history`; nothing in a manifest records which sentence changed, when, or why. `gah.publication.v1` reports track changed *files*, not changed *claims*. The V2 document-level audit trail requires this.

4. **Manifest coverage is incomplete.** 3 of 47 folders lack `source-manifest.json` entirely (`birthday-book`, `epstein-entity-index`, `trump-epstein`); `claims.json` exists in only 18 of 47. The Trump lane's absence is editorially intentional (noindex review lane) but must be explicit in the manifest, not silent.

5. **Barak 19 / 5,587 / 5,505 reconciliation is not in-repo.** The snapshot contains Barak portal rows and receipt cards, but no document reconciling the three categories. Per the V2 brief this is Subagent C's deliverable; from this audit's standpoint it is **unresolved**, and the numbers must not render in public UI until reconciled.

6. **Excluded-data dependencies are unverifiable from the snapshot.** SHA-256 values in manifests were computed against originals not present in-repo (per `REN_README.md`); the hashes cannot be re-verified here. Marked **unverifiable-from-snapshot**, not false — re-verification requires ChatGPT's production environment.

## Critical gaps (need decisions/work)

- **G1 (blocker):** Confidence-label migration. Owner or ChatGPT must approve the (axis, level) standard and convert or suppress all P/high/medium/HIGH labels before any rebuilt search card renders a label. Rendering today's labels in a new UI would launder undefined vocabulary into the "trustworthy" surface.
- **G2:** Hash/URL backfill for the 224 manifest sources lacking SHA-256 and 268 lacking public URLs. Needs production-environment access (ChatGPT) — the originals are not in the snapshot.
- **G3:** Document-level correction history. Requires a write path from the corrections workflow into manifest `correction_history` — needs ChatGPT (owns the publishing pipeline) to implement.
- **G4:** Barak reconciliation (Subagent C) must land before the `/barak` provenance block renders numbers.
- **G5:** `trump-epstein` and `epstein-entity-index` need an explicit manifest status (intentional noindex lane vs. missing) so the audit trail distinguishes "deliberately unlisted" from "lost."

## Blockers needing ChatGPT or Thomas

- **ChatGPT:** re-verify manifest SHA-256 values against production originals (snapshot lacks the binaries); backfill missing `public_url`/`sha256`; implement manifest `correction_history` writes in the publishing pipeline; confirm the Barak export's 19/5,587/5,505 category definitions from the production archive.
- **Thomas:** approve `GAH_CONFIDENCE_STANDARDS.md` (especially the migration of P/high/medium labels); decide whether L1–L4 review-posture labels render alongside the new evidence-quality labels or stay methodology-only; approve the rule that unresolved Barak numbers stay out of public UI until Subagent C's reconciliation lands.
