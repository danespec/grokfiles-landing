# PR-1 test results — Phase 0 search contracts

Date: 2026-10-09 (revised per review: portability + dependency fixes, 3,628 re-verification)
Branch: `ren/pr-1-phase0-contracts` (from `ren/production-snapshot-20261009` @ `7bfc664`)
Scope: documentation, schemas, and tests only. No production code modified.

## Reproduce (fresh checkout, any path)

```bash
git clone --branch ren/pr-1-phase0-contracts https://github.com/danespec/grokfiles-landing.git
cd grokfiles-landing/docs/phase0/search-contract-tests
python3 run_tests.py
```

Requires: Python 3.8+ standard library only. **No third-party
dependencies** — the manifest-schema test uses a purpose-built stdlib
validator (`test_manifest_schema.py`), not `jsonschema`. (An earlier
revision imported `jsonschema` while the docs claimed stdlib-only; that
was the dependency-documentation bug flagged in review. Fixed.)

Portability: every test resolves the repo root by walking up from its own
`__file__` until `_worker.js` + `docs/phase0` are found
(`gah_search.repo_root()`). No `$HOME`, `~/workspace`, or machine-specific
paths remain. (An earlier revision hardcoded `~/workspace/gah-repo` and
`~/workspace/gah-dev`; fixed.)

## Result

```
============================================================
$ test_id_normalization.py -> PASS
test_id_normalization: all 37 checks passed
============================================================
$ test_visual_manifest.py -> PASS
test_visual_manifest: all checks passed (118 shards, 76060 served items)
============================================================
$ test_barak_ids.py -> PASS
barak portal rows in snapshot: 305
  distinct BARAK archive ids referenced: 16
  rows filed under EFTA ids (receipt cross-refs): 14
  rows filed under canonical BARAK ids: 16
  rows with dateSort missing (date_unknown): 258
  NORMALIZATION DEBT — non-canonical archiveId forms (275):
    barak-171-slot-001 -> BARAK-171-SLOT-001
    ... (8 shown, 275 total)
  CONTENT DEBT — empty what-it-does-not-prove (1), default silence must render:
    barak-rcpt-pvt-20150907-001
test_barak_ids: all checks passed
============================================================
$ test_manifest_schema.py -> PASS
test_manifest_schema: sample manifest instance validates against the schema (stdlib validator)
============================================================
SUITE PASSED
```

Exit code: 0. **4/4 suites pass.**

## What the tests prove

- ID normalization (EFTA + BARAK canonical forms) — 37 checks, incl. hyphen/zero-padding edge cases.
- Visual-evidence manifest integrity: 118 shards, **76,060 served items** (the 76,948 figure includes 888 skipped duplicates — the tests assert `served + dupes == manifest_rows`).
- Barak portal inventory against the snapshot: 305 rows, 16 distinct BARAK archive ids, 14 cross-collection receipt rows filed under EFTA ids, 258 rows missing `dateSort` (→ `date_unknown`), 275 non-canonical id forms (normalization debt), 1 row with empty `what-it-does-not-prove` (default silence must render).
- A sample search manifest validates against `GAH_SEARCH_MANIFEST_SCHEMA.json` (draft-07, stdlib validator covering the schema's actual keyword set: type, properties, required, items, minItems, enum, const, pattern, minimum, format/date-time).

## Fresh verification notes (2026-10-09)

- **`curated_files` = 3,628 does NOT verify against this snapshot.** The snapshot
  holds 546 files under `evidence-data/` (373 json + 172 txt + 1 tsv); 48
  in-repo manifests sum to 1,004 list entries. The 3,628 figure in
  `frontdoor/archive-status.json` predates the snapshot's ~1.4GB binary
  exclusion (REN_README.md) — its `archive-status.json` was not regenerated
  after sanitization, so its note ("exact for the checked-in source tree") is
  stale on this branch. The contract, schema, and sample instance now record
  `curated_files` as `verification: operator_records` with a reconciliation
  note; re-derivation from the production tree is a ChatGPT action. The
  manifest must not present 3,628 as snapshot-verified.

## Notes for reviewers

- Tests run against the in-repo snapshot data. Live-service behavior (wiki-host proof layer) is explicitly out of scope — see `GAH_SEARCH_CONTRACT.md` §8.
- `gah_search.py` is the reference implementation of the contract's normalization and missing-record rules, not production code.
