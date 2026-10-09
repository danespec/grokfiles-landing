# GAH Unified Search Contract (Phase 0)

Version: 1.0.0 — 2026-10-09
Owner: Subagent B (Unified Search Architecture)
Governing spec: `GAH_REBUILD_APPROVED_V2.md` (Phase 0: data contracts before visual redesign)
Repo examined: `~/workspace/gah-repo`, branch `ren/production-snapshot-20261009`

## 0. Purpose

One canonical specification for how search identifies records, separates collections,
reports counts, labels confidence, and answers missing-record queries across
GrokArchiveHub. No search surface may contradict this contract.

Rule 0: **never equate indexed research records with verified downloadable files.**
Every count in this contract carries an exact meaning (see §4). Any public page that
quotes a count must use the count's defined meaning, or link to the definition.

## 1. Collections — separated, never merged

Search fans out across six collections. Results are grouped and badged per
collection. **A row from one collection is never merged into, deduplicated against,
or displayed as a row of another collection.** A `BARAK-174-001` row and an
`EFTA00559539` row that discuss the same event are different evidence and render
in different groups.

| # | Collection id | Badge (UI) | What it is | Search surface (current) | Verifiable in repo? |
|---|---|---|---|---|---|
| 1 | `efta` | EFTA record | DOJ release documents, identified by Bates number | `POST /api/search` → proxies to wiki-host "proof layer" (`_worker.js:5008`, `proxyProofLayer` → `wiki.grokarchivehub.com`, `_worker.js:3932`); `/api/document-bundle/{efta}`; `/archive/{efta}` | Partially — Worker routing yes; the corpus index itself is a live service, not in repo |
| 2 | `barak` | Barak archive | Ehud Barak 2007–2016 email-leak archive: review rows, receipts, slots | `/barak/search` (client-side index `assets/barak-data*.js`); `/barak/timeline.html`; `/barak/receipts.html` | Yes — `assets/barak-data.v298.js` (305 rows in snapshot) |
| 3 | `visual` | Visual evidence | Photo/screenshot artifacts extracted from EFTA documents | `GET /api/visual-evidence/{status,items,search,efta/{efta}}` reading `/visual-evidence-index/` (`_worker.js:2514-2663`) | Yes — `visual-evidence-index/manifest.json` + 118 EFTA shards |
| 4 | `book-of-black` | Book of Black | Birthday-book evidence ledger | `GET /api/book-of-black/{status,search,ledger,page/{n}}` (`_worker.js:8523`) | Partially — routes yes; backing data excluded |
| 5 | `editorial` | Investigation | GAH investigations, briefs, autopsies, timelines | `PUBLIC_EDITORIAL_SEARCH_ROWS` merged into `/api/search` results (`_worker.js:5090`) | Yes — HTML routes in repo |
| 6 | `research-index` | Research index | Upstream research index (wiki host) | Proxied at `/research-index` (`_worker.js:4130` → `wiki.grokarchivehub.com/research-index`) | No — live service only |

**Collection badges are mandatory on every result card.** `editorial` results must
never render with a source-record badge: today `/api/search` blends editorial rows,
alias rows, and source rows into one list (`_worker.js:5090-5100`); the contract
requires a `result_type` field on every row (`source_record` | `editorial` | `identifier_route`).

## 2. Record identifiers and normalization

### 2.1 EFTA identifiers

- **Canonical form:** `EFTA` + exactly 8 digits, uppercase. Example: `EFTA00033413`.
- **Normalization** (applied to the whole query before any other matching):
  1. Trim whitespace; uppercase.
  2. Remove internal separators: spaces, hyphens, underscores, dots
     (`EFTA-00033413`, `efta 00033413` → `EFTA00033413`).
  3. If the remaining string matches `^EFTA[0-9]{1,8}$`, left-pad the digit run to
     8 digits (`EFTA33413` → `EFTA00033413`).
  4. Reject anything else as a non-EFTA query (do not guess).
