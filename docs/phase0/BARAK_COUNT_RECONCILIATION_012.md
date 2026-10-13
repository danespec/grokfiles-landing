# REN-BARAK-COUNT-012 — Hash-verified class reconciliation

**Result:** **11,089 archive inventory rows now reconcile by mutually exclusive class**, *not* a verified number of unique email messages and *not* an authenticated recovered-parent corpus. The original source records are not part of this repository.

## Input and reproducibility

- Source: owner-authorized public wiki archive email-row manifest, retrieved October 12, 2026.
- Corrected source byte SHA-256: `38ebc8dbe4906c1fe6132b75f2af2d5cf690e5c829d34615fddf514d74d3bb73`.
- Independent aggregate-only reproducer: `scripts/barak/reconcile_slot_classes.py`, with exact `--expect-sha256` support; data input remains in the private runtime and outside GitHub.
- `inventory_rows=11089`, `distinct_row_ids=11089`, `distinct_archive_ids=11089`.
- `class_counts`: `attachment_backed_slot=5587`, `metadata_only_slot=5483`, `recovered_email=19`, total **11,089**. Unknown class rows: **0**; empty key fields: **0**.
- `distinct_mailbox_slot_pairs=7310`, `repeated_mailbox_slot_pair_groups=3779`, `rows_in_repeated_pair_groups=7558`. The data do **not** establish 11,089 distinct underlying emails, 7,310 distinct emails, or 19 verified parent bodies.
- All email-slot direct source links were disabled in PR #49; independently reverified 0 active links in this snapshot.

## Prior erroneous display

Historical active portal `assets/barak-data-050.js` incorrectly advertised **5,505 metadata-only slots**, in both `coverage.sourceTypeCounts` and `coverage.emailSourceRecovery`. That was **22 higher** than the observed row class. Treat the prior 5,505 and 11,092 arithmetic as *historical stale display metadata*, not missing-email evidence; the overlap and derivation of the old label remain unknown. Legacy `barak-data-048.js` and `barak-data.v298.js` are retained as original version snapshots and not patched.

The active `barak-data-050.js` now reports **5,483** metadata-only *inventory rows*. The active viewer uses the explicit label **Archive-labeled recovered slots (unverified)**. The Cloudflare Worker maps historical Barak script aliases to one canonical versioned asset and strips any stacked `?v=` query strings before replacing, with an idempotent synthetic regression.

## Remaining acceptance gates

1. Individually authenticate claimed 19 parent sources by stable ID, date, source PDF/body hash, link to originating message, custody, and publication rights. Legacy `parentPdfMirror` boolean is **not** a source document.
2. Resolve whether duplicate `(mailbox, messageSlot)` references represent inventory overlap, view aliases, or true independent messages. A row-key group is not a verified unique message.
3. Preserve the separate 31,718 full-body mail corpus, 40,976 raw HTML files, and 14,728 attachment PDF inventory as distinct evidence units.
4. Do not infer wrongdoing, withheld files, deletion, relationship, or absence from counting metadata.

**Tests:** `scripts/barak/test_barak_count_gate.py`, `tests/test_barak_count_cache_normalization.mjs`, and **21 Phase 0 suites**. Production route verification is required after approved deploy; the source authenticity/count gate remains **OPEN/PARTIAL**, not closed.


## Additional class-pair profile (REN-BARAK-JOINS-013)

The same source snapshot additionally contains **3,763** pairs of `attachment_backed_slot + metadata_only_slot` and **16** pairs of `metadata_only_slot + recovered_email`, plus **1,824** standalone attachment-backed rows, **1,704** standalone metadata-only rows and **3** standalone recovered-labeled rows. Thus the 3,779 repeated pairs all have exactly two *rows*, classified across different categories; no within-class repeated key was observed in this snapshot.

Of the **19** archive-labeled recovered rows, **16** reference one or more `linkedPdfIds` while **3** have none. This is a manifest foreign-key field, **not** proof that a recovered parent body exists or has been authenticated. These aggregate patterns must not be reverse-engineered into a claim that three emails were missing/withheld or that an attachment proves the parent correspondence.
