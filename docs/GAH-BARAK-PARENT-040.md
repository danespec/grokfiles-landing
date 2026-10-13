# GAH-BARAK-PARENT-040 — Public extracted-metadata integrity notice

Research date October 13, 2026. Primary open research gate GitHub #35.

## Verified source constraints

- Inventory arithmetic 11,089 rows, 5,587 attachment-backed, 5,483
  metadata-only and 19 recovered_email labels was verified in PR #79.
- Corrected parent-export parser identifies 19/19 privately hashed PDFs
  by account folder + mailbox folder + the numeric token inside
  `N (messageSlot).pdf`. The prior 037 nine-file count arose from
  punctuation-stripping filename collisions and is superseded.
- Separate raw HTML snapshot export has 40,976 HTML files. All 19 of
  the recovered labels also have same-path, same-stem HTML counterparts.
  All 19 HTML/PDF pairs share contiguous eight-token text. Seventeen
  of the 19 paired PDFs have the strongest match among the examined set.
- 13/19 HTML-PDF pairs have exact From/To/Subject/Date value agreement
  after normalization. Four PDFs lack a complete extractable header
  block; two show differing header values. All 19 inventory's extracted
  sender/recipient/subject/date values remain unreconciled with the
  associated exported HTML headers. Their date fields particularly
  exhibit parsing defects, so they are not canonical timestamps.
- PDFs have Skia/PDF producer and 2025-12-22/23 PDF creation metadata;
  file-conversion dates do not establish original sending or integrity.
- Separate 173 EML files show Received and Message-ID syntax; 25 contain
  DKIM-Signature fields and 86 Authentication-Results. These have 135
  distinct SHA256 files, but none is an exact account/mailbox/slot
  parent file for the recovered 19. One must validate signatures and
  provenance before making any independent authenticity claim.
- Internal fuzzy/contiguous-overlap testing yielded three PDF rows
  with some eight-token text matching distinct EML content, and only
  one at twelve-token length; no exact subject or DKIM-bearing pair
  matched. This is not an authenticated native-email join.

## Privacy and custody

All row-level paths, SHA256 hashes, messages and headers are retained
only in owner-restricted NAS workpapers (mode 0600) and a Mac private
review directory. The GAH site, this PR and issue #35 do not expose
private raw message content, addresses, or unpublished metadata.
See issue #35 latest October 13 forensic checkpoints for aggregate
verification and relevant workpaper file hashes.

## Source-quality remediation in this release

The existing exact-route `/barak/emails` Worker HTML qualification
continues to label 19 rows as internal inventory references rather
than authenticated original parent emails. It now explicitly says:

- A matching exported HTML and printed PDF is not independent
  native transport evidence;
- The broader raw archive contains other EML records but none has
  yet joined to an original of these 19;
- Derived sender, recipient, subject and date fields have not been
  reconciled to source HTML/PDF headers and must not be cited
  as verified original message metadata.

No source corpus values or original web/email records are modified.
No source browsing routes, source assets, PDF.js, Cloudflare Access,
WAF, payments, AdSense gating or sitemap/indexability change.
/photos remains `index,follow` per explicit owner editorial decision.
AdSense remains disabled. Follow privacy and legal gates before
republishing private material.

## Tests, deployment and acceptance

- `tests/test_barak_metadata_notice_040.mjs`: synthetic untrusted
  upstream page is transformed once to source-qualified copy with
  no outdated claim, records intact, route/AdSense rules unchanged.
- Full Phase 0 regression 40 suites; independent GitHub CI required.
- Publish through protected staging first, then Pages production
  with exact verified release package. All assets except `_worker.js`
  must remain byte-identical to last approved release #79.
- Live acceptance needs Barak source warning + no stale source
  paragraph, `/barak/emails` AD-EXCLUDE and index,follow unchanged,
  photo archive indexable, Access 302, anonymous Wiki API 401.

**Authentication status:** Open, unresolved. Source mapping is
validated; original sender/delivery and native crypto proof are not.
