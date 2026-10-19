# GAH-GROWTH-ROUTE-20261019 — Recover campaign destination pages

Observed: October 19, 2026 (MDT). Production source regression, scoped remediation.

## Observed before patch

The 14-day X queue recorded in GitHub Issue #95 has 14 distinct tagged article URLs.
Live production checks of those exact URLs returned HTTP 200 for 11 and HTTP 404 for three:
- October 18: /guides/epstein-flight-logs-doj
- October 21: /guides/epstein-black-book-redacted-doj
- October 23: /guides/epstein-2007-draft-federal-indictment

Separately, the October 15 original X EFTA00000468 news link returned HTTP 404. The main branch lacked the four original /news/ HTML files and all three guide HTML files, despite their presence on the earlier full newsroom source branch. Search engines had crawled at least the flight-log guide previously, so this is a live broken-route problem, not evidence that the pages were never published.

## Scope of repair

Exact existing public HTML restored from branch chatgpt/gah-barak-publication-002-20261012:
- /guides/epstein-flight-logs-doj
- /guides/epstein-black-book-redacted-doj
- /guides/epstein-2007-draft-federal-indictment
- /news/doj-march-2025-review-emails-released
- /news/phang-fbi-notes-in-camera-october-16
- /news/gadeco-chinese-consortium-declined
- /news/efta00000468-removal-restoration-audit

Add these exact paths to existing FRONTDOOR_PATHS, FRONTDOOR_ROUTE_ASSETS, AD_EXCLUDED_EXACT_PATHS, and CORE_SITEMAP_ENTRIES. No analytics tracking logic, reader authentication, payment, security, wiki worker, or Cloudflare Access settings changed. Source articles, citations and caveats were not editorially modified.

## Validation

Pre-release local verification: seven HTML files nonempty; every route maps to an existing asset; all seven preserve their self-canonical URL, title, H1, ad exclusion, sitemap URL and local assets. Node syntax check and git diff --check passed.

Release acceptance requires a real production HTTP 200 on all seven routes after merge/deployment, plus another status check of all 14 original scheduled X links and the three original October 15 X news links. Do not count an HTTP 200 on a generic fallback page: verify canonical or page-specific content. This file is not a claim of a finished deployment or traffic growth.

No X scheduler entries are duplicated or changed. Issue #95 is the source of truth for user/Work-reported schedules; platform post IDs remain unverified.
