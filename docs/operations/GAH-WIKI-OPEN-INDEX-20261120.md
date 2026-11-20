# Open the GAH research wiki — November 20, 2026

Owner direction: remove the arbitrary, restrictive wiki indexing posture. Make useful publicly published research navigation discoverable while preserving source, privacy, redaction, and canonical controls.

## Search Console baseline

Source: connected Google Search Console for the domain property, 2026-08-17 through 2026-11-17, grouping by page.

| Surface | Pages with impressions | Impressions | Clicks |
|---|---:|---:|---:|
| Wiki | 271 | 1,015 | 7 |
| Main and other subdomains | 45 | 423 | 9 |

Wiki impressions per three successive periods: 621 (Aug 17–Sep 16), 384 (Sep 17–Oct 17), and 10 (Oct 18–Nov 17). URL Inspection confirmed wiki homepage excluded by noindex on Nov 13 and two historic archive links excluded by HTTP noindex. This pattern shows a visibility decline but does not independently establish sole causation.

## Reopening

- Three public wiki directories (/, /archive, /research-index) become self-canonical, indexable entry points.
- Research routes expand from 2 to 66 self-canonical indexable guides, still presented as navigational finding aids rather than adjudicated findings.
- Four topical research directories become indexable.
- All 69 published receipt cards become crawlable. Fourteen self-canonical standalone source cards enter the sitemap. The other 55 retain their main-site editorial canonical and stay out of the wiki sitemap.
- Wiki sitemap expands from 2 to 87 self-canonical URLs: 3 directories + 66 research pages + 4 topics + 14 standalone receipts.
- Five potentially reidentification-sensitive wiki navigation pages remain noindex: alias passenger, missing names, phonebook alias, redacted names, unredacted flight log. A main-owned MCC route stays noindex.
- Main homepage gets a prominent research-first navigation row above latest reporting, preserving the breaking headline and original reporting.

## Release gates and boundaries

- Never index raw unreviewed OCR, expose protected identities, undo redactions, or change access controls.
- Do not turn ads on for sensitive EFTA or archive source content; no AdSense account changes.
- Preserve canonical destinations for all duplicated public source cards. Main domain sitemap and indexed editorial publications stay intact.
- The production wiki gateway contains newer GA4 instrumentation and unrelated policy entries than the repo snapshot. Preserve those live additions during deployment.
- Confirm public HTTP 200, correct robots/canonical, 87 sitemap URLs, all safety exclusions, redirects, and working archive research links.
- Verify that runtime private APIs and backend documents are not exposed as public static files.

Google chooses whether or when to crawl and index; a new sitemap is discovery, not proof of indexation or AdSense approval.

References: https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls and https://developers.google.com/search/help/crawling-index-faq
