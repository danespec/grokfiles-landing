# GAH-PUBLIC-SMOKE-016 — Read-only production-route acceptance

**Verified October 13, 2026 UTC.** An uncredentialed public smoke run checked **15/15 expected routes** against the production apex. Each expected HTML page returned HTTP 200 with an HTML title; the legacy Hold-the-Letter URL returned HTTP 301 to the current investigation; `robots.txt` pointed to the apex sitemap; the sitemap included `/guides`; and the PayPal live readiness endpoint confirmed customer checkout and operator approval were both **false**.

## Reproduction

```sh
node scripts/qa/public_smoke.mjs
```

The script uses bounded 18-second requests, exact path expectations, no authentication, no private URLs, no payment mutations, no file downloads, and no write operations. Errors are reported as `FAIL` with the actual response code or unavailable transport status. Do **not** interpret HTTP 403, a timeout, or a missing search result as evidence of a removed document.

The checker is intentionally an **operator-run, external integration check**, not part of the offline Phase 0 CI suite. Public network outages and WAF challenges should not cause source-code pull requests to fail their offline regression suites. All existing 25 local/CI Phase 0 suites remain the release baseline.

### Historic GA4 error paths

GA4 recorded historic error-page views for `/photos` and `/hold-the-letter.html` in its September 13–October 10, 2026 settled reporting window. On October 13, 2026, the live paths were **200** and **301 → 200**, respectively, so do not classify them as presently broken based solely on historical page titles. The unrelated archived document `/archive/EFTA00404605` also returned HTTP 200.

### Explicit non-signoff

Passing these 15 checks does **not** verify every PDF source, mobile accessibility, every image/media asset, real member-provider payment and entitlement flow, SEO indexing, end-to-end browser interactions, or recovered-parent body authenticity. Those gates remain independently tracked. It establishes only the listed public route and fail-closed billing invariants on the check date.


### GitHub runner limitation (observed October 13)

A trial workflow executing this same read-only script on a GitHub-hosted Ubuntu runner received HTTP **403 on 14/15 routes** (the public `robots.txt` was 200), while the authorized Mac returned 15/15 expected responses. This is a network origin/WAF access difference, **not** an observed production outage, and it must not be interpreted as deleted evidence. The trial workflow was removed before merge so unrelated pull requests are not blocked by Cloudflare treating GitHub runner traffic differently. Use this script from an authorized, known test machine and record `unavailable` when a network fails. Do not relax Cloudflare rules for shared build runners.
