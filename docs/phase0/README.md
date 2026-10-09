# docs/phase0 — PR-1: Phase 0 data contracts

The nine Phase 0 deliverables for the GAH rebuild, per the approved V2 brief
(`GAH_REBUILD_APPROVED_V2.md`: data contracts before visual redesign).

## Contents

| File | What it is |
|---|---|
| `GAH_ARCHITECTURE_AUDIT.md` | Worker routing map, search endpoint inventory, binding requirements, bottlenecks, `_worker.js` restructure risks |
| `GAH_SEARCH_CONTRACT.md` | Canonical Phase 0 search specification (§§0–10): identifiers, six never-merged collections, count definitions, result schemas, exact-ID matching, missing-record responses, confidence labels |
| `GAH_SEARCH_MANIFEST_SCHEMA.json` | The single authoritative search manifest schema (draft-07, validated) |
| `GAH_BARAK_RECONCILIATION.md` | Formal reconciliation of the 19 / 5,587 / 5,505 Barak figures + `/barak/emails/{id}` viewer schema |
| `GAH_PROVENANCE_SCHEMA.json` | `gah.provenance.v1` — document-level audit-trail schema |
| `GAH_CONFIDENCE_STANDARDS.md` | Public confidence-label definitions (transcription/identification/provenance × verified/supported/degraded/unverified) + migration plan |
| `GAH_EVIDENCE_AUDIT.md` | What the snapshot actually supports vs. what it doesn't, with file paths |
| `GAH_COMPATIBILITY_AUDIT.md` | Must-not-break interface inventory, PayPal wired-vs-unconfirmed assessment, security findings |
| `GAH_SEARCH_UX_PERFORMANCE.md` | Measured search timings, link/canonical/sitemap audit, measurable thresholds |
| `search-contract-tests/` | Runnable validation tests (`python3 run_tests.py` → SUITE PASSED, 4/4) |
| `TEST_RESULTS.md` | Reproducible commands and actual test output |

## Coordinator's ruling (confidence-label overlap)

`GAH_CONFIDENCE_STANDARDS.md`'s (axis, level) system is canonical.
`GAH_SEARCH_CONTRACT.md` §6's 13 legacy Barak-portal labels keep their public
definitions as the interim vocabulary, mapped onto the canonical axes per the
migration plan. New labels are minted only in the canonical system.

## Scope

Documentation, schemas, and tests only. No production code modified, nothing
deployed. Security remediation is tracked on a separate branch
(`ren/security-remediation`) and is not part of this PR.
