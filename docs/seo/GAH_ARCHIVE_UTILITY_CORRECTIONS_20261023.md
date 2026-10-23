# Automatic archive record corrections — October 23, 2026

The Search Console report dated October 15 lists 4,712 soft 404s across the domain. The ten displayed examples were wiki archive records last crawled July 6–7. On October 23, four had no displayed OCR, four had 228–762 characters, and two had 1,275–1,319 characters. These observations do not establish the pages' exact July contents or the reason for AdSense disapproval.

## Correction

The automatic archive template now presents a concise source-access record: artifact details, available PDF/OCR links, extracted text when present, identifiers actually mentioned in OCR, and a short limitations/corrections section. Repeated generic chronology, significance, counterevidence, confidence and unfilled editorial instructions were removed. No new factual claims about people were added.

Automatic records consistently emit `noindex,follow` in HTML and HTTP headers and remain ad-excluded regardless of OCR length. Their structured data is `WebPage`, and file modification times are no longer presented as article publication/revision dates. Empty OCR states no longer offer an excerpt link. Dynamic HTML uses the existing explicit browser/CDN no-cache response helper.

Reviewed static dossiers, public source access, the missing-record 404 handler, and sitemap membership are unchanged. This release does not claim that every soft-404 classification will disappear; intentionally excluded records can remain excluded.

## Deployment and preservation

The live container's `server.js` differed from the stored source. The patch was applied independently to each baseline, preserving their unrelated differences and the runtime security fixes. SHA guards checked the live and stored baselines before installation.

| File | Before SHA-256 | After SHA-256 |
| --- | --- | --- |
| Runtime server | `343e78f8d1467c15d896727c6f20bbd16bfea74e829dc652f325c0221d4e7025` | `9b45d64fa970a1ced1d8675e1b4149456bee24793ae7c3286649585bfd666672` |
| Stored source | `a4d27b8765b63cd44e9412287b6ce5d846d12b9cd6a71c7bcd874bc756501819` | `57c7e2acbfc89519cbc2208ab6095e039af5d8eadd99a1413d130422fb662d00` |

The corrected image is `gah-wiki-gateway-secure:archive-utility-20261023` (image prefix `13109514fe2d`). It is based on the exact previous image and includes the current runtime's changed public assets, preserving those earlier fixes. The configured image tag also points to this corrected image. The previous image remains tagged `gah-wiki-gateway-secure:before-archive-utility-20261023`.

Backups and build inputs are retained on the NAS under `/volume1/docker/grok_wiki_gateway/repairs/archive-utility-20261023/`; the original runtime server backup is `/volume1/docker/grok_wiki_gateway/repairs/server.runtime-before-quality-20261023.js`. Runtime and stored-source backups are distinct and must not be interchanged.

To roll back, copy that runtime backup into the container's `/app/server.js`, restore `server.host-before.js` to the stored `app/server.js`, syntax-check and restart the existing container. Restore the configured image tag from the `before-archive-utility-20261023` image. Do not replace the stored source with the runtime backup: they intentionally preserve different baselines.

## Checks and remaining cache work

Renderer checks cover absent, short and longer OCR, HTML escaping, source access, related identifiers, noindex/ad exclusion and truthful schema. The built image passes Node syntax checking.

`tests/test_archive_utility_20261023.mjs SERVER_PATH` checks a staged server without starting it. `scripts/maintenance/verify_archive_utility_20261023.py` checks ten records on each host, five reviewed indexable controls and an invented ID that must return 404. Its `--fresh` option checks a separate cache key; it is not a substitute for testing the ordinary URLs.

The main-domain sample URLs serve the correction. Direct wiki ordinary URLs were still serving old cached HTML (Cloudflare HIT with age 816 seconds) while a fresh cache key served the corrected template. Existing configured credentials previously lacked cache-purge permission; no permission bypass was attempted. The remaining operational step is an authorized purge of the old wiki archive cache and review of any cache rule overriding origin no-store directives. Explicit CDN no-cache headers protect new origin responses, but do not retroactively evict old objects.

This release does not submit a new AdSense review or claim approval. Google controls subsequent crawling, indexing and advertising eligibility.
