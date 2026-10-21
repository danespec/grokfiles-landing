# GAH-ARCHIVE-SITEMAP-FOUNDATION-001 — Controlled archive discovery

Date: October 20, 2026.

## Fixed missing sitemap
The archive sitemap URL was an unimplemented proposal, not a broken existing sitemap. Production lacked an XML asset or Worker route. The main sitemap remains completely unchanged.

## Initial public scope
Six previously indexable curated dossiers only: EFTA00013764, EFTA00035147, EFTA00039025, EFTA00039356, EFTA00039416, EFTA00039660. These also occur in the main 147-URL sitemap: deliberate overlap to avoid disrupting the existing index during foundation rollout. Total unique promoted URLs do not increase with this release. The index advertises both. Robots keeps the main sitemap and adds the archive child.

## Deliberately excluded
EFTA00033413 and EFTA00035570 contain excerpts but are not approved solely on OCR length; need direct primary links, specific documentary analysis, related reporting and privacy review. EFTA00000468 lacks displayable OCR. No dynamic raw EFTA crawl, OCR/PDF bulk indexing, wiki sitemap changes, or new noindex overrides.

## Next audit
Continue exact-ID review from user and Ren's earlier discussions and verify candidates individually; do not manufacture a 30-ID list. Eligible pages require HTTP200, self-canonical, document-specific editorial context, verified primary-source link and victim privacy review. Monitor separate archive-sitemap coverage and exact-ID search queries in GSC for 2–3 weeks. Removing sitemap entries alone does not deindex a page; restoring noindex is required if intentionally deindexing.

## Gates
Node syntax, new archive foundation test, old sitemap index test, Phase0 regression and live checks. Confirm XML parses, six selected URL targets return 200 and index,follow, main sitemap stays 147, index lists both, and excluded candidates stay noindex.
