# GAH-AI-DISCOVERY-005 — competition response
Base: production release 7f45615 (Nov 13, 2026). Scope: discovery-only candidate; no production deployment.

## Live read-only audit, November 14
- AI catalog, API catalog, MCP/A2A cards, OpenAPI, llms.txt and homepage Ask GAH panel exist. AI catalog did not explicitly advertise the new Atlas interfaces; Ask GAH is an interactive website assistant, not an unrestricted agent API.
- Both sitemap files were fetched: 116 editorial URLs and five identifier URLs. All 121 listed URLs returned 200, had self-matching canonical links, and no noindex conflicts. This is a listed-URL audit, not proof that all eligible pages are listed or indexed by Google.
- Three agent skill documents fetched successfully; SHA-256 digests exactly matched their published index.
- Atlas v3.82: 82 stories (30 confirmed, 52 probable), five reviewed stories and seven citation edges. No Atlas publication change.
- Live robots retained training restrictions and sensitive route disallows. Cloudflare-managed and origin robots groups are distinct; no crawler permissions changed.
- Audit evidence: private local directory GAH-AI-DISCOVERY-005-audit/sitemap-live-audit.json.

## Candidate
- Add Atlas query examples to existing MCP and public OpenAPI catalog entries, preserving entry identifiers and types.
- Extend AI catalog Link header and API linkset with actual public Atlas locators, graph, status, and the existing Ask GAH guide. No new endpoint or arbitrary assistant route.
- Add existing Barak St. Thomas, Qatar/Carbyne and Leon Black referral-status investigations to llms.txt. These links point to published pages; no new factual claims, title changes or ranking guarantees.
- CI verifies advertised interfaces, link targets' contracts, existing skill digests, HEAD behavior, and training/private-route restrictions.

## Remaining work and gates
- Ren's Nov 14 ten-query sample is directional, not exhaustive ranking evidence. Do not treat crawl activity as citations or paying demand.
- Title enrichment remains gated on explicit owner analytics clearance; use the Nov 2 brief and published page content only. No homepage, title, social, privacy, advertising, indexing or sitemap policy changes in this candidate.
- Semantic retrieval: establish a repeatable labeled benchmark on public editorial questions, exact identifier controls, and unanswerable queries. Compare current retrieval with a staging-only hybrid lexical/vector candidate. Measure top-k recall, citation validity, latency, cost, and abstention. Use only privacy-reviewed public publication material, never raw sensitive documents or private Intel.
- Training remains denied. Do not implement commercial training access before owner confirms the Cloudflare program, approved pricing, license terms and enforcement capabilities. Do not assume robots directives can enforce paid rights.
- Production deployment remains gated on authenticated staging, CI, asset/bundle parity, rollback and owner authorization. No secrets or payment changes.
