# REN-BARAK-CACHE-009 — Resolve cached pre-fix JSON 404

**Observed October 12, 2026:** After PR #49 supplied an exact allowlisted Worker backend proxy, the unversioned apex URL `/assets/barak-archive-emails.json` continued to return the pre-fix **HTTP 404** from a Cloudflare `HIT`, with `Age` around 492 seconds. Fresh query-keyed requests returned HTTP 200 `application/json` and `X-GAH-Barak-Manifest-Proxy: verified-wiki-json`. The PDFs manifest had not accumulated the same stale 404 and returned 200.

## Change

The existing one-line `archiveIndex.emailsUrl` value in the active apex `/assets/barak-data-050.js` now includes a fixed version query. The apex Worker emits a versioned `barak-data-050.js` URL on all four Barak-application source templates to bypass any stale data-script cache. The script HTML rewrite that adds `data-cfasync=false` is widened narrowly to retain compatibility with the versioned Barak application script URLs (including the source-integrity patch's `barak-portal-027.js` version).

No sitewide purge, WAF relaxation, Access policy, membership, payment, or private document is changed. Stale search results must not be confused with evidence that a file has been removed.

## Acceptance

Run all 18 Phase 0 suites including the six cache-delivery assertions, compile the Pages Worker, deploy to protected staging (Access remains required), then verify the production Barak page script URLs, source-identical manifest JSON and counts. The real NAS gateway was separately rebuilt from the secure October 11 base image with the corrected manifest and viewer (see PR #49). Test zero email slot source links, 11,089 email rows and intact separate PDF attachment lane. Do not count the remaining recovered-parent attribution gate as closed.

## Rollback

Previous Cloudflare deployment remains available for rollback. The secure original gateway image and old private Compose configuration remain on the NAS. This cache-delivery follow-up only modifies the main Pages bundle.
