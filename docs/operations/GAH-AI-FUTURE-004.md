# GAH-AI-FUTURE-004 — release clearance and graph pipeline

## Authorization and status
The owner authorized production only after release gates pass. This supersedes the earlier candidate's no-production instruction; it does not waive authenticated staging or reliability validation.
Base candidate dfa8a3ec35df2e9c32081dbbf36ce9959990b945, based on main 1b716ae. No intervening main changes were found at audit.
Production remains gated until an owner-authorized Cloudflare Access session or existing authorized staging service credentials are available. Never extract browser cookies, remove Access, or grant a new service identity merely to pass a test.

## Verified omissions and repairs
- The old immutable preview d25aa1ba inherited production KV/D1 and presence bindings, lacked GAH_STAGING, and lacked the dedicated limiter. Its successful upload was not proof of isolation.
- The staging project's preview configuration was backed up privately and changed to isolated staging bindings: no KV/D1, only the existing dedicated staging limiter, existing staging environment and origin configuration. Old previews must not be used for validation; verify the replacement deployment's effective bindings.
- Atlas HTTP endpoints previously had no throttle. New Atlas endpoints now require a responsive atomic limiter; missing/malformed/unavailable limiter returns 503/no-store before reading assets. Limited requests return 429/Retry-After. No fallback writes to unrelated KV. Existing MCP and search behavior is preserved. Before production, attach a separately verified production limiter; never attach the staging limiter to production.
- Production 503s were reproduced as plain-text error code 1102. Six-hour Pages metrics reported 237 exceededResources outcomes and 4,595 successful invocations for the affected Pages Worker. This establishes resource exhaustion; it does not by itself isolate every hot function or prove a proposed optimization fixes it.
- Keep the current production deployment edb76419-d923-4429-8085-9876fbd20a42 and the archive registry intact.

## Offline graph publication pipeline
scripts/atlas_publication_pipeline.py prepares deterministic, privacy-minimized review candidates. Output must be outside the checkout, exclusive-create, mode 0600. There is no network client, deploy action, automatic approval or public-route import.
A specification uses gah.atlas.review-spec.v1 with revision, previous_candidate_sha256, stories, events, chains and corrections. Strict fields reject narrative, names, arbitrary URLs, paths or operational fields.
Story rows contain ID, confirmed/probable/incomplete classification, explicit citation roles, stopping-point code and limitation codes. Every cited ID must be in that published story, indexable in the public registry and absent from privacy exclusions. A probable published story cannot be upgraded to confirmed. Roles are substantive_anchor or supporting_citation and require editorial review; anchor-array membership never assigns a role automatically.
Events have machine IDs, story IDs, ISO day or explicitly uncertain date, classification, consistent story citations and limitations. Chains reject duplicate event IDs, reversed known dates and a documented endpoint with uncertain chronology. Dates and claims are not invented from OCR.
Stopping points: source_ends, missing_record, unresolved_chronology, review_incomplete, documented_endpoint. Limits include citation_membership_only, content_not_independently_verified, redactions_preserved, date_uncertain, incomplete_chain and association_not_wrongdoing.
Review attestation gah.atlas.review-attestation.v1 binds candidate SHA256 and requires approved privacy/evidence-role/chronology decisions. check-review revalidates the projection and both current source byte hashes. Any Atlas or registry change invalidates approval. This file is an operator's review record, not a digital signature or proof of reviewer identity. CI does not manufacture attestations.
changes validates adjacent revisions and predecessor hashes and emits additions, withdrawals and changed IDs. Withdrawals require explicit correction records. Change sets remain review-required and are not an automatically served feed.

Example (all file paths refer to private review inputs, never raw Atlas drafts):
```sh
python3 scripts/atlas_publication_pipeline.py prepare --atlas atlas/data.json --registry content/identifier-dossiers.json --input /private/review/spec.json --output /private/review/candidate.json
python3 scripts/atlas_publication_pipeline.py check-review --atlas atlas/data.json --registry content/identifier-dossiers.json --input /private/review/candidate.json --review /private/review/attestation.json --output /private/review/validation.json
python3 scripts/atlas_publication_pipeline.py changes --atlas atlas/data.json --registry content/identifier-dossiers.json --previous /private/review/previous.json --input /private/review/candidate.json --output /private/review/changes.json
```
GrokBot v3.84+ releases must first complete existing Atlas publication review, regenerate the minimized catalog, then separately review graph roles and events. Do not promote drafts or infer substantive anchors from citation counts. The existing seven public citation edges remain the only reviewed pilot.

## Required gates and rollback
1. Protected immutable preview must use production compatibility settings with isolated resources. Verify anonymous 302/401/403 and an owner-authorized authenticated smoke pass.
2. Run all 82 locators, five reviewed story projections, seven edges/six records, reverse lookup, host/method/privacy rejection, MCP/OpenAPI/Markdown/llms and conditional GETs. Verify actual 429 and dedicated limiter behavior.
3. Read actual preview and production bindings; confirm no preview access to production state, public analytics disabled in preview, cache no-store/noindex, and no production-origin fallback.
4. Resolve resource exhaustion and measure Pages CPU using pagesFunctionsInvocationsAdaptiveGroups, not workersInvocationsAdaptive (which omits Pages functions). Compare like windows and track outcomes separately from HTTP statuses. Never label wall duration as CPU.
5. Verify production-specific limiter configuration, all CI checks and exact bundle/asset hashes, then merge and deploy the exact tested SHA. Re-check original archive locators, 206 PDF ranges, SEO, consent/analytics/ad flags, Intel Access and graph counts. Roll back immediately on material regression.
6. Preserve the existing asset manifest; exclude private reports, graph proposals, review attestations and development files from production packaging.
For runtime rollback use Pages deployment edb76419-d923-4429-8085-9876fbd20a42. No NAS rollback is needed for this task because no NAS changes are made. For preview-config rollback use staging-project-before.private.json through a deliberately scoped Pages configuration patch; never restore its production-shared bindings just to make tests pass. The old preview 3b7856b2 is historical and does not prove safe binding isolation.

## Future AI capability audit
| Capability | Current evidence / next gate |
|---|---|
| Machine discovery | Existing OpenAPI, MCP, Markdown, catalog; llms and bounded Atlas API in candidate. Preserve v1 compatibility. |
| Crawler identity | Collector uses Cloudflare verifiedBot for verified classification. User-agent matches are declared_automation only. No UA-only authorization. Optional unavailable bot fields must remain unknown. |
| Retrieval metrics | Existing operation/outcome/latency buckets contain no raw queries, IPs or source prose. Operational success does not measure semantic citation accuracy. Add reviewed answer/source evaluations before claiming accuracy. |
| Exact and semantic retrieval | Existing exact-ID/search and reviewed graph are retained. No vector binding or reviewed embedding corpus is provisioned. Do not present lexical search as semantic search; first evaluate a privacy-cleared benchmark and current-plan cost. |
| Caching | Public minimized responses have short validators; staging/errors are no-store. Source revocation binds Atlas/registry hashes. Address duplicated HTML processing before adding services. |
| Incremental graph releases | Offline lineage/change-set tooling ready; a public feed requires approved snapshots, retention and withdrawal policy, bounded pagination and separate route review. |
| MCP graph | Existing citation graph and reverse lookup retained. Events and substantive roles remain offline until reviewed; do not expose private drafts. |
| Monetization/x402 | Existing commerce preview advertises future protocols but x402 is not implemented. No payments or fees for public records. Gateway approval, licensed original-work scope, wallet/settlement, replay protection, receipt binding, refunds and fulfillment remain separate gates. |
