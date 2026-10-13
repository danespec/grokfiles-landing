# GAH-SEO-HUBS-017 — Restore discovery of two core indexable hub URLs

Read-only Search Console inspection on **2026-10-13** returned **"URL is unknown to Google"** for:

- `https://grokarchivehub.com/research-index`
- `https://grokarchivehub.com/barak/emails`
- `https://grokarchivehub.com/guides`

This is an indexing observation at the time of inspection, **not proof that Google tried and failed to crawl these pages**. The newly published Guides page is already present in the 131-URL live sitemap.

The production `/research-index` and `/barak/emails` endpoints both returned HTTP 200 and explicitly served `index,follow` and self-canonical links, but were **missing** from `https://grokarchivehub.com/sitemap.xml`. This update includes exactly those two existing indexable URLs in `CORE_SITEMAP_ENTRIES`, without creating new content or altering privacy/canonical status.

The site search page `/search` is intentionally `noindex,follow`; **do not add it** to XML sitemaps simply because it is a popular navigation route.

### Acceptance
- Both hub URLs return 200 with self-canonical and `index,follow`.
- Both appear once in the sitemap after deployment.
- The Guides entry remains present and the `/search` noindex route remains excluded.
- Full offline Phase 0 regression and protected staging precede production.
- Re-inspect indexing after Google discovers/retrieves the revised sitemap. Sitemap inclusion **does not guarantee Google indexing or search traffic**.
- Do not request Googlebot exemptions to bypass broad WAF restrictions without verifying genuine crawler identities and Cloudflare Security Events.

External-access/SEO follow-up remains open at issue #33; source-based keyword coverage remains open at issue #31. Payments are excluded from this release.