- **Gap in current code (verified):** `handlePublicSearch` uses `/^EFTA[0-9]{8}$/i`
  (`_worker.js:5073`) — hyphenated, spaced, or short-digit forms never trigger
  exact-ID pinning today. `/api/visual-evidence/efta/{efta}` uses strict
  `^EFTA[0-9]{8}$` and 400s otherwise (`_worker.js:2626`). Both must adopt §2.1.
- Digit-run assumption: DOJ Bates numbers in the corpus are 8 digits after padding.
  If a 9+ digit run ever appears, it is rejected as invalid, not truncated.

### 2.2 BARAK archive identifiers

- **Canonical form:** `BARAK-` + 3 digits + `-` + 3 digits, uppercase.
  Example: `BARAK-174-001` (verified in `assets/barak-data.v298.js` and
  `barak/entities.html:127`).
- **Normalization:**
  1. Trim; uppercase; collapse separators (space, hyphen, underscore, dot) to
     canonical hyphens: `barak174001`, `BARAK 174 001` → `BARAK-174-001`.
  2. Left-pad each digit group to 3 digits (`BARAK-174-1` → `BARAK-174-001`).
  3. Reject non-matching input.
- **Source-row IDs** (`barak-174-ehud-barak-01`) are secondary aliases. They are
  never canonical display IDs; the index must map each alias to its archive ID.
- **Gap in current code (verified):** `POST /api/search` has no BARAK- handling at
  all; Barak search is a separate client-side page. The contract requires the
  unified search to recognize BARAK- IDs and route them to the Barak collection
  (§7).

### 2.3 Visual-evidence identifiers

Visual rows carry `efta` (canonical EFTA id), `name` (filename, e.g.
`EFTA00033413_obj002.jpg`), `chunk` (e.g. `DS8_chunk_001`), and `pdf`
(e.g. `EFTA00033413.pdf`) — verified in `visual-evidence-index/efta/EFTA0003.json`.
Filenames are matched case-insensitively; the owning EFTA id is the canonical key.

### 2.4 Exact-ID matching

- After normalization, if the entire query is an identifier, that record is
  **pinned first**, before all other results, in every collection surface.
  (EFTA exact-ID pinning exists today at `_worker.js:5103-5117`; BARAK- pinning
  does not and must be added.)
- An exact-ID hit also emits an `exact_identifier_route`:
  - EFTA → `/archive/{EFTA-id}`
  - BARAK- → `/barak/emails/{BARAK-id}` (v2 viewer route; until it ships, the
    receipt route `/barak/search?receipt={source-row-id}` — the route must be
    resolved, not assumed; see §7).
- **Never synthesize a route.** The current code fabricates an "Exact archive
  identifier route" row for *any* 8-digit input (`_worker.js:5103`). The contract
  requires the route to be verified against the manifest: if no dossier/page
  exists for the ID, emit the missing-record response (§7), not a link.

### 2.5 Default sort

Exact-ID pin first. Remaining results: **date descending** (newest first); records
with no usable date sort last, explicitly flagged `date_unknown: true`. A UI
toggle for ascending order is permitted. Editorial results sort after source
records within the same query unless the query is clearly navigational.

## 3. Search-result schema

Every result row carries these fields, in this display order
(per the v2 brief card spec):

1. `collection` — collection id (§1)
2. `collection_badge` — display badge text
3. `result_type` — `source_record` | `editorial` | `identifier_route` | `missing_record`
4. `identifier` — canonical identifier (EFTA / BARAK- / visual name / page route)
5. `identifier_aliases` — other known ids for the same record (e.g. Barak source-row id)
6. `date` — ISO date string; `date_unknown: true` when absent
7. `parties` — from / to / entities (emails); null for non-correspondence
8. `subject` — subject line or title (subject-as-title for email cards)
9. `snippet` — matching text with the query highlighted; never generated prose
10. `confidence` — confidence label (§6); required on every source record
11. `file_links` — direct open/download links (§5)
12. `provenance` — provenance block (§5)
13. `what_it_shows` — one line: what the record directly establishes
14. `what_it_does_not_prove` — one line: what it does not establish
    (Barak data already carries these as `claim` and `silence` fields —
    verified in `assets/barak-data-027.js`)

Response envelope for any search:

