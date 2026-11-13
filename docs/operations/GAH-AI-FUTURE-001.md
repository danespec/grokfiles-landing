# GAH-AI-FUTURE-001 — staging candidate
Base: production-source commit 1b716ae (archive integrity PR 272), November 13, 2026.
No production deployments, paid transactions, NAS writes, new secrets, WAF changes or Intel changes authorized by this release.

## Inventory
Existing: negotiated Markdown, OpenAPI, API catalog, agent skills, MCP, WebMCP, A2A, ARD, archive search, document bundles, visual evidence, source manifest/citation audit, agent telemetry, commerce preview and private reconciliation. Do not duplicate them. Live GET /llms.txt returned 404 while OpenAPI, AI catalog, Atlas JSON and auth.md returned 200; MCP GET returned expected 405.

## Candidate
- /llms.txt: concise source-first machine entry point, canonical links, evidence limitations, redaction policy and no training permission.
- /api/v1/stories: list 1–50 story locators, cursor and optional version pin; /api/v1/stories/{id}: exact story locator; /api/v1/atlas/status: published version, counts and SHA-256 of published data.
- Generated artifact contains only ID, tier, canonical URL, version, publication date and source hash. No raw prose, anchor arrays, victim/witness identities or operational fields. Re-projected on read. Missing/invalid asset fails closed; asset not directly exposed by new route. Public source data unchanged. No NAS or search backend call.
- Exact public host or staging Pages host only, GET/HEAD only, no arbitrary URL, query or file input. Errors no-store. Strong ETag and short cache on production only. Staging no-store/noindex.
- Discovery Link and OpenAPI descriptions updated, existing agent health extended. Existing MCP tools preserved. Reject unapproved browser Origin values; originless clients still supported. Existing DO/KV limiter scope added (60 requests/minute, staging fixture verifies 429). Existing limiter can fail open if neither backing service is available: verify real bindings and retain WAF. Do not claim a hard limit until confirmed.
- Atlas build regenerates artifact; CI checks drift. Future Atlas version must pass publication review and regenerate.
- No new public licensed route or payment integration. Premium terms, wallet, identity verification, actual settlement, receipt binding, replay, refunds and fulfillment remain separate gates.

## Validation / gates
New actual-Worker test covers every published locator (82), pagination, no duplicates, version mismatch, status/HEAD/ETags, host and method isolation, malformed query and missing asset, field projection, OpenAPI, llms, MCP origin and limiter. Existing Atlas regression passes; wiki fail-closed 11, wiki service auth 6, path leakage 37 pass. Legacy test_staging_harden.mjs fails on unmodified baseline due to missing truthyFlag in extracted fixture. Temporarily adding that dependency exposed two stale assertions; reverted fixture changes. Do not mark entire suite green.
Protected preview deployment and authenticated smoke checks still required. Do not use the old direct deployment scripts or reuse authentication tokens. Keep existing production and private resources intact. 
Further work: inspect real crawler identity and cache/CPU metrics; content-level editorial review of Atlas titles, claims, anchors and citations before richer API or knowledge graph; incremental change history only from versioned reviewed releases; measure retrieval success and origin load before adding vector search. Existing public archive remains free. Paid transactions remain unverified; no pricing or revenue assumptions.
