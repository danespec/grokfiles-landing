# GAH-EDITORIAL-042 — Public attribution/source-link QA

Audit performed 2026-10-13. Scope: 14 already-published pages, including ten investigations, two document autopsies and two official-source guides. No raw private correspondence or image source data in this report.

The read-only HTTP link sample checked 63 distinct cited and source-oriented public URLs. 59 returned HTTP 200; four FBI Vault Part 12/13 URLs returned HTTP 403 from the authorized Mac, consistent with source-watch provider access restrictions. No tested URL returned 404, 410, or a 5xx status. HTTP 403 is not evidence that a cited document has been deleted and requires a differently authorized provenance check. This is a sample, not a complete sitewide citation or substantive authenticity certification.

Both the FBI Vault Parts 12–13 investigation and DOJ redacted contact-book guide already carried organizational authors and publication dates in Article/JSON-LD structured metadata but lacked clearly visible main-article authorship. This release adds a narrowly scoped visible publisher byline and the existing date to each, without changing the document's sourced claims or underlying files. The automated test checks date alignment, one visible attribution, original title/context and source links.

The Barak receipts methodological article links to GAH's source-map and receipts readers instead of an external official URL; it does not make a new claim that an unverified original email is authenticated. Its public treatment and indexability were left unchanged.

Remaining owner-dependent quality decisions: manual image gallery privacy and copyright review; sensitive source editorial/legal review and corrections; Google AdSense account/site status and CMP/consent confirmation. Ads remain disabled, raw Barak and /photos browsers ad-excluded; /photos remains index,follow. GSC Wizard intermittent external-crawler 403 is a separate access question and should not be fixed by a WAF blanket allow rule.

Delivery: exactly two approved static HTML pages changed, plus one regression and release documentation. Local 42/42 regression complete. Independent PR/post-merge CI, owner-only staging redirects and live HTTP/DOM checks required before release closure.
