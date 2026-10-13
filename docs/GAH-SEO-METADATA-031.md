# GAH-SEO-METADATA-031 — Source-bound metadata repair

**October 13, 2026.** A bounded, read-only live audit of every URL in the 137-URL
production sitemap checked title, description, H1, canonical, and JSON-LD
syntactic integrity from publicly returned HTML.

**Measured baseline:** 137/137 pages responded; zero missing or duplicate
titles, descriptions, or H1s; zero mismatched canonicals; zero malformed or
missing JSON-LD script blocks. Of the 137 descriptions, three were under 80
characters and terminated as incomplete fragments; another 25 exceeded the
audit's 190-character *editorial* threshold. That threshold is NOT a Google
hard length requirement and the 25 long summaries are not automatically
invalid or grounds for noindex. Google may generate its own snippets.

The three incomplete fragments were repeated in meta description,
Open Graph description and Twitter description for:
- /investigations/efta-compliance-tracker
- /investigations/new-mexico-doj-epstein-records
- /evidence-briefs/todd-blanche-no-evidence

They were replaced with original, complete, source-grounded descriptions
preserving the articles' procedural limits: July 30 DOJ delivery notice is
not a court ruling; NMDOJ access demand is not proven federal production;
Blanche's answer was scoped to reviewed evidence and not an exoneration of
all associated persons. All three meta/social summaries are synchronized.

The fourth change shortens only the long meta description for
/guides/epstein-2007-draft-federal-indictment. It retains the EFTA01703108
locator, 56-page scan, 53-page alternative accounts and proposed 60-count
context WITHOUT claiming they are authenticated as the same document.

**Scope:** Four HTML HEAD metadata edits only, with article body and the
latest Worker, routing, robots, sitemap, Access, rate limits, membership and
payment behavior untouched. New offline regression in
tests/test_meta_snippets_031.mjs checks complete sentences, source limits,
length, canonical/H1 preservation, and social-metadata alignment.

The sitewide audit script and a detailed before-release report are retained
owner-private on the connected Mac (GAH-SEO-METADATA-031-private), not publicly
republished as raw pages. After deployment, rerun the live 137-page audit and
verify all four content changes and no new duplicate titles, description or
JSON-LD faults. Use GitHub CI and protected staging first.

**Indexing caveat:** GSC still lists 7/40 indexed, 3 obsolete erroneous
Wiki sitemap submissions. None of this metadata repair establishes Google's
crawl, indexing, ranking improvement or AdSense approval. It does not remove
those Search Console submissions or bypass 403 protections.
