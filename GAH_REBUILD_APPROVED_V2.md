# GAH rebuild — approved build brief v2

Date: 2026-10-09
Status: **APPROVED DIRECTION** — Thomas, 2026-10-09. His rating of the v1 brief: 8.5/10.
Lineage: SuperGrok's improvement plan → Ren's review and corrections → Thomas's adjudication (below). This v2 is the authoritative brief; v1 is superseded.

## Design thesis

GAH's competitive advantage is not publishing more Epstein material than everyone else. It is that **anyone can trace an important claim back to the precise document that supports — or contradicts — it.** Every decision below serves traceability.

## Non-negotiables

1. **Public evidence stays public.** No paywall on source files, ever. The $5.99 All Access membership monetizes additional research services and conveniences — not underlying public evidence.
2. **Compatibility.** The rebuild preserves working interfaces: the AI/MCP research interfaces (Agentmap, MCP server card, A2A agent card, public OpenAPI, skills index), the commerce infrastructure, the Patreon member portal, and the PayPal integration work. Improving public search must not break features already built.
3. **Phase 5 prohibitions stand**: no generated answer layer on search, no co-occurrence network graphs, no inflated index claims, no membership wall in front of files, no topic pages for OCR debris.

## Phase 0 — Data contracts before visual redesign (Thomas's order change)

No search cards get built until the contracts exist. Attractive cards that later need rework are the failure mode.

- **Single authoritative search manifest.** One source of truth for canonical counts, searchable collections, record identifiers, provenance fields, and source availability. No two search surfaces may report contradictory counts or record availability.
- **Confidence-label definitions.** A confidence label describes transcription, identification, or provenance quality — never confidence in an allegation. Definitions are written down and public before labels ship.
- **Document-level audit trail.** Preserve original identifiers, hashes, source URLs, corrections, and change history per document.

## Barak numerical reconciliation (required before public UI)

The figures 19 (recovered parent messages), 5,587 (attachment slots), and 5,505 (metadata-only placeholders) describe different categories. Their relationships need formal reconciliation before they appear in any public interface. **Do not assume the numerical difference represents recovered attachments without evidence.** The reconciliation is a Phase 0 deliverable; the provenance block renders only reconciled numbers.

## Build order (Thomas's revised sequence)

1. **Establish the search contract.** Verify canonical counts, searchable collections, record identifiers, provenance fields, source availability. Deliverables: the manifest, the confidence-label definitions, the audit-trail schema, the Barak reconciliation.
2. **Rebuild homepage search and result cards.** Exact-ID lookup, cross-index search, filters (collection, record type, year, has-attachment), matching snippets with query highlighted, direct file access. Search is the first action on the homepage; the featured dispatch stays directly below.
3. **Build the Barak email viewer.** The 19 recovered parent messages, thread relationships, attachments, missing-record disclosures, independent EFTA references kept separate. Two tables, never merged collections.
4. **Integrate photo and media search.** Confirm the claimed visual-artifact inventory before displaying its count. Files host queryable from the same search box, or the claim is removed from public pages.
5. **Expand structured investigations.** Person tables (table first, essay optional below), money pages on the Indyke template, open-question pages with status and last-checked date, citation-level correction links.
6. **Deploy, validate, and distribute.** Sitewide mobile and search testing, provenance auditing, reporter outreach, measurable traffic monitoring.

## Acceptance criteria

**Functional** (must all pass):
- Homepage search for a verified EFTA id returns the card with subject-as-title and an open-file link.
- Homepage search for a `BARAK-` id never returns an empty EFTA state (cross-index empty state fires).
- `/barak/emails` states reconciled parent/slot/placeholder counts and opens each recovered parent.
- Files host search returns a photo or media hit with a thumbnail — or the visual-artifact claim is gone from public pages.
- A person page is a table first.
- Public pages quote one file count.
- All pre-existing interfaces still work: AI/MCP endpoints, Patreon portal, commerce/PayPal flows.

**Measurable** (Thomas's addition — a functioning interface is not automatically a trustworthy system):
- Accuracy: sampled search results checked against source documents; identifier/hit correctness rate.
- Speed: search performance budget defined and met across collections — responsive without expensive full-page loads.
- Broken links: file-open links audited; dead-link rate near zero.
- Mobile usability: mobile-first testing; a large share of visitors arrive via mobile links.
- Indexing: sitemap/canonical discipline maintained through the rebuild.
- Citability: an outside researcher can cite a record from a GAH page and land on the precise document.

## Distribution pairing (each phase ships with a distribution move)

- Phase 2 (searchable homepage) → "now searchable" note to the Tier S reporter list; outreach kit updated.
- Phase 3 (Barak viewer) → the EpsteinWiki collaboration artifact.
- Phase 5 (structured investigations) → each new table ships with a news-peg dispatch, never a silent publish.
- Standing: no Reddit until the appeal resolves; the reporter-outreach kit is the lane.
- Outcomes recorded per release: reporter referrals, backlinks, organic search traffic, document opens.

## Shipping policy

Do not wait for a giant redesign. Once the new search and the Barak viewer pass validation (functional + measurable), they ship as public improvements with an accompanying dispatch and outreach package.
