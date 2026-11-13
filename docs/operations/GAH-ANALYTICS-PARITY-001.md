# GAH analytics parity remediation

## Scope and authoritative configuration

The GA4 UI was inspected on November 12, 2026. Property `525337308` has the main-site stream `16288696192`, measurement ID `G-XHE84C8D1V`. The older wiki stream `13638862541` uses `G-48G8M0230N`. Main production HTML already delivered the main-site ID through the Worker, overriding the older baked-in ID. A repository mismatch is not evidence that the seven shared evidence pages delivered the wrong production ID.

`GA4_MEASUREMENT_ID` is the explicit production configuration. `GAH_GOOGLE_TAG_ENABLED` now takes effect. Staging remains disabled even if that flag is true. Successful public HTML receives one shared `/frontdoor/analytics.js` runtime and one consent UI implementation. Legacy shell versions delegate rather than configuring their own Google tag. Advertising eligibility, approval, indexing, security headers and evidence bodies retain their existing independent policies.

The wiki gateway companion is prepared by `workers/wiki-analytics/prepare-gateway.py` from an exact copy of the deployed gateway. It inserts the shared runtime after the existing authentication and rate-limit guards. Only existing public wiki HTML is instrumented. Admin/API responses and missing records retain their previous behavior. Its assets are the same checked-in browser files, served under a fixed three-file namespace.

## Delivery and consent architecture

Retain direct Google tag delivery with Basic Consent Mode v2. Advanced mode sends cookieless measurements after denial; that changes the existing collection promise and is not enabled. Zaraz would add another configuration and event owner. Cloudflare's Google Tag Gateway was explicitly **Disabled** in the live zone UI. Existing blocked gateway paths remain blocked; no consent boundary is bypassed.

The shared runtime loads Google only after analytics consent on the exact public apex/www/wiki host allowlist. It does not run on previews, the private dashboard, private paths, or declared browser test/monitor agents. Configuration uses `send_page_view:false`; the runtime sends one pageview per eligible document/history navigation, with an independent deduplication state. GA4 enhanced measurement's browser-history pageviews are disabled to avoid duplication. Automatic search, form, outbound-link and download capture are disabled; explicit source-click events send bounded document IDs and destination hostnames. Scroll and video enhanced measurements remain enabled.

URLs sent to analytics omit fragments, arbitrary query parameters, search terms and tokens. Bounded campaign parameters and valid PDF document IDs are retained. Empty referrers remain empty; external referrers retain their origin/path without private query strings. Consenting apex/wiki navigation uses a common first-party analytics cookie domain. A six-month shared consent-preference cookie contains a choice and consent flags, not a visitor identity. Withdrawal disables further events and removes analytics cookies.

Google Privacy & messaging's purpose-specific Consent Mode callback bridges explicit analytics grants/denials. Unknown or unconfigured CMP signals never count as grants. An operational CMP pending state overrides an older first-party grant. The persistent privacy control opens the Google revocation UI when that CMP manages analytics. A published CMP configuration is not proof that its message renders on the public website.

`?gah_debug=1` labels manual verification with `debug_mode:true` and `traffic_type:gah_operations`. Normal events omit the debug parameter entirely. The GA4 developer-traffic exclusion must be active before live debug verification. Automated browser tests fulfill all network requests locally and emit zero live measurements. HTTP health probes use the existing monitoring HMAC and are separated from other TI requests.

## Private reconciliation

The dashboard adds authenticated `/api/reconciliation` reads from a dedicated KV namespace. It has no public write path or arbitrary query interface. The owner's collector uses the existing Wrangler session for Cloudflare aggregate reads and the KV upload. Google integration accepts an independently authorized read-only service account; credentials and report snapshots stay outside this repository.

The module separates raw HTTP requests, browser pageviews, GA4 pageviews, wiki browser data, PDF viewer views, monitored/verified-crawler Worker requests, sessions, active users, countries and referral hosts. Cloudflare properties are displayed separately rather than added together. Historical preview and unrelated hostnames are excluded by explicit filters. No measure is labeled a confirmed human reader.

