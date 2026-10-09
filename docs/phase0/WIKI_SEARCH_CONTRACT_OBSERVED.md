# Wiki search contract — observed from the snapshot

Status: **observed, not authoritative.** This documents what the apex
`_worker.js` (snapshot `7bfc664`) sends to and expects from the upstream
search backend on `wiki.grokarchivehub.com`. The wiki host itself is NOT in
this repo. ChatGPT must confirm or correct every item below against the
actual wiki proof-layer implementation before Phase 0 code depends on it.

## Request (apex → wiki)

- Transport: `POST` through `proxyProofLayer` (the apex Worker proxies;
  the search engine lives on the wiki host).
- Headers: the client's request headers are forwarded, EXCEPT — after the
  `ren/security-remediation` branch — `cookie` and `authorization`, which
  are stripped on the upstream hop. The hop authenticates via
  `WIKI_INTERNAL_PROXY_HEADER` instead.
- Body (JSON), built in `handlePublicSearch` (`_worker.js` ~L5010):
  - Normal query: the client's payload as received:
    `{ q, query, tag: "All", limit, fast: true, no_ai: true }`
    (the embedded search UI sends `limit: 10`; the server clamps to 1–50).
  - Exact-person phrase queries (matches in `PUBLIC_SEARCH_EXACT_PERSON_PHRASES`):
    `{ ...payload, q: <original query>, limit: 50 }`.
  - Alias expansion: a second `POST` with `{ ...payload, q: <inverted alias>, limit: 50 }`
    for entries in `PUBLIC_SEARCH_INVERTED_QUERY_ALIASES`.

## Response (wiki → apex)

- Must carry `Content-Type: application/json`; non-JSON responses are passed
  through to the client with the upstream status unchanged.
- Malformed JSON → apex returns `502 { ok:false, error:"invalid_upstream_json" }`.
- Shape: `{ hits: [...] }` or `{ results: [...] }` — the handler accepts
  either key (`data.hits ?? data.results`).
- Row fields the apex reads (first match wins, via `pick`):
  - identifier: `efta_id` → `id` → `efta` → `document_id`
  - title: `title` → `name`
  - text: `snippet` → `summary` → `text` → `content` → `combined_text` → `body`
  - link: `read_url` → `pdf_url` → `url` → `source_url`
- Sanitization (`sanitizePublicSearchValue`, `_worker.js` L4422): private
  fields (`path`, `filepath`, `file_path`, `source_path`, `local_path`,
  `absolute_path`, `filesystem_path`, `disk_path`, …) are dropped; strings
  matching local-filesystem patterns (`/Volumes/…`, `/volume0…`, `/Users/…`,
  `/mnt/…`, `C:\…`) are dropped; remaining strings pass through
  `publicSearchCleanString`; depth capped at 12.
- The apex then merges wiki rows with editorial rows
  (`PUBLIC_EDITORIAL_SEARCH_ROWS`), alias-source rows, and dedupes on
  `read_url || url || exactId || id || title`.

## What the snapshot CANNOT confirm

1. The exact upstream route path (the proxy maps apex paths onto the wiki
   host; the wiki-side route table is not in this repo).
2. Whether the wiki engine enforces the `limit` clamp server-side (the apex
   clamps before forwarding — defense in depth, not a contract).
3. The wiki's own relevance ranking, stemming, or entity-resolution behavior.
4. Whether `hits` vs `results` is versioned, or which one is canonical.
5. Rate-limit / auth behavior of the wiki endpoint beyond the internal
   proxy header.

## Phase 0 implications

- The canonical-search work (`ren/phase0-identifiers`,
  `ren/phase0-exact-id`) treats the wiki response as **untrusted input**:
  identifiers are normalized locally, exact-ID hits must match the
  normalized identifier, and anything else is a missing-record response.
- If ChatGPT's wiki-side schema differs from the above, the row-field
  `pick()` lists and the sanitizer's private-field set are the two places
  to change.
