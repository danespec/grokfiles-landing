# Follow-up to the third independent review

The third independent review confirmed 19 of 23 defects closed with no regressions. Implementation is deployed in Pages `f91ebfe1` and the wiki image recorded in `final-polish-wiki.json`. Public acceptance and the remaining cache failures are recorded in `final-polish-acceptance.json`.

- Five legacy dossier shells now use the same document navigation, main class and compact footer as the other 64. Source tables, renders, provenance, limits and original hashes are retained.
- Three abbreviated titles are replaced with source-supported descriptions: the August 8 attorney-log entry, MCC camera-file/time-window list, and late-July watch/observation status rows. Registry, dossier metadata, receipt metadata, lists and three social cards agree.
- Remaining public operational copy is removed from topics, investigations, New Mexico source notes, two evidence guides and two dossier/receipt summaries. Machine noindex/ad policy metadata remains intact.
- The share-card fallback now covers generic card-pinboard and hero-desk images as well as the old Hold the Letter hero; existing route-specific cards supply the replacements.
- Four missing identifier links in media companions outside main are explicit links. The Barak entity page places its existing H1 before its first H3.
- Wiki topics redirects to the canonical main topics guide rather than maintaining a second stale copy.

New regression checks cover all five shells, the four outside-main links and the two remaining generic image classes. Existing source, receipt, script and editorial policy gates pass; full local rendered checks cover 334 pages. Exact public acceptance will be added after deployment.

Physical robots wildcard consolidation remains unimplemented. The owner’s screenshot confirms Search=Allow, Agent=Allow, Training=Disallow and Bot Preference Sync=On. Those settings are retained. Matching groups merge under RFC 9309; this is an explicit formatting exception, not a claim that the groups were consolidated.

The independent report describes 83 official PDFs on the contact-book guide. This release does not adopt that count: the guide retains 80 known official locations and three explicitly unconfirmed exact IDs. No source locations are invented.

## Public acceptance

The fresh canonical crawl captured 338 routes and checked 334 HTML pages, 138 identifier targets, 261 share images and 15 redirect probes. No broken/noindex identifier targets, failed images, generic pinboard/desk images, legacy shells or missing published-ID links across full bodies remain. All five shells have a compact outer footer and no embedded footer; the source page/footer label is retained exactly.

Four public wiki receipt cards still return cached pre-release content: EFTA00035147, EFTA00039416, EFTA00039660 and EFTA02858491. The isolated and production-origin checks pass for the revised titles and wording. Public cache HIT failures are retained, not waived. Cache purge remains an owner action because existing credentials cannot purge the zone.

The NAS Docker builder reported missing cached layers. No pruning or daemon restart was performed. The release uses a flattened export of the live filesystem with only reviewed application files replaced, imports that immutable image, clones the live runtime configuration and mounts, and preserves the old container for rollback. All three security/auth/rate-limit guard hashes match the previous production release.
