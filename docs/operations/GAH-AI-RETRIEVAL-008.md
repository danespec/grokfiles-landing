# GAH-AI-RETRIEVAL-008 — bounded production release
Base is PR 277 commit 697aa103f2c2fb1adc34f2ac32c9a2eed789f936, main baseline 1b759356f7ef6def13b57c9904edce0c98d9f194. The original 007 authenticated staging results remain evidence for the underlying pilot, not approval of this changed production profile.

## Production-safe release subset
- Twelve explicitly matched navigational phrases route to four known published destinations in existing Ask GAH /api/search and search_archive MCP. Unmatched, subject, mixed-intent and identifier searches use the entire existing production search path. No narrowed archive replacement.
- GET/HEAD /api/v1/publications/changes exposes the bounded 31-event, 17-publication feed, with version pin, numeric bounded pagination, no-store, noindex, stable ETag, exact-host gating and a fail-closed atomic limiter (30/minute). It is not a corpus-wide feed. OpenAPI 1.5.0, MCP get_publication_changes and llms.txt advertise it.
- Existing semantic and hybrid preview remains Access-protected; production /api/v1/research/search remains 404 and the experimental MCP tool is not advertised. Do not enable until verified CPU entitlement and controlled measurements. No training or payment change.
- Exact protected alias ai-retrieval-008.gah-staging-517b8499.pages.dev selects the same release surface for owner validation, but retains staging isolation and noindex. Other protected preview aliases retain the 007 pilot. No production bindings copied to staging.
- Preview query ETags now hash the request selector instead of reflecting raw query input.

## Remaining production gate
1. Authenticate to exact release alias with the owner's authorized browser. Check all 12 navigation destinations, all 31 feed events, HEAD/304/version conflicts, MCP and OpenAPI; assert experimental search 404. Confirm rate limiter binding, 429, noindex and no production KV/D1 binding. Never bypass Access.
2. Compare staging and main source/asset hashes; CI must pass. Record the live production rollback deployment immediately before merge. Obtain current deployment/config through authorized Cloudflare UI or CLI. Preserve existing production bindings and do not buy infrastructure.
3. Merge the bounded candidate only after the above checks. Deploy the identical validated artifact to production, preserving the production baseline manifest. Smoke-test production archive exact IDs (including outside pilot), ordinary subject search, navigation, feed, MCP, Atlas, robots, consent, and private controls. Roll back on material regression.
4. The 007 pilot remains separate from the release profile; no human relevance metrics claimed, and no semantic promotion until CPU entitlement / sustained measurements. Continue human independent review and broaden approved corpus later.
