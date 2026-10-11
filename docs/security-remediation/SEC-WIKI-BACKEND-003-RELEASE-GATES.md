# SEC-WIKI-BACKEND-003 — Coordinated rollout gates

Date: 2026-10-10
Base: `ren/phase0-integration` at `636b647606dd60d454935dc09a01623da3689dd6`.

## Production baseline and completed repairs

- Live wiki gateway path-disclosure hotfix: `server.js` checksum `393165491ac1b987a59c7539ee8892f7f7745432502e3351174e23537b96532d`. Public search, source, metadata, and resolve verified from the Mac: HTTP 200, public EFTA ID preserved, known local paths absent.
- Original wiki gateway image remains `sha256:08f3ab934377b1cf7ccbf78e69ac7d5fd9036c2d386fdf8ea26a0905bc8047f1`; original server checkpoint and restore script stored on NAS.
- Live AI service Story repair: candidate `server.js` SHA-256 `7b43bdf8488673848b2be4f6fc4a7962e3b8e59e9d6f299b8dde02887dd5121d`; production `/api/story` HTTP 200, `story_v3`, EFTA evidence present, no observed paths; original AI rollback preserved.
- Standalone Cloudflare Durable Object Worker `gah-sec-rate-limiter` deployed as version `6f51c8df-b749-4580-8ff0-74b98add8650`. Not yet bound to Pages; rate limiting is **not active** from this Worker.

## This GitHub review branch

This branch modifies the Pages `_worker.js` apex proxy, adds service-token forwarding only to the canonical production wiki host, strips browser-supplied proxy credentials, extends the internal path sanitizer, implements restricted wiki-origin CORS preflight, and extends tests.

The branch does **not** contain a production service token or enable backend authentication on its own. Do not treat a passing local CORS preflight as a deployed public search migration.

## Must be satisfied before the production Pages cutover

1. Reconcile this branch against the **actual currently serving Pages bundle**, not the old GitHub `main` branch (which lacks `_worker.js`). The Pages project is `grokfiles-landing`; confirm the currently active deployment and exact rollback target.
2. Retain all existing Pages bindings: `PRESENCE_ROOM`, `MEMBERS_DB`, `PHANG_DOCKET_STORE`, `X_POST_QUEUE`, `X_TOKEN_STORE`, and other production configuration. Add a `GAH_SEC_RATE_LIMITER` Durable Object binding to class `GahSecRateLimiterDO` in Worker `gah-sec-rate-limiter`; verify a public rate-limit test with controlled thresholds.
3. Provision a cryptographically random service token **server-side** in both Pages and the wiki gateway, without printing it, committing it, putting it in browser JS, or sharing it with preview environments. If this requires a Docker container replacement, preserve the exact existing environment, read-only `/doj` mount, `127.0.0.1:3015` binding, Docker network `grok-archive_default`, and `unless-stopped` restart policy.
4. Coordinate migration of the three direct wiki client `/api/search` callers in `server.js`, `frontdoor/site.js`, and `grok-relationship-map-v1.js` to `https://grokarchivehub.com/api/search`; check browser CORS, mobile behavior, archive links, Content Security Policy, and Cloudflare Access before enforcing backend auth.
5. Only after all three callers work via the apex Worker, flip backend service-token enforcement on and verify direct unauthenticated search/story/answer/help calls return 403 while apex-authorized search succeeds. Preserve the intentionally public source/metadata/resolve reader endpoints, protected by backend path redaction.
6. Test PDF.js, reader links, memberships, Patreon/PayPal webhooks, newsletters, indexing, analytics and paid-member routes before declaring comprehensive production readiness. Confirm operational rollback to old Pages deployment and Docker runtime configuration.

## Verification completed in isolated review

- Apex Phase 0 regression: 11/11 suites passed.
- Wiki-origin CORS (local real Pages Worker): 204 for `https://wiki.grokarchivehub.com`, 403 for an unrelated origin.
- Authentication and secondary proxy tests: 8/8 passed.
- Apex path-redaction tests: 37/37 passed.
- Real runtime rate limiter: 8/8 passed.
- Gateway isolation with mock upstream: search, answer, source, metadata, resolve 5/5 passed.
- AI Story mock/integration tests: 16/16 targeted handler tests passed; real production Story API later succeeded.

## Release decision

**No production Pages cutover from this branch until deployment-bundle reconciliation and browser-authentication sequencing are verified.** The wiki path-leak and Story Mode repairs, unlike the remaining Pages authentication work, have been deployed and verified independently.
