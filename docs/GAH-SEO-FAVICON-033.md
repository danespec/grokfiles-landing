# GAH-SEO-FAVICON-033 — bypass stale 204 response at one icon URL

October 13, 2026. Following merged PR #74 and successful staging and
production uploads, direct GET /favicon.ico on grokarchivehub.com returned
HTTP204 with CF-Cache-Status HIT and old header X-GAH-Favicon:
empty-no-content. This old 204 was cached by Cloudflare with
Cache-Control max-age=86400, preceding the release.

The corrected source file and exact Pages route are functional:
GET /favicon.ico?gah-seo-032 returned HTTP200 and the correct 553-byte
icon payload with CF-Cache-Status MISS. The WWW-host equivalent returned
200 too. The direct URL will recover when old 204 cache entries expire
or are purged; no request to weaken WAF or globally purge Cloudflare
caches was authorized or necessary.

Apply a one-line versioning change to the explicit homepage favicon
declaration: /favicon.ico?v=032. This is a stable same-origin URL with
the same ICO file; Googlebot may crawl the versioned icon and search
engines remain in charge of when/if to display it. No change to
the Worker, routes, binary icon, API auth, or private Wiki.

Acceptance: full offline 36-suite Phase0 regression, independent PR CI;
protected staging and production deploy using prior immutable Pages bundle
with ONLY root index.html modified; live homepage head must advertise
the versioned URL; direct GET to versioned icon must return HTTP200 and
byte-match the public 553-byte two-resolution icon, HEAD should succeed
when supported; check public guide routes, sitemap, IndexNow, stage Access
and anonymous Wiki API security. Avoid claiming unversioned icon cache
is purged if direct GET still receives HIT/204. Record that separately.