The default reconciliation window is seven complete UTC days, independent of the TI request filter. Worker class totals have a separately labeled rolling 24-hour prospective window. GA4 differences are unavailable unless data and date boundaries are comparable; a non-UTC GA4 property cannot silently be subtracted from UTC Cloudflare days. Missing providers are unavailable, never zero. Snapshot age over two hours is marked stale. Cloudflare adaptive counts may be estimates; consent, blockers, platform definitions and reporting delays remain reasons for expected differences.

AdSense remains unapproved in the observed UI, with **Low value content** and authorized `ads.txt`. Analytics undercounting is not an established cause of that rejection. No advertising approval flag or ad placement is enabled by this work.

## Validation

- `node tests/test_analytics_html.mjs`: response normalization, one runtime, authoritative ID, enable flag, staging isolation and preserved security/indexing policy.
- `tests/test_analytics_browser.mjs`: isolated real-Chrome consent, withdrawal, deduplication, history, referral, URL redaction, subdomain continuity, PDF, preview/monitor exclusions and CMP scenarios. Every HTTP request is fulfilled locally.
- `npm test --prefix workers/gah-intel`: collection privacy, signatures, Access JWT enforcement, bounded queries, fail-open public observation, monitoring adapter and reconciliation failure/staleness behavior.
- Existing path-leak and upstream-script restoration checks remain applicable.
- Protected Pages candidate `572bd794.gah-staging-517b8499.pages.dev` contains the corrected bundled Worker. Owner browser checks covered the seven specified evidence routes plus investigation, dispatch, news, research, archive, search and valid PDF-viewer routes. One runtime and zero Google tags were observed on staging, including after acceptance.
- Wiki loopback candidate checks covered eleven successful public routes and three missing/private routes. Public body content, response status and robots headers matched the baseline; private/missing routes gained no instrumentation.

Live network delivery, DebugView, CMP rendering and final production route checks are release gates; isolated fixtures are not substitutes for those checks. Private audit receipts contain provider deployment identifiers, response evidence and any unresolved gates.

## Deployment and rollback

Preserve the initial TI release: PR #266 / merge `1029bdd`, Pages `32a57b26-4969-45e5-be3a-b848da57e72c`, and dashboard version `ae7f23a4-3a78-4731-a244-680adf42a987`. Reconciliation adds a KV read binding; it preserves the Access application, owner policy, Analytics Engine dataset, read secret, signed monitor and disabled development/preview URLs.

1. Save current provider configuration privately. Publish only the tested full public asset tree and the extracted JavaScript Worker module; a Pages multipart build artifact must never be uploaded as JavaScript.
2. Set the verified ID and explicit enable/Google-CMP analytics flags in production without dropping existing variables or resource bindings. Deploy the reviewed source and verify public routes, consent behavior, CSP, indexing, search, source links, ads-off status and private Access challenges.
3. For Pages rollback, use the prior successful production deployment and restore only the changed analytics variables from the private before-receipt. Keep the TI collection binding, monitor secret and Access application intact.
4. For standalone dashboard rollback, deploy the retained pre-reconciliation config/version. The KV snapshot can remain private and unused; no public route depends on it.
5. Before the wiki cutover, retain the complete original container configuration, a rollback image, original source files and the stopped original container. The candidate must preserve the original environment, readonly archive mount, network, extra hosts, restart policy and loopback-only port binding. Roll back by stopping/renaming the candidate, restoring the original container name and starting it.
6. Stop the reconciliation LaunchAgent if rolling back its collector. Do not purge datasets, broaden Access policies, enable ads, replay historical requests as pageviews, or change evidence bytes.

## Read-only provider connection and reporting calendar — November 13

The GA4 Data API connection uses analytics.readonly and Viewer access on the established property only, with cost and revenue restrictions. Its credential and private collector configuration stay on the operations Mac outside the repository. The collector accepts a private `reporting_timezone` configuration; set it to the actual GA4 property timezone. Cloudflare hourly buckets are regrouped into that calendar, and API timestamp bounds are converted to UTC. DST is accounted for. Daily differences remain withheld when provider timezones differ or hourly buckets cannot represent fractional-hour boundaries. Recent GA4 data may still be revised during processing.

Collector validation: `python3 workers/gah-intel/test/test_reconcile_timezone.py`. Restore the retained pre-calendar collector and private configuration to roll back this reporting-only change; public website and Access deployments do not change.