```json
{
  "schema": "gah.unified-search.v1",
  "query": "EFTA00033413",
  "normalized_query": "EFTA00033413",
  "searched_collections": ["efta", "barak", "visual", "book-of-black", "editorial"],
  "per_collection_counts": {"efta": 1, "barak": 0, "visual": 12, "book-of-black": 0, "editorial": 2},
  "exact_id": {"collection": "efta", "identifier": "EFTA00033413"},
  "results": [ ... ],
  "missing": [ ... ]
}
```

The result header must state which collections were searched and how many hits
came from each — never a bare total.

## 4. Counts — exact meanings

| Count key | Value (snapshot) | Exact meaning | Status |
|---|---|---|---|
| `curated_files` | 3,628 | Files checked in under `evidence-data/**` in the repo snapshot (repository-derived; `frontdoor/archive-status.json` → `generatedFrom`) | Verified in repo. **This is the one public archive-file count.** |
| `indexed_research_records` | ~1.38M (operator corpus) | Rows in the operator's offline DOJ OCR/index corpus. These are index rows, not individually downloadable files, not individually verified | NOT verifiable in repo. Label must always say "indexed research records", never "files" or "documents available". Requires live verification |
| `searchable_documents` | 670,469 (unattributed) | Unknown — figure appears in planning material with no in-repo source | **Blocked.** Confirm provenance or remove from all public surfaces |
| `visual_evidence_items` | 76,060 | `served_items` in `visual-evidence-index/manifest.json` (generated 2026-10-07) | Verified in repo. Replaces the 76,948 figure |
| `visual_manifest_rows` | 76,948 | `manifest_rows` = 76,060 served + 888 `duplicate_rows_skipped` | Verified in repo. Must never be quoted as the item count |
| `barak_portal_rows` | 305 | Review rows in `assets/barak-data.v298.js` snapshot | Verified in repo. Relationship to 19 / 5,587 / 5,505 is Subagent C's reconciliation — do not publish derived counts |
| `book_of_black_pages` | 1,639 | `evidence-data/book-of-black/source-manifest.json` via `frontdoor/archive-status.json` | Verified in repo |
| `birthday_book_pages` | 238 | `evidence-data/birthday-book/manifest.json` via `frontdoor/archive-status.json` | Verified in repo |

Rule: a public page may quote `curated_files` alone. Any other count must appear
with its meaning label. **76,060, not 76,948**, is the visual-evidence count.

## 5. Provenance fields

### 5.1 EFTA record card (required fields)

`identifier` (canonical), `collection: "efta"`, `data_set` (DOJ release set number),
`date` (+ `date_unknown` flag), `record_type` (email / pdf / image / log),
`subject`, `snippet` (query highlighted), `confidence` (§6), `what_it_shows`,
`what_it_does_not_prove`, and file links:
`document_bundle_url` (`/api/document-bundle/{efta}`), `archive_url`
(`/archive/{efta}`), `doj_library_url` (when the file is still on the DOJ
endpoint), `checksum_sha256` / `file_size` when available, `visual_evidence`
(`{available, count, url}` — join already implemented at
`_worker.js:5124-5143`), plus `source_lane` naming the acquisition lane.

### 5.2 Barak record card (required fields)

`identifier` (canonical `BARAK-XXX-XXX`), `source_row_id` (alias),
`collection: "barak"`, `date`, `parties` (from / to / cc), `subject`,
body excerpt (`snippet`), `attachment_status`: `recovered` (with open/download)
or `open_slot` (parent missing — never imply recovery), `confidence` (§6),
viewer link (`/barak/emails/{id}` when built; current receipt route until then),
`what_it_shows`, `what_it_does_not_prove`, acquisition note, recovery method,
parent-PDF hash when available. EFTA mentions render as separate rows, never
merged into the Barak row (§1).

