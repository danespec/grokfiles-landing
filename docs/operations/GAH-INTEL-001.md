# GAH Intel — private operations dashboard

Status: live on November 12, 2026, following PR #266 (merge 1029bdd). Initial Pages deployment: 32a57b26-4969-45e5-be3a-b848da57e72c. Standalone dashboard version: ae7f23a4-3a78-4731-a244-680adf42a987. Owner Access, dataset collection and signed monitoring were verified. The observations below describe the pre-release audit; later analytics reconciliation changes are documented in GAH-ANALYTICS-PARITY-001.md.

The dashboard at `intel.grokarchivehub.com` is a separate Worker. The public Pages Worker gains one optional, non-blocking observation hook. Collection requires `GAH_INTEL_ENABLED` to equal `true` and an Analytics Engine binding. Dashboard failures cannot alter public responses.

## Observed deployment and access

Read-only verification on November 12, 2026:

- Production Pages deployment: `f539f295-1a85-49c3-b020-c430be96938d`, source commit `3fa5a8dfd616ab31a0c03c44958829a289252ee1`.
- Automatic Pages deployments are paused. The source matches the current production commit, including November 11 news.
- `intel.grokarchivehub.com` did not resolve; no existing dashboard was found at that host.
- Existing preview Access policy uses a single exact owner email. Create an independent application for the intel hostname using that same verified owner, rather than expanding public archive protection.
- Pages settings displayed 56 variables/secrets and five resource bindings. Check the provider's current limit and actual production configuration immediately before adding two variables/secrets and one dataset binding. Preserve existing values and bindings.
- Current Wrangler credentials in the Mac's `~/.wrangler/config/default.toml` work. An obsolete preferences-directory credential is expired; do not reuse it. No credentials belong in this repository.

## Collection contract

Dataset: `gah_intel_v1`. One record per completed public Worker invocation, including an observed 500 if the existing handler throws. Indexed by hostname.

| Field | Meaning |
| --- | --- |
| blob1 | Schema `gah_intel_v1` |
| blob2 | Main public hostname |
| blob3 | Published path from a fixed allowlist, approved public API path, or generic bucket |
| blob4 | GET, HEAD, POST, OPTIONS, or OTHER |
| blob5 | Two-letter country or unknown |
| blob6 | Referrer category: Google, Bing, DuckDuckGo, Reddit, X, Instagram, Facebook, ChatGPT, internal, other, direct/unknown |
| blob7 | monitoring, verified_bot, declared_automation, or unclassified |
| double1 | HTTP response status |
| double2 | Elapsed Worker time to response, bounded to 0–120,000 ms |
| double3 | 1 for successful HTML GET responses, otherwise 0 |

Never store IP addresses, city, ASN, raw user agents, cookies, authorization or Access headers, visitor/session identifiers, query strings, request/response bodies, searches, arbitrary URL segments, or full referrers. Monitoring and query credentials never appear in records or client responses. The public privacy policy already describes operational request processing; this component introduces no optional browser storage or public client script.

`scripts/build-public-paths.mjs` derives the route allowlist from tracked public HTML paths. It contains 315 paths at the baseline commit. Unknown paths and evidence-file URLs are grouped. Regenerate after new public routes are added.

## Coverage and interpretation

This is prospective telemetry, with no historical backfill. `_routes.json` excludes static resources under several prefixes, including `/evidence-engine/*`, `/frontdoor/*`, `/frozen-assets/*`, `/research-heroes/*`, and `/source-renders/*`. Requests blocked before Worker execution are absent. Wiki/files-host traffic is absent. Do not change those routes just to increase telemetry coverage.

Counts use `_sample_interval` weights and are estimates when Cloudflare samples. There are no unique-reader or session metrics. Unclassified requests may include people and unidentified automation. Successful HTML responses are not a measure of reading or engagement. Server error rate is observed 5xx responses divided by observed requests in the selected class; response time is Worker time to return a response, not browser load time.

