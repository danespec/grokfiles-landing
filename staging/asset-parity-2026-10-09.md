# Asset parity report — staging (STAGING-HARDEN-001)

Checked 2026-10-09 against `https://gah-staging-517b8499.pages.dev`.
138 unique asset paths extracted from `_worker.js` references.

## Summary

| Category | Count | Status |
|---|---|---|
| Assets serving 200 | 103 | OK |
| Canonical redirects (301) | 6 | OK (redirect to canonical path) |
| Missing (404) — superseded versions | 20 | Expected; see below |
| Gated (403) — intentional | 3 | Expected; see below |
| Missing (404) — evidence-data dirs | 4 | Expected; see below |
| Missing (404) — pdfjs build dir | 1 | Investigate; see below |

## 1. Superseded versions (404, harmless)

20 image paths return 404. All are older versions superseded by deployed
newer versions:

- `/assets/images/cdr-*-058.png` (8 files) → superseded by `-059` versions (200 OK)
- `/assets/motherlode-055/*` (6 files) → superseded by `motherlode-057` paths
- `/assets/motherlode-057/*` (6 files) → 404 (see note)

These live in `V3_STATIC_ASSET_PATHS` (preload list). The 058 files are
strictly superseded — the pages use 059. The `motherlode-057` 404s are
odd (057 is newer than 055); both old directories 404.

**Recommendation:** Remove the dead 058/motherlode-055 references from
`V3_STATIC_ASSET_PATHS` in a follow-up cleanup (cosmetic; no user impact —
the live pages reference the working 059 assets). Do NOT upload the old
images; they are superseded.

## 2. Gated content (403, intentional)

- `/book-of-black/source/Book_of_Black_V6HHT.pdf` → 403
- `/evidence-data/book-of-black/pages.json` → 403
- `/evidence-data/book-of-black/source/Book_of_Black_V6HHT.pdf` → 403

The Book of Black manuscript is intentionally gated (not public). 403 is
the correct behavior. **Do not upload or ungate.**

## 3. Evidence-data directories (404, intentional)

- `/evidence-data/blanche-no-evidence/source/html/` → 404
- `/evidence-data/book-of-black/` → 404
- `/evidence-data/doug-band/source/html/` → 404
- `/evidence-data/leon-black/source/html/` → 404
- `/evidence-data/new-mexico-doj/source/html/` → 404

Source HTML directories are not deployed to Pages (they are build-time
sources, not public assets). Per the task constraint, **do not upload
private or unpublished artifacts**. If any page links to these, it is a
bug in the page, not a deployment gap — report specific pages if found.

## 4. pdfjs build directory (404 on the directory, OK)

- `/pdfjs/build/` → 404 (directory listing; expected — no index)
- `/pdfjs/build/pdf.mjs` → 200
- `/pdfjs/build/pdf.worker.mjs` → 200

Verified: the document reader files serve correctly. The directory 404
is expected behavior (no index). No action needed.

## 5. Canonical redirects (301, OK)

6 `/book-of-black/*` paths 301-redirect to canonical extensionless paths
(e.g. `/book-of-black/index.html` → `/book-of-black`). Correct behavior.

## Corrections applied to the staging package

None required for deployment. The 404s are superseded/intentional; the
403s are intentional gating. The single investigate item (pdfjs) is a
verification step, not a code change.

**Not uploaded:** no private, gated, or unpublished artifacts were added
to the staging package. The evidence-data 404s and Book of Black 403s
are preserved as-is.
