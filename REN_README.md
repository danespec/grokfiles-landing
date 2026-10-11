# GAH — current production-source snapshot for Ren / Meta Muse

Snapshot: 2026-10-09. Base: the Cloudflare Pages release package used for the October 8/9 GAH-090/091 deployment. This is the newest validated Worker and public front-door code available in the local operator build directory.

## What is here
- `_worker.js`: production Worker code, including research API, search integration, AI/MCP/A2A endpoints, Patreon membership and dormant PayPal live recurring subscription integration.
- HTML routes, static assets, Barak viewer and search indexes, small original-source manifests and metadata.
- `wrangler.example.toml`: developer template without production bindings.

## Deliberately excluded
- Approximately 1.4 GB of large evidence-data imagery and original binary sources, especially high-resolution birthday-book pages. These were not silently recreated. Open evidence is available via the public GAH site and its source links.
- The local Cloudflare `.wrangler/` runtime state, private bindings and any credentials.
- Production databases, secret values and operator-only archives.

## Source trust rules
- This is a *code snapshot branch*, not the default branch and not permission to deploy. Do not push to `main`.
- The existing public GitHub `main` branch is old; use THIS branch to analyze the current code.
- The official approved V2 rebuild brief is the governing specification: establish canonical search manifest, confidence definitions, original-source audit trails and reconciled Barak counts before redesign.
- Evidence must remain free; preserve public AI/MCP/A2A/OpenAPI interfaces, Patreon portal, PayPal wiring and existing archive routes.
- Do not introduce a generated answer layer on public search, co-occurrence graphs, or unsupported archive-size claims.
- Submit independent feature branches/PRs, tests, and reproducible audit reports. Keep production changes subject to owner approval.

## Snapshot integrity
Worker SHA-256: `2589511c2fde60a4f10a70ccc42ac86ecdaaf07003290a8af04d962dc70bb14d`
The live Cloudflare deployment should be compared separately for later changes; this branch is not an automatic CI mirror.
