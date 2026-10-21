# GAH-ARCHIVE-PROMOTION-20261021 — reviewed release gate

Draft supplied by Ren: 30 candidates / 32 URL entries. Reviewed against live site on October 21, 2026.

Release ships **12 unique static, source-contextualized, ad-excluded, indexable dossiers**; 11 appear in the 32-URL draft, plus EFTA00033413 chosen for the documented Google search gap. Existing six curated entries are preserved. Archive sitemap after release: **18** URLs.

The unreviewed raw OCR/wiki source-card corpus remains noindex; no bulk promotion or image publication. EFTA00000468 and EFTA01703108 static summaries have no direct visual/PDF viewer link. Every static summary links official DOJ file indexes/search and published related reporting; labels distinguish the DOI release index from the specific underlying artifact.

| Draft EFTA ID | Prior HTTP | Oct 21 release disposition |
|---|---:|---|
| EFTA00035119 | 200 | HOLD: Visitor-log handwriting, redact-safe check outstanding |
| EFTA00035053 | 200 | Promoted: reviewed, sanitized static editorial dossier |
| EFTA00035206 | 200 | HOLD: no displayable excerpt; editorial/primary review needed |
| EFTA00035420 | 200 | Promoted: reviewed, sanitized static editorial dossier |
| EFTA00035421 | 200 | Promoted: reviewed, sanitized static editorial dossier |
| EFTA00035035 | 200 | Promoted: reviewed, sanitized static editorial dossier |
| EFTA00035442 | 200 | Promoted: reviewed, sanitized static editorial dossier |
| EFTA00035715 | 200 | HOLD: no displayable excerpt; editorial/primary review needed |
| EFTA00035570 | 200 | Promoted: reviewed, sanitized static editorial dossier |
| EFTA00035574 | 200 | Promoted: reviewed, sanitized static editorial dossier |
| EFTA00035657 | 200 | Promoted: reviewed, sanitized static editorial dossier |
| EFTA00035613 | 200 | HOLD: Personal imagery and contact-data review outstanding |
| EFTA00035773 | 200 | Promoted: reviewed, sanitized static editorial dossier |
| EFTA00035828 | 200 | HOLD: no displayable excerpt; editorial/primary review needed |
| EFTA00000468 | 200 | Promoted: reviewed, sanitized static editorial dossier |
| EFTA01703108 | 200 | Promoted: reviewed, sanitized static editorial dossier |
| EFTA01245620 | 404 | HOLD: 404 / source route unresolved |
| EFTA02858481 | 200 | HOLD: Sensitive FBI interview involving a minor / source-identification risk |
| EFTA02858491 | 200 | HOLD: Sensitive FBI interview and alleged minor encounter / source-identification risk |
| EFTA00579174 | 200 | HOLD: no displayable excerpt; editorial/primary review needed |
| EFTA00579182 | 200 | HOLD: no displayable excerpt; editorial/primary review needed |
| EFTA00224262 | 200 | HOLD: Nonprofit filing with address details; editorial need review |
| EFTA00176507 | 200 | HOLD: Document-specific source, privacy or financial evidence review outstanding |
| EFTA00080260 | 200 | HOLD: Financial/account and signatures review |
| EFTA00643676 | 200 | HOLD: no displayable excerpt; editorial/primary review needed |
| EFTA00704168 | 404 | HOLD: 404 / source route unresolved |
| EFTA00153569 | 200 | HOLD: International financial-intelligence correspondence; privacy review |
| EFTA00153570 | 404 | HOLD: 404 / source route unresolved |
| EFTA00153571 | 404 | HOLD: 404 / source route unresolved |
| EFTA00128841 | 200 | HOLD: IRS forensic account references; confidential finance review |
| EFTA00646811 | 200 | HOLD: Private valuation emails; account/identity review |
| EFTA01410768 | 200 | HOLD: Confidential bank correspondence; privacy review |

## Release verification and rollback

- Runtime tests: 12 reviewed IDs 200, self-canonical, meta index/follow, source and related links, 18-URL sitemap; 4 known 404s remain excluded.
- Rollback: revert this release commit to restore all 12 to `noindex,follow` wiki fallback and previous 6-entry sitemap; deleting sitemap entries alone does not deindex.
- Google Search Console: submit/resubmit the existing `https://grokarchivehub.com/sitemap-archive.xml` only after live verification. Google indexing and rankings remain independent decisions.
- Subsequent waves must be explicitly content-reviewed, not auto-enriched from raw OCR, because victim privacy and financial identifiers are present in the source corpus.
