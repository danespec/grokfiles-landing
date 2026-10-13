# GAH-CONTENT-PROVENANCE-035 — Public evidence-browser qualification

Date: October 13, 2026. Upstream service: protected Wiki gateway proxied
through the public Pages Worker. Do not mistake HTML editor labels or a PDF
reference lookup for proof that a complete original email was authenticated.

## Barak email reference index

The live /barak/emails source content previously claimed:

- A recovered_email category meant sender, date, subject and excerpt were
  recovered from a parent source.
- "Nineteen parent messages were recovered from matching Gmail-export PDF"
  records when mailbox and slot aligned.
- 5,587 attachment-backed slots and 5,505 metadata-only placeholders,
  even though issue #35 documents unresolved class counts and intersections.

Those are overstrong statements compared with the authorized evidence:
19 inventory entries have a recovered_email *label*, PDF references can
be cross-checked separately, and the raw parent message bodies are not
independently authenticated as complete originals by the current audit.
Source accounting issue #35 remains OPEN. No private message excerpt is
reproduced by this release.

Worker route-specific HTML qualification on EXACT /barak/emails:
- Changes the public title/H1 to Barak Email Reference Index.
- Describes recovered_email explicitly as an internal class, NOT
  original-message authentication. Removes unreconciled count assertions.
- Describes 19 as inventory entries aligned to PDF references, NOT 19
  certified original parent messages.
- Adds a prominent source-verification and correction notice before the
  dynamic results grid. Does not hide or rewrite original user evidence
  files or attest the result item's metadata.
- Continues AD-EXCLUDE and the original indexability policy. This is a
  public editorial correction, not a source-ledger reconciliation.

## Visual/photo browser

Public /api/visual-evidence/status and /photos/incoming-visual/data/summary.json
both report 76,060 served image objects from 76,948 manifest rows,
888 duplicate rows skipped, generated 2026-05-04. The API reports
118 indexed shards. Three small positional metadata samples, cursors
0, 35999 and 76056, returned 3 records each. Nine image and nine
thumbnail paths in that bounded set returned HTTP200 image/jpeg from
HEAD probes. No thumbnails or full images downloaded or republished.

Worker route-specific HTML context on EXACT /photos describes the
original manifest count, date, difference between extracted object and
authenticated record, missing context, privacy safety, and reporting.
Adds links to already-public /visual-evidence and /corrections. Does
not modify the underlying 76,060 image records, IDs, API responses,
redactions, raw materials, or image access. /photos remains AD-EXCLUDE.

**HUMAN GATE REMAINS OPEN:** None of these availability/metadata checks
can determine whether the photo corpus contains victim images,
personally identifying material, restricted/graphic content or third-party
copyright. Do not certify the gallery as safe, remove images, publish
names, or make a noindex decision based on this sample alone.

## Controlled verification

- New test tests/test_content_provenance_035.mjs evaluates exact pure
  route-specific transforms with a synthetic HTML fixture, verifies
  unsupported claims removed and notice inserted once, and checks
  the record UI and photo grid container remain intact.
- Existing 38 Phase0 regression suites must pass, locally and CI.
- Deployment preserves routing, Cloudflare Access, Wiki auth, WAF,
  rate limits, IndexNow and AdSense disabled, and all source assets.
- Stage protected root/preview 302, then verify live both route copy
  strings, warning links, no unsupported claims, no ads, and noindex
  policy unchanged. Require Wiki anonymous /api/search 401.
- Underlying NAS host gateway HTML needs the corresponding correction
  for future container rebuilds; the active Docker image need not be
  rebuilt for the public apex Worker overlay. Record any NAS-only source
  file correction and its exact backup/hash independently.

## Editorial verdict

Public wording can be corrected without closing the 19-message
authentication/reconciliation research gate or claiming visual safety.
AdSense resubmission: HOLD until manual photo content/privacy review,
verified publisher account/CMP, and remaining original source checks.
