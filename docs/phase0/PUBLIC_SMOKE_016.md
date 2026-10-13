# GAH-PUBLIC-SMOKE-016 — Live public routes acceptance

**Scope:** read-only, low-volume, production-facing availability checks. No private wiki credentials, payment attempts, subscriptions, user data, or API secrets. This workflow does not deploy.

## Verified baseline — 2026-10-13 UTC

Mac-originated checks passed all **15 public routes/conditions**:

- HTML HTTP 200: `/`, `/news`, `/research-index`, `/search`, `/guides`, `/guides/how-to-search-epstein-files`, `/barak/emails`, `/visual-evidence`, `/photos`, `/archive/EFTA00404605`, `/investigations/hold-the-letter`.
- Legacy `/hold-the-letter.html` HTTP 301 → `/investigations/hold-the-letter`. This is a previously corrected redirect, not a new production change.
- `/robots.txt` HTTP 200 with the apex sitemap reference; `/sitemap.xml` HTTP 200 containing `/guides`.
- `/api/commerce/paypal/live/launch-status` HTTP 200, with `live_customer_checkout_available=false` and `live_checkout_operator_approved=false`. Customer payments must remain disabled pending separate merchant acceptance.

The old GA4 error-page report includes paths that returned errors at some time in its settled historical measurement window. Historical error-page sessions alone are **not proof those routes are currently broken**; the present 200/301 responses were independently confirmed.

## Continuous release checking

`scripts/qa/public_smoke.mjs` is a Node 22 standalone probe with bounded network timeouts and no dependencies, cookies or local file writes. `.github/workflows/public-smoke.yml` executes the same read-only check on pull requests and pushes to the full-archive integration branch and when explicitly dispatched. It does not replace the separate 25-suite deterministic Phase 0 regression.

A 403, 5xx or timeout in a GitHub runner is evidence of **that probe's failure**, potentially caused by WAF, rate limiting or network origin. Never turn it into a claim that a document is missing or deleted. Correlate with Cloudflare Security Events before changing any WAF rule. Do not weaken Cloudflare Access for staging, the wiki, or preview sites.

## Still outside this test

This does not certify mobile visual interaction, entire sitemap URL validity, full attachment provenance, unique Barak parent identities, all source-watch origins, Google indexing, AdSense acceptance, merchant live lifecycle or performance under load. Keep the corresponding open acceptance gates.
