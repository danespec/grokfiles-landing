# GAH-SEO-FAVICON-032 — Restore real public search-result favicon

Date: October 13, 2026. Google Search Console confirms the 137-URL
canonical sitemap is accepted, but only 8 of 40 tracked URLs are indexed.
Most newer research guides have not received recorded Google crawling.

Concrete visual/technical defect: /favicon.ico intentionally returned
HTTP204 empty bytes from the Pages Worker; /favicon.svg returned HTTP404;
the homepage had no HTML icon declaration. The independent GSC Wizard
on-page checker also reported faviconPresent:false for sampled guides.
This is a real site-brand presentation issue, NOT proof it caused Google's
nonindexing decision.

GAH's existing homepage has a text-only GAH brand mark; the site CSS
uses accent-dark #0a4d57 and a soft #f4f7f9 background. New deterministic
scripts/seo/build_favicon_032.py encodes a GAH monogram ICO using only
Python standard-library PNG/ICO encoders. Separate 48x48 and 96x96
PNG-encoded ICO images share the site header's existing colors.
No external font, paid image, evidence material or personal data.

New homepage head link points to /favicon.ico. Existing catch-all Worker
short-circuits /favicon.ico to 204. _routes.json now EXCLUDES only the
EXACT /favicon.ico static path so Cloudflare Pages serves it directly.
No broad .ico or API, admin, Wiki, member, TXT, WAF, Access or security
exclusion was added. Existing Worker code, including its old fallback
204 behavior, is untouched. IndexNow static key exception remains.

Acceptance:
- Valid two-entry PNG-encoded ICO; macOS file and sips recognize sizes.
- HTML homepage favicon discovery link exists and tests pass.
- Full Phase0 regression 36 suites passes.
- Verified static release base plus only favicon.ico, index.html,
  and _routes.json changed; _worker.js byte-identical.
- Protected staging and preview remain Cloudflare Access HTTP302.
- On public apex /favicon.ico response 200 with correct binary bytes,
  usual API auth and public content routes unchanged, IndexNow key intact.
- No claim that Google indexability or search ranking improved until actual
  Google records and visible SERP favicon confirm it.

Old Cloudflare production deployment and the immediately preceding verified
static release bundle are retained as rollback points.