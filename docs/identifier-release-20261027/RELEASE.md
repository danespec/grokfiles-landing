# Repair the identifier back door

Promoted EFTA identifiers can currently land on missing archive pages or generic OCR records. This patch supplies 30 dossier pages from existing published source reviews, serves all 69 local dossier pages through one register, and repairs story-to-dossier and dossier-to-receipt links. Existing record-specific analysis, hashes, source footers and evidentiary limits are retained.

## Review state

Prepared on the exact current `main` baseline `2b0a4a43f39dd283d6a028afa945e44dcbd8d039`. No production deployment, wiki cutover, Cloudflare setting change, merge, social post or caption change has occurred.

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
