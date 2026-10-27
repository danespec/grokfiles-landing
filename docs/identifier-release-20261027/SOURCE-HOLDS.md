> Cache blocker resolved: after the owner purged the three wiki URLs on October 27, the canonical sitemap returned 70 URLs (initial cache status MISS), with both held IDs excluded. Wiki home and archive show the reviewed links. See source-holds-cache-purge-verified.json. Earlier cache-failure observations below are retained as history.

# Source hold follow-up — October 27, 2026

Seven source-content holds are cleared using existing NAS PDFs, extracted text and rendered-page inspection. The register now has 67 indexable dossiers and two held locators. These are existing records, not newly acquired documents; corpus counts are unchanged. Local file hashes are not fresh byte comparisons against DOJ.

EFTA00153570 and EFTA00153571 are confirmed by their printed footers as pages 2 and 3 of EFTA00153569.pdf. Their official source links now address that parent PDF and page. The other reviewed files are EFTA00035206 (rounds notice), EFTA00035715 (two-page floor plan), EFTA00579174 and EFTA00579182 (2004 wire-coordination correspondence), and EFTA00643676 (trade-report correspondence). The summaries retain the distinction between instructions and performance, correspondence and settlement, intelligence suspicions and adjudication. Redacted banking/contact fields are not reproduced.

See source-hold-review.json for page identities, local source hashes, review descriptions and limits. Exact-ID routing, source-gated sitemaps, receipt cards and OG images are updated together. EFTA00704168 and EFTA01245620 remain noindex: the current resolver has no verified source PDF for either, and an attempted official EFTA00704168 fetch returned an HTML gate rather than PDF bytes.

Cloudflare's dashboard login returned HTTP 403. No managed robots, Bot Preference Sync, crawler or AI-training protection setting was changed. The duplicate wildcard groups remain an open configuration item. The original production release acceptance in RELEASE.md describes the earlier 60/9 state; this follow-up supersedes only that source-hold count after deployment acceptance.

## Deployed acceptance

PR #217 merged as b91c8e370b2bc5da449d27210cd972762b66aaa9 and is live in Pages deployment de213e64. The wiki now runs gah-wiki-gateway:source-holds-20261027, image sha256:160b0ce89b6ebc2f4e85cb1e61eab2bd194f92f8802fa347c193e851e7fdd404. Its previous production container is retained as grok_wiki_gateway_before_source_holds_20261027; the earlier original rollback is also retained. The production compose image is updated. Preview containers are stopped.

All 69 public main dossiers and 69 reciprocal wiki cards passed status, source gates and reciprocal link checks. The seven updated main and wiki pages publish the reviewed source hashes and correct parent/page links. All six public raw parent PDFs return actual PDF bytes matching the reviewed local SHA-256 values. Browser inspection confirmed the parent viewer renders Page 1 of 3. The EFTA sitemap has 67 entries and the main sitemap 192, without overlap. API guards remain byte-identical, protected search returns 401 without a service credential, and public resolution returns 200.

**Open edge-cache issue:** the wiki origin and a fresh release-query response serve 70 sitemap URLs, but the canonical /sitemap.xml remains an old Cloudflare cache HIT with 63 URLs (Age 5504 at observation), even though the returned origin policy says no-store. The existing OAuth credential cannot purge those URLs: Cloudflare API error 10000, Authentication error. A targeted purge of the wiki sitemap, home, archive and seven changed receipts was requested; no purge succeeded. Do not describe the canonical wiki sitemap as updated at the edge. This and the duplicate managed robots groups require working Cloudflare administrative access.

The two remaining source holds are EFTA00704168 and EFTA01245620. The complete original audit is not claimed closed.