The default view excludes recognized monitoring and bot traffic but is labeled **Unclassified requests**. Traffic separation always shows all classes for the selected window. Only valid signed requests enter the monitoring class; unsigned browser checks and old probes cannot be reliably identified as internal.

## Authentication and queries

Every dashboard route, API, stylesheet, and script requires a valid Cloudflare Access JWT, verified cryptographically against the configured team JWKS, exact issuer and application audience, expiry, RS256 algorithm, and the exact owner email. Wrong hostnames and missing configuration return 403. Neither a header's mere presence nor the browser session alone is sufficient.

`workers_dev` and preview URLs are disabled; there are no routes in the checked-in Worker config. No authentication-bypass flag exists. Responses are private/no-store, deny embedding, and carry noindex/nofollow/noarchive. Dashboard assets are served through the same authenticated Worker, not public static asset routes.

SQL is constructed from fixed queries and allowlisted time/traffic filters. There is no arbitrary SQL endpoint. Six aggregate reads supply a summary, timeline, classes, routes, countries, and sources. A bounded in-memory cache coalesces identical requests for 60 seconds; the page refreshes every five minutes while visible. Provider failures yield 503 and clear displayed figures, rather than presenting a fabricated zero.

## Existing scheduled monitor

The Mac LaunchAgent `com.grokarchive.monitor` runs every 900 seconds and calls `grok-worker/bin/grok_public_monitor_scheduled.sh`, which calls `grok_public_monitor.sh`. Its four curl call sites cover ordinary GET, range GET, lightweight reader, and POST search probes.

`scripts/prepare-existing-monitor.py` checks the observed SHA-256 `83f4bd52fea29695a5874c9841a12eeed51382635a07c85986c88998f5d38289` and writes a separate candidate. It never replaces or executes the active script. The candidate delegates the four calls to `gah_intel_curl.py`, retaining probe outputs and arguments. The adapter emits a descriptive user agent and signs main-host requests. Other hosts never receive monitoring signatures. No secret or signature enters curl's process arguments; curl reads a small config through stdin.

The shared secret resides in a 0600 operator file and as a Pages secret. HMAC-SHA256 covers timestamp, method and pathname, with a five-minute validity window. This is a telemetry classification mechanism, not authentication. Redirect follow-ups changing paths are unclassified; canonical probe targets avoid that ambiguity. If signing is unavailable, probes continue as declared automation. A separate Node `monitor-fetch.mjs` helper is available for new, canonical HTTPS checks.

## Release procedure after owner approval

1. Recheck production deployment/source, local working state, current quota, variable limits, and the owner email against Access. Rebase if production moved. Keep Pages automatic deployments paused.
2. Create a new Access self-hosted application covering exactly `intel.grokarchivehub.com`, all paths, with one allow policy for the verified owner email. No Everyone, Bypass, or public policy. Record the returned team issuer and application AUD. Do not modify the existing preview app or public-host protection.
3. Create an Analytics Engine read-only token scoped to this account. Store it only as the dashboard's `ANALYTICS_READ_TOKEN` secret; no write privileges or public credentials. Configure `ACCESS_TEAM_DOMAIN`, `ACCESS_AUD`, `ACCESS_OWNER_EMAIL`, and `CF_ACCOUNT_ID` on the standalone Worker.
4. Deploy the standalone Worker with `workers_dev` and preview URLs disabled. Attach the `intel.grokarchivehub.com` custom domain only after its Access app exists. Confirm unauthenticated access is challenged and direct unauthorized Worker requests fail closed.
5. Back up the active monitor; generate a random shared secret locally, save it in a 0600 file, and add `GAH_MONITOR_HMAC_SECRET` to Pages. Add Analytics Engine binding `GAH_INTEL_EVENTS` with dataset `gah_intel_v1`, preserving every existing Pages setting. Keep collection disabled until the code is ready.
6. Build a release from the new commit plus the complete existing production asset inventory. Do not deploy this sparse checkout as the entire public site. Include the collector and public-path modules in the Worker bundle; exclude the dashboard's tests, dependencies, local fixtures, and operator files from public asset uploads. Reuse the verified release process and bindings. Add `GAH_INTEL_ENABLED=true` only with the validated release.
7. Install the reviewed monitor candidate and adapter with a rollback copy. Do not change its LaunchAgent schedule, probe targets, alert behavior, or TLS options in this release.
8. Run a signed canonical probe and an unsigned probe. Verify actual rows and execute all six real SQL queries; confirm monitoring appears only in the signed class. No real SQL round trip or dataset creation has occurred during preparation. Empty-dataset errors must remain explicit until the first event is queryable.
9. Check owner sign-in, unauthorized/expired-token denial, mobile/desktop rendering, time ranges, traffic filters, empty and provider-failure states, public search, evidence readers, and indexing/consent headers. Confirm the public homepage and current news match the pre-release baseline. Record deployment IDs and results.

