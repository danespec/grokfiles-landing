> Final owner purge verified: all 69 canonical wiki cards are current and the canonical wiki sitemap has 72 URLs. No remaining source-content holds in the 69-dossier cohort. See FINAL-HOLDS.md and final-holds-production-verification.json for final scope and measured acceptance.

> Latest source review: all 69 dossiers in this cohort are indexable; the final two use explicitly labelled reviewed mirror copies. Repeated robots wildcard groups were verified as valid, with merged crawl-policy checks passing on both hosts. See FINAL-HOLDS.md for scope and evidence. Earlier counts and the prior robots blocker below are historical.

> Follow-up: seven source holds were reviewed and released in PR #217 / Pages de213e64. Current register: 67 indexable dossiers, two holds. See SOURCE-HOLDS.md for current acceptance and the resolved wiki-sitemap cache issue. The 60/9 acceptance below is historical.

# Production acceptance — October 27, 2026

PR #215 was merged and released to Pages deployment `3c001c46` from merge commit `3ab22ebf541522631b3fd7c53d4e5c6a27e2f09c`. The wiki companion was also deployed persistently, with the original container and a fresh full-filesystem image snapshot retained for rollback.

Public acceptance passed for all **69 main dossier pages and 69 reciprocal wiki receipt cards**, with **60 indexable dossiers and nine retained source holds**. Main sitemap: 192 URLs; EFTA sitemap: 60 URLs; wiki sitemap: 63 URLs; no overlap between main and EFTA sitemaps. Identifier case/padding redirects pass on both hosts. Per-ID PNG share images return 200. The Musk page no longer publishes raw plist/OCR. Live browser inspection confirmed the corrected single dossier navigation and a working main-to-wiki receipt link.

The isolated gateway passed 78 checks before cutover. Its original environment, readonly source mounts, host mappings, port binding, restart policy, service-authentication guard, security guard and rate-limit guard were preserved. Public document resolution returns 200 and protected API requests without a service token return 401. Temporary preview containers are stopped after acceptance; the original gateway rollback container remains retained.

**Still open:** Cloudflare's managed robots injection leaves two wildcard groups. The available Wrangler OAuth credential has zone read access but no Bot Management edit scope. No crawler/training protection was weakened to remove the duplicate. Nine original-source holds remain noindex, and the audit's unenumerated 29-ID promotional cohort has not been certified beyond the identifiers present in the checked-out source and media register. External social captions were not edited. The entire 23-item audit is not claimed closed.

See `production-verification.json` and `wiki-production-release.json` for measured results. The preparation record below describes the state before rollout and is retained as history.

---

# Repair the identifier back door

Promoted EFTA identifiers can currently land on missing archive pages or generic OCR records. This patch supplies 30 dossier pages from existing published source reviews, serves all 69 local dossier pages through one register, and repairs story-to-dossier and dossier-to-receipt links. Existing record-specific analysis, hashes, source footers and evidentiary limits are retained.

## Review state

Prepared on the exact current `main` baseline `2b0a4a43f39dd283d6a028afa945e44dcbd8d039`. At that initial preparation point, no production deployment, wiki cutover, Cloudflare setting change, merge, social post or caption change had occurred.

An initial private Pages preview was built successfully as `2917a29d`. It predates the final stylesheet, neighbour navigation and release checks. A final-source preview was subsequently built successfully as `0429e25d`; it includes the common dossier stylesheet and nearby navigation. Browser inspection was blocked by automatic approval review at `https://grokfiles.cloudflareaccess.com`; the gate was not bypassed. Owner authorization for that sign-in is required to finish visual review.

## Scope and source gates