**Data findings in the snapshot** (verified 2026-10-09, `assets/barak-data.v298.js`,
305 rows): 14 receipt rows are filed under EFTA archiveIds (e.g.
`barak-rcpt-efta00559539` → `EFTA00559539`) — these are Barak-portal rows *about*
a DOJ document (cross-collection references) and must render as Barak rows with
an EFTA link, never as EFTA rows. 258 rows lack `dateSort` → render with
`date_unknown: true`. 275 rows use non-canonical archiveId forms
(e.g. `BARAK-171-SLOT-001`) — normalization debt for the alias map.
1 row (`barak-rcpt-pvt-20150907-001`) has an empty `silence` field: cards with an
empty `what_it_does_not_prove` must render the default silence statement —
"This card does not establish purpose, attendance beyond the text, relationship,
legal meaning, or conduct." — never an empty slot.

### 5.3 Visual evidence card (required fields)

`thumbnail_url`, `image_url`, `efta`, `name`, `chunk`, `pdf`, `class`
(all present in the manifest — verified `visual-evidence-index/efta/EFTA0003.json`),
`archive_url`, `collection: "visual"`. Note: the manifest carries **no date and
no redaction flag** — the v1 brief's "date if known, redaction flag" is
aspirational; cards must not display fields the index does not carry.

### 5.4 Editorial card (required fields)

`title`, `route`, `page_type` (investigation / brief / autopsy / timeline /
open-question), `date`, `collection: "editorial"`, `result_type: "editorial"`,
snippet. Must be visually distinct from source-record cards.

## 6. Confidence labels — definitions

Confidence labels describe **transcription, identification, or provenance quality
of the record** — never confidence that an allegation is true. The existing Barak
portal labels (13 distinct values verified across `assets/barak-data*.js`) are
adopted with the following public definitions. Any new label must be defined here
before it ships.

**Level prefixes** (quality tier):
- `HIGH_` — the record's text/identity/provenance is directly verified
- `MEDIUM_HIGH_` — minor qualification (partial text, appearance-only, etc.)
- `MEDIUM_` — usable with a stated limitation
- `MEDIUM_LOW_` — usable only after a stated check
- `LOW_` — excluded from findings use
- `OPEN_` — placeholder for material not yet recovered

**Quality suffixes** (what the tier applies to):
- `_SOURCE_ROW_CLEAR` — the source row was fully legible and parsed without loss
- `_SOURCE_DOCUMENT_BOUND` — the row is bound to an identified source document
- `_TEXT_APPEARANCE_ONLY` / `_APPEARANCE_ONLY` / `_FOR_APPEARANCE_ONLY` — the text
  appears in this context; no claim is made about provenance beyond appearance
- `_FOR_ROUTING_CONTEXT` — the row's value is as routing/context metadata only
- `_TRUNCATED_BUT_USABLE` — partial text recovered; usable with the truncation noted
- `_PARENT_MIRROR_PARTIAL` — the parent message is only partially mirrored
- `_UNTIL_VISUAL_CHECK` — accepted pending visual verification of the source
- `_CONFIDENCE_EXCLUSION` — excluded from findings use (low quality)
- `_TRANSCRIPT_SLOT` — placeholder for missing material; not a record

Defined labels:

| Label | Public definition |
|---|---|
| `HIGH_SOURCE_ROW_CLEAR` | Source row fully legible; parsed without loss |
| `HIGH_SOURCE_DOCUMENT_BOUND` | Row bound to an identified source document |
| `HIGH_FOR_APPEARANCE_ONLY` | Text verified as appearing in this context; provenance not asserted beyond appearance |
| `HIGH_FOR_ROUTING_CONTEXT` | Reliable as routing/context metadata only |
| `MEDIUM_HIGH_SOURCE_ROW_CLEAR` | Source row clear with minor qualification (see card note) |
| `MEDIUM_HIGH_FOR_APPEARANCE_ONLY` | Text appears in this context; provenance not asserted beyond appearance |
| `MEDIUM_HIGH_FOR_TEXT_APPEARANCE_ONLY` | Same as above, text-specific |
| `MEDIUM_FOR_ROUTING_CONTEXT` | Usable as routing/context metadata with stated limitation |
| `MEDIUM_PARENT_MIRROR_PARTIAL` | Parent message only partially mirrored; gaps disclosed |
| `MEDIUM_TRUNCATED_BUT_USABLE` | Partial text recovered; truncation disclosed; usable |
| `MEDIUM_LOW_UNTIL_VISUAL_CHECK` | Usable only after visual verification of the source |
| `LOW_CONFIDENCE_EXCLUSION` | Excluded from findings use; retained for audit |
| `OPEN_TRANSCRIPT_SLOT` | Placeholder for material not yet recovered; not a record |