No plan upgrade is authorized. Cloudflare documents free allowances of 100,000 writes/day and 10,000 reads/day for Analytics Engine, with three-month data retention. A single visible dashboard at its normal five-minute cadence generates about 1,728 aggregate read queries/day before caching. Usage from other applications and public Workers shares account limits; $0 is an estimate within available allowances, not a guarantee or an automatic spending authorization.

## Rollback

First disable `GAH_INTEL_ENABLED` without touching public content or other bindings. Restore the prior monitor and keep its schedule. If public behavior changes, roll Pages back to the verified previous release, preserving its existing secrets. Remove the intel hostname route or leave the standalone Worker behind Access with its fail-closed guard; never disable Access to troubleshoot it. Revoke the new read token when retiring the dashboard. Existing collected data follows the provider retention period; disabling collection does not erase it immediately.

## Verification record

- Eleven focused tests pass: privacy schema, signed/expired/spoofed monitoring, collector failure isolation, Access signature/identity/audience/issuer/expiry/host, private dashboard routes and query cache, bounded sample-weighted SQL, provider failures, Python/JS signature agreement, public response preservation, public exception handling, production/staging indexing boundary.
- `npm run check:paths` passes; 315 published paths.
- Standalone Wrangler build passes: 70.77 KiB uncompressed, 18.51 KiB gzip at preparation. Public Worker bundle also builds successfully at approximately 1.4 MiB.
- Production dependency audit reports no known vulnerabilities.
- Existing path-leak suite: 37 checks pass.
- Four public endpoints match baseline status, headers, and body with a fixed clock: `/robots.txt`, `/.well-known/api-catalog`, `/api/archive-status`, `/openapi.json`.
- Existing staging source suite reports 18 pass / 2 fail both before and after this patch. Its entrypoint check expects an obsolete exact source string; its GA4 check expects an obsolete embedded measurement ID. No unrelated production fixes are included.
- Browser session confirmed production metadata and existing exact-email Access policy. Local browser visual QA and live Analytics Engine SQL/ingestion remain release checks; local preview access was unavailable from the connected browser.

Reproduce from `workers/gah-intel`: `npm ci`, `npm test`, `npm run check:paths`, `npm run build`. `npm run preview` serves sample data on loopback only. Its monitoring filter intentionally simulates provider failure and its last-hour view simulates an empty result; these fixtures are not imported by the production Worker.

## Provider references

- [Analytics Engine setup](https://developers.cloudflare.com/analytics/analytics-engine/get-started/)
- [Pricing](https://developers.cloudflare.com/analytics/analytics-engine/pricing/)
- [Limits and retention](https://developers.cloudflare.com/analytics/analytics-engine/limits/)
- [Querying from a Worker](https://developers.cloudflare.com/analytics/analytics-engine/worker-querying/)
- [Access JWT validation](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/)
- [SQL date functions](https://developers.cloudflare.com/analytics/analytics-engine/sql-reference/date-time-functions/)
