# Final release verification — acceptance passed

PRs #236 and #237 are deployed as main Pages a44c3d1e. The wiki runs immutable image sha256:e42dff29b7936591fe400db5042b9feecafa3cb3524a1b0113d43edf96d35826 with its prior container retained for rollback. The production origin checks pass: 69 receipts, all 78 research-route decisions, 74 sitemap URLs, public resolver 200 and unauthorized API search 401. Existing gateway source, authentication/rate-limit guards and mounted configuration remain preserved.

Fresh canonical checks passed 340 HTML pages, 955 linked routes, 267 distinct share images, 138 identifier targets and 15 redirect probes. The linked graph reports no unexpected operational copy, HTTP failures or indexable self-canonical pages missing from the two hosts' sitemaps. The sitemap set contains 196 main editorial routes, 69 dossiers and 74 wiki pages. The older fixed 334-page test expectation was replaced by an inventory-derived coverage assertion; it now requires every captured sitemap URL plus the contact-book source-guide probe.

After the owner saved the corrected Cache Rule, a fresh canonical linked-graph crawl and separate research-policy check pass. The public /research-index returns DYNAMIC with current direct-owner links; all ten stale-link failures are cleared. All 78 route ownership, redirect, robots and canonical contracts pass. No additional purge was needed. The earlier cached failure is retained in the private historical capture.

The accepted final bypass condition uses URI Path operators (the earlier path.extension expression was rejected by the dashboard):

    (http.host eq "wiki.grokarchivehub.com" and (not (http.request.uri.path contains ".") or ends_with(http.request.uri.path, ".html") or ends_with(http.request.uri.path, ".htm") or starts_with(http.request.uri.path, "/sitemap")))

Keep Bypass cache in the last Cache Rule. This covers clean HTML routes, explicit HTML routes and sitemap XML while retaining the earlier static asset rules. Current Wrangler credentials cannot edit Cache Rules. Training policy, Bot Preference Sync, security protections and the accepted robots formatting exception remain unchanged.

The audit scope excludes APIs, authentication/unsubscribe actions, protected staging, static/file assets and unreviewed raw corpus records. Search Console, other edge regions and DOJ PDF availability are not acceptance claims. Historical failed crawls remain private evidence; this note and sixth-pass-acceptance.json describe the current release.