- Main owns canonical `/archive/EFTA########`; case, padding and `.html` aliases redirect in one hop. `/wiki` and the retired command route redirect directly to the wiki home.
- The wiki companion module gives its homepage, receipt archive, research index and receipt cards self-canonicals and a populated sitemap. Direct wiki identifier routes redirect to main. Methodology has one owner on main. The research-index route on main redirects to wiki.
- The register contains **69 dossiers: 60 indexable and 9 still withheld**. Do not count any of them as newly acquired source documents or inflate the research/proof corpus counts.
- EFTA00035828 is cleared on the basis of the existing October 26 visual review plus a fresh one-page mirror capture. Its SHA-256 is `33d8e9ed15a5463ce35044dfcdc8fe5ef06a674862b6e2bbf223d500ddd3dbe4`. This fingerprints the mirror only; no fresh byte comparison with DOJ is claimed.
- The remaining source holds are EFTA00035206, EFTA00035715, EFTA00153570, EFTA00153571, EFTA00579174, EFTA00579182, EFTA00643676, EFTA00704168 and EFTA01245620. These remain available with noindex. Editorial links to unready targets become an identifier, source access and a pending label.
- No raw OCR is emitted by the fallback locator renderer. Dedicated source-viewer and search behavior is preserved.
- All source pages have a full-ID title/H1, common stylesheet, explicit receipt and limits, primary-source link, typed Article data, unique share card and reciprocal wiki link. Existing source-specific page/footer precision is preserved.
- Stories receive identifier citation blocks; dossiers receive story backlinks and nearby *published* dossier links within the same dataset. The nearby list is explicitly incomplete and does not invent missing consecutive Bates documents.
- The dedicated EFTA sitemap and main sitemap have no overlapping identifier entries. The old archive sitemap endpoint remains a compatibility alias with identical content. Main robots advertises the sitemap index.

## Validation

Passed: all 69 dossier routes and corresponding response/meta robots gates; 60-entry EFTA sitemap; disjoint main sitemap; identifier alias redirects; 69 wiki receipt contracts and reciprocal links; main/wikilink ownership; 714 internal identifier links; every EFTA-bearing editorial slug in the checked-out source; per-ID image existence; JSON-LD identity; collection H1 order; source-locator OCR exclusion; literal financial/share titles; browser-script restoration and parsing; metadata parsing; service-token isolation/CORS; 37 exact-ID policy checks; 9 entrypoint/staging checks; local asset validation.

New GitHub workflow enforces the identifier link, routing and wiki contract checks. These tests do not substitute for authenticated preview review and post-deployment checks.

## Remaining acceptance items

1. Authenticate to the protected final preview and inspect desktop/mobile layout, source access, OG cards and representative pages before production rollout.
2. Deploy the wiki companion from the **current running gateway filesystem**, preserving all existing authentication, rate limits, environment, networks, readonly source mounts and later content fixes. Do not rebuild from an old image tag alone: the current container has later repairs. `apply-server-hook.py` fails unless the captured server hash matches the reviewed baseline and inserts the hook after both existing guards.
3. The live duplicate wildcard robots groups are partly injected by Cloudflare Managed Robots. No Cloudflare setting was changed. Reconcile that configuration only while preserving existing crawler/training policies; the origin output alone cannot remove Cloudflare's injected group.
4. The audit's 29 slug-promoted cohort is not enumerated in full. The current source checkout contains 23 distinct IDs in editorial filenames; all pass. All EFTA IDs in the current published media register have dossier pages, but four supporting media IDs retain explicit source holds. External social captions were not changed or independently re-crawled.
5. Recheck production after both releases. Do not call the entire 23-item audit closed until the live checklist passes.

## Rollback baseline

Current Pages production: `165a9574-3d04-471f-9ce9-fa2316ea8925`, source `2b0a4a4`.

Wiki source SHA-256: `9b45d64fa970a1ced1d8675e1b4149456bee24793ae7c3286649585bfd666672`.
Wiki running image ID: `sha256:d2c692583a184adaa3124ada84dd1c3139fd2b9c27e68d30a2f278c8aa4f116d`.
Service-auth guard: `404fef12760b796d3b24598d493a137fc9d40c3b914002b7921a8389f7ca55a3`.
Request-limit guard: `aae9229eef738d5f761e038db60d83f8b7b101ea355488c145f85ae7c6bf2db5`.
Security guard: `f9c8de2218d188299576a864a4a78483dd27fc2ddcbd91e8f76a36f8e099b371`.

Retain the existing gateway container and a fresh full filesystem snapshot through acceptance. Roll back Pages to the recorded deployment and restore the retained original gateway if release checks fail.
