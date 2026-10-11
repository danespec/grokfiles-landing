# GAH-SEO-CLIENTLIST-002 — Editorial and Release Review

Date: October 11, 2026. Owner approval for **production publication has not been requested or obtained**. Source-of-truth branch: `chatgpt/gah-client-list-002-20261011`. Based on vetted `chatgpt/gah-trending-001-20261011` commit `5cf08a0`, not stale GitHub main and not Ren's staging/security branch.

## New source audits

1. `/guides/epstein-client-list-explained` — *Was There an Epstein Client List? What DOJ Said—and What the Records Show*. Its focus is the distinction between the July 2025 DOJ/FBI memo's agency findings and the distinct kinds of public records (contact directories, travel, correspondence, financial records, court filings, investigative leads). It never states that mere mention establishes wrongdoing. It does not claim to exonerate or implicate every individual named in the larger archive.
2. `/guides/epstein-files-transparency-act` — *Epstein Files Transparency Act Explained*. Cites the enacted Public Law 119-38, November 19, 2025, 30-day/December 19 statutory deadline, defined categories, exceptions, and later January 30, 2026 DOJ releases. It distinguishes a statutory deadline from a conclusion about full compliance.

## Existing-guide improvements

- `/guides/how-to-search-epstein-files` now includes a source-first worked example for `EFTA00013764` and links to the existing GAH investigation `/investigations/epstein-december-6-7-2007-decision-gap` (the “Hold the letter” message and unresolved decision chain).
- `/guides/doj-epstein-data-sets` retains twelve official DOJ Data Set file-index links and adds explicit instructions to select documents on each DOJ index. It does **not** assert the existence of an official ZIP file for every set.
- Both existing guides gain visible Q&A and matching schema.org `FAQPage` JSON-LD. They retain existing `TechArticle` JSON-LD.
- New articles include visible Q&A and matching `FAQPage`, plus `Article`/`TechArticle` schema, canonical and descriptive metadata.
- The homepage and `/latest` include permanent internal links to the articles, independent of whether the dynamic Trending feed has adequate signals.

**Search markup realism:** Google's 2023-onward `FAQPage` rich result display is generally restricted to well-known authoritative government and health websites. These schema blocks are semantically valid and reflect visible text, but GAH should not forecast FAQ rich results or higher search rankings solely from them. Reference: https://developers.google.com/search/blog/2023/08/howto-faq-changes

## Primary sources independently checked for 200

- July 2025 DOJ/FBI memorandum: https://www.justice.gov/opa/media/1407001/dl
- Public Law 119-38: https://www.govinfo.gov/content/pkg/PLAW-119publ38/html/PLAW-119publ38.htm
- January 30, 2026 DOJ statement: https://www.justice.gov/opa/pr/department-justice-publishes-35-million-responsive-pages-compliance-epstein-files
- DOJ disclosures: https://www.justice.gov/epstein/doj-disclosures
- Current GAH worked example: https://grokarchivehub.com/investigations/epstein-december-6-7-2007-decision-gap

## Tests and staging status

- `node tests/test_seo_source_audits.mjs`: 28/28 checks passed, covering four route responses, canonical/H1, structured FAQ answers appearing in visible page text, staging noindex, internal links, sitemap coverage, exact primary-source links, and all 12 DOJ index links.
- Inherited `node --test tests/test_worker_entrypoint.mjs tests/test_wiki_service_auth.mjs tests/test_path_leak.mjs`: 6/6 test files passed, with no failures; staging isolation remains enforced.
- Cloudflare Pages staging compilation and deployment passed: `https://83e5ce84.gah-staging-517b8499.pages.dev` (Access HTTP 302, owner-only).
- No Cloudflare Pages production deployment, secret changes, billing settings, Patreon activity or database writes occurred.
- Public homepage and wiki return HTTP 200. Both proposed production URLs still return HTTP 404 before approval, as expected.
- This branch is intentionally independent of Ren's `ren/phase0-integration` staging-only safeguards. Do not integrate staging noindex or staging GA4-off headers into production.

## Preproduction release gate

1. Editorial review for accuracy, neutrality, citations and victim privacy.
2. Independent proofread of primary-record claims, legal deadline language, table comparisons, and metadata.
3. Consider using Google Search Console after publication; do not promise FAQ rich results.
4. Integrate into vetted current production *package* only; never rebuild from outdated main. Exclude staging demo feed.
5. Verify all 118 expected sitemap entries are present, source URLs and internal links resolve, guides return HTTP 200 with correct canonical/indexing, public home/latest remains functional and staging stays behind Access.
6. Re-run live search, wiki gateway, signed-webhook rejection, payment-disabled state, CSP, rate limiting, secrets/binding parity and rollback.
7. Do not activate paid checkout or change any member entitlements.
8. Obtain explicit production approval first.

## Next editorial backlog (not implemented)

- Track removals/re-redactions/withholdings only from documented original URL, timestamp, original/restored hashes and agency notice; never manufacture status.
- Identify official per-Data Set downloads only where direct file/ZIP URLs have been individually verified; current hub navigates official indexes.