A label that could be read as "we are confident the allegation is true" is a
contract violation. When in doubt, the card must carry the definition inline.

## 7. Missing-record responses

Exact-ID queries must never return an empty state without explanation. The
response is a `missing_record` result row, never silence.

| Case | Required response |
|---|---|
| `BARAK-` id searched in the EFTA index (or in unified search) | `"BARAK-174-001 is not an EFTA record — it belongs to the Barak email archive."` + Barak viewer link + `collection_hint: "barak"` |
| EFTA id searched in the Barak index | `"EFTA00033413 is not a Barak archive record — it is a DOJ release document."` + `/archive/{id}` link + `collection_hint: "efta"` |
| EFTA id with no record anywhere | `"No EFTA record EFTA00033413 in the public index."` + note that the DOJ release may hold material not yet indexed + acquisition-gap disclosure |
| BARAK- id with no record | `"No Barak archive record BARAK-174-999. The archive's recovered parents and open slots are listed on /barak."` |
| Malformed identifier | Parse guidance: the canonical forms from §2, with an example |
| Visual search for unknown EFTA id | 404 payload keeps `archive_url` (current behavior, `_worker.js:2626`) — plus the EFTA missing-record text above |

Cross-collection empty states are part of the response envelope (`missing` array,
§3), so a `BARAK-` query against the EFTA index returns the explanation row,
not zero rows.

## 8. What this contract does not cover (explicitly out of scope)

- The Barak 19 / 5,587 / 5,505 reconciliation → Subagent C (`GAH_BARAK_RECONCILIATION.md`)
- Document-level audit-trail schema (hashes, source URLs, corrections) → Subagent D
- Compatibility of existing AI/MCP/commerce surfaces → Subagent E
- Performance budgets, mobile UX, broken-link auditing → Subagent F
- Full Worker architecture and routing map → Subagent A
- The live `/api/search` corpus index (wiki-host proof layer) and `/research-index`
  are not in the repo snapshot; their schemas must be verified against the live
  services before the manifest is finalized.

## 9. Critical gaps found in-repo

1. **No ID normalization on any search surface** (§2.1, §2.2): hyphenated, spaced,
   or short-digit EFTA forms never pin today; `/api/visual-evidence/efta/` 400s
   them outright.
2. **Fabricated exact-identifier routes**: any 8-digit input gets an
   `/archive/{id}` route row whether or not a dossier exists (`_worker.js:5103`).
3. **Editorial rows merged into source results** without a result-type badge
   (`_worker.js:5090`).
4. **No BARAK- recognition in unified search**; Barak is a separate client-side page.
5. **Public count risk**: 76,948 quoted where 76,060 is correct (§4); 670,469 has
   no in-repo source at all.
6. **Visual cards lack date/redaction metadata** — the index simply doesn't carry
   them; do not design cards that require them.
7. **Confidence labels undocumented publicly** — 13 labels exist with no public
   definitions; §6 fixes this.
8. **`search.html:81`** still shows "Search ready." as the only status —
   contract requires suggested chips and per-collection headers.

## 10. Blockers needing ChatGPT or Thomas

- **ChatGPT**: the live `/api/search` proof-layer corpus schema (wiki host) —
  fields, sort behavior, and whether it can return per-collection counts; needed
  to finalize the response envelope (§3).
- **ChatGPT**: whether `/archive/{efta}` resolves for arbitrary IDs (to implement
  the verified-route rule in §2.4) and the DOJ library URL pattern for live-file
  checks (§5.1).
- **ChatGPT**: provenance of the 670,469 "searchable documents" figure — confirm
  or authorize removal (§4).
- **ChatGPT**: the `research-index` upstream schema (wiki host) for collection 6.
- **Thomas**: decision on default sort direction for non-exact results
  (contract proposes date-descending; confirm).
- **Thomas**: approval to change the public visual-evidence count from 76,948 to
  76,060 (reconciled, §4).
