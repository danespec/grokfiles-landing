# Grok Archive Hub search expansion baseline

Production snapshot collected November 19, 2026. Reproduce with
`python3 scripts/seo/audit_search_expansion.py > search-expansion-audit.json`
from a checkout with trusted TLS roots. The audit reads the production sitemaps and
examines HTTP status, robots directives, HTML canonical targets and hyperlinks.
Elapsed times include DNS, TLS and response transfer from the audit device.

| Surface | URLs listed | HTTP 200, self-canonical, indexable |
| --- | ---: | ---: |
| Apex editorial sitemap | 156 | 156 |
| Apex EFTA sitemap | 19 | 19 |
| Wiki sitemap | 2 | 2 |
| Total | 177 | 177 |

There were zero repeated sitemap URLs. Fetch time was 242 ms median and 545 ms
at the 95th percentile. These timings do not measure Core Web Vitals.

The repository contains 69 EFTA dossier files. The existing dossier-recovery
fixture documents the canonical consolidation of 50 of them into editorial
pages. Those pages retain the identifier and link to the dossier. Keep the
current canonical destinations until a new review establishes distinct
documentary value and a reason to index a dossier on its own. The first cohort
uses those 50 reviewed mappings to make their editorial context visible beside
the document title. Four dossiers also gain direct Atlas links based on exact
shared citations already reviewed by the investigation navigation pipeline.
These changes add no editorial publications.

Five pages had no inbound links from other sitemap URLs in this bounded crawl.
Check discovery from non-sitemap hubs and rendered navigation before treating
these as site-wide orphans.

- Book of Black methodology
- DOJ March 2025 review emails
- October 29 pre-election update
- Phang October 16 in-camera notes
- Birthday-book evidence page

## Competitive architecture

- [epstein-data.com](https://epstein-data.com/) provides a full-text search,
  research reports, a sourced wiki and an entity directory.
- [JDrive](https://jmail.world/drive/folder/doj) offers source-grouped browsing,
  result filtering and a full-text search workflow.
- [Epstein Library](https://epsteinlibrary.com/) identifies itself as an EFTA
  search interface. The available public response provided no readable listing
  to verify its discovery paths.
- These observations describe interfaces. Search engine coverage and rankings
  require independent evidence.

## Measurement window

Capture Search Console Page Indexing totals and 28 days of Performance data
before publication. In Performance, export clicks, impressions, CTR and
position by query and landing page. Save separate cohorts for non-branded
queries, exact EFTA ID queries and entity queries. In GA4, record organic
sessions by editorial landing page and Atlas engagement with the existing
event definitions. Capture crawl errors and canonical exclusions by cohort.

At 7, 14 and 30 days after release, export the same data using the same filters
and compare equal-length periods while allowing for reporting delays. At day
30, report coverage of the release cohort, index exclusions, search impressions
and clicks, editorial entrances and Atlas engagement. Record missing query
rows as unavailable and document any other releases that could affect results.
Search Console metrics are pending authenticated retrieval.
