# GAH full-volume EFTA catalog — November 20, 2026

**Owner authorization:** Make the actual EFTA archive searchable by source identifier across original PDFs, OCR, audio, video and recognized source formats. Do not confuse physical file count with unique records.

## Reconciled source inventory

| Metric | Verified identifiers/files |
|---|---:|
| Physical files across eleven non-overlapping source folders | 1,734,944 |
| Distinct EFTA identifiers | 870,835 |
| Identifiers with original-source files | 870,834 |
| Identifiers with PDF sources | 870,834 |
| Identifiers with OCR text | 667,493 |
| Original identifiers with no OCR match | 203,342 |
| Video-bearing EFTA identifiers | 147 |
| Audio-bearing EFTA identifiers | 4 |
| Standalone image files recognized in these holdings | 0 |

Formats overlap. A video file may be duplicated between datasets; unique recording count is not verified. Many photographs may be embedded in PDFs or videos; embedded images are not enumerated by filename scans. None of these numbers are asserted to be Google-indexed pages.

## Compact metadata index

- An on-site scan created a record-level catalog: each exact eight-digit EFTA number encoded as an unsigned 32-bit integer plus one byte of format flags. 870,835 entries occupy 4,354,175 bytes. Expected SHA-256: 3a3d64f4908a3faaa7ed72dad2f073b5fa3347ccc34e7d1feb222e05a773c519.
- Zero source text, personal names, addresses, victim identities, unpublished images, transcripts or private filesystem paths appear in the compressed-format index.
- The wiki gateway checks the binary length and fingerprint before startup; a binary search resolves an exact EFTA identifier in at most 20 comparisons without loading large JavaScript object maps.
- Public research landing pages /catalog and /catalog/media explain counts, formats and limitations; both are self-canonical and indexable.
- Exact-ID /catalog/EFTA######## lookup shows availability flags, not document contents; every individual metadata-only lookup returns noindex,follow. For source-published documents, the existing source page remains the canonical index target. No raw video/audio/image bytes are exposed by this catalog.
- Wiki homepage and main homepage surface the full-volume lookup, ahead of news discovery.
- Research sitemap grows from 87 to 89 entries. The separate 12,100-EFTA-source sitemap stays unchanged. This campaign does NOT falsely claim that 870,835 records were made indexable in Google.
- Existing access controls, redactions, canonical article owners, analytics instrumentation, archive-source advertising exclusions and private backend inputs are unchanged.

## Reproducibility and safeguards

Source inventory scanner, compact catalog builder and large-OCR candidate quality scanner are included in the backend/wiki-unified-efta-20261120 directory. Original path inventories and full source-content inputs must remain on the authorized NAS; do not add them to public GitHub. Release staging uses a copy of the live wiki gateway and an exact rollback tar, and verifies security/auth/reader-quality hashes.

The complete corpus needs a separate review of OCR coverage, document provenance, version reconciliation, video/audio transcription, embedded PDF imagery, and protected identities before further bulk SEO admission. The automated scanner produces candidate sets, not publication authority. Google discovers candidate URLs only after sitemaps are served and processed; successful discovery does not guarantee indexing or ranking.
