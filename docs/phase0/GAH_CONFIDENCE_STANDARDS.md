# GAH Confidence Standards

Version 1.0 — 2026-10-09. Governing spec: `GAH_REBUILD_APPROVED_V2.md` (Phase 0).
This document is the public confidence-label definition required before any label ships in the rebuilt search UI.

## The hard rule

A confidence label describes **evidence quality** — the quality of the transcription, the identification, or the provenance of a record. **It is never a statement about whether any allegation in or around that record is true.**

Concretely:

- A label may say: "We are highly confident this is an authentic DOJ dataset 11 PDF, hash-verified, and the OCR is clean."
- A label may **never** be read as: "We are highly confident the crime described in this document happened."

Every public rendering of a confidence label MUST be accompanied by its axis (transcription, identification, or provenance) and the boilerplate: *"This label describes evidence quality only — not whether any allegation is true."* A bare "High confidence" badge with no axis is prohibited.

## The three axes

### 1. Transcription quality
How faithfully the readable text represents the source image.
- **verified** — text checked against the source image by a reviewer; or born-digital native text.
- **supported** — machine OCR/transcription, spot-checked, no material errors found.
- **degraded** — known OCR damage, redactions, or image artifacts that materially limit reading.
- **unverified** — transcription present but never checked.

### 2. Identification quality
How certain we are that the record is what it is labeled as: the right document, the right parties, the right date, the right collection.
- **verified** — identifiers cross-checked against an independent source (e.g. DOJ Bates listing, docket sheet, email headers).
- **supported** — identifiers internally consistent and plausible; single-source confirmation.
- **degraded** — conflicting identifiers, ambiguous parties/dates, or OCR-corrupted headers.
- **unverified** — identification is provisional.

### 3. Provenance quality
How strong the custody chain is from the original to GAH.
- **verified** — SHA-256 of original file bytes computed and recorded; original source URL live at verification.
- **supported** — acquired from a named, reputable source with a documented handoff, but no byte-level hash.
- **degraded** — source URL dead, custody gap, or format conversion without a hash trail.
- **unverified** — origin unclear; treat as lead only.

## What the levels do NOT mean

| Level | Means | Does NOT mean |
|---|---|---|
| verified | The transcription/identification/provenance check passed | The allegation is proven |
| supported | The check is plausible on available evidence | The conclusion is safe |
| degraded | The check has known limits | The record is worthless |
| unverified | The check has not been done | The record is fake |

## Label format

Every label is an (axis, level) pair with a one-sentence rationale:

> **Provenance: verified** — SHA-256 `2f8a80…` matches the DOJ dataset 11 PDF; source URL live 2026-10-06. *This label describes evidence quality only — not whether any allegation is true.*

Rationale is mandatory. A label without a rationale is not a label; it is decoration.

## Migration from existing vocabularies (required before rebuild ships)

The snapshot contains four parallel, partially undefined label systems. All must be migrated to (axis, level) form:

1. **L1–L4** (`methodology/confidence-labels-open-slots.html`): "Source Found / Context Supported / Review Lead / Source-Locked Finding." These describe *review posture*, not evidence quality. They are a separate, valid dimension — keep them, but never render them as evidence-quality labels. A record can be "L4 Source-Locked" with "Transcription: degraded."
2. **P1–P4** (`evidence-data/*/claims.json`): `P4` is used but **has no public definition anywhere in the snapshot**. Claims using P-labels must be re-labeled: most "P4 direct document wording" claims become (identification: verified or supported, transcription: supported) with the quote as the rationale. Until migrated, P-labels must not appear in any public UI.
3. **Free-text high/medium/HIGH** (107 claims across `evidence-data/*/claims.json`): these are exactly the labels most easily misread as allegation certainty. All must be converted to (axis, level) pairs or removed. Inconsistent capitalization ("high" vs "High" vs "HIGH") must not survive migration.
4. **HIGH_SOURCE_ROW_CLEAR** (`assets/barak-data*.js`): describes a reviewed Barak portal row. Migrate to (identification: supported, provenance: supported) with rationale naming the review.

## Negative findings and open slots

- A **bounded negative finding** ("EFTA01975333 does not establish X") is a documented fact with level verified/supported on the identification axis — it is not low confidence.
- An **open receipt slot** carries no confidence label at all. Missing evidence is not "low confidence evidence."

## Audit rule

Any confidence label on a public page must be traceable to a `provenance_quality` (or transcription/identification) entry in that record's provenance record (`GAH_PROVENANCE_SCHEMA.json`). Labels without a backing provenance entry are unsupported claims about the archive itself and must be removed.
