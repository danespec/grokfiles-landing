# Final source holds and robots validation — October 27, 2026

The two remaining identifier locators now have bounded source reviews. The register contains 69 indexable dossiers and no unresolved content holds in this cohort. This does not certify all original audit findings, verify external social captions, or increase the corpus size.

EFTA00704168 is a three-page email chain captured from the Roll Call mirror. SHA-256 1bd46551b890e412968f20a6f7f4289174cf84def36a01d4c969ffe1e0ed89c5 matches the existing Gratitude America source manifest. The first rendered page and full extracted chain were checked. The summary distinguishes stated unrealized appreciation from a realized profit or withdrawal. EFTA01245620 is a nine-page FD-302 report captured from the GetKino mirror, SHA-256 2cfb18e22aa4920de1b8d65e950d2872f4f1aeea59fc071aef950ad1cec3bcc4. Rendered headers and footers confirm serial 216, file 31E-NY-3027571, the July 24, 2019 interview date and EFTA01245620–EFTA01245628. Its public summary is limited to source identity and reading limits; protected-source identities, personal information and interview narratives are not reproduced. No fresh byte comparison with DOJ is claimed for either mirror. These copies are linked as secondary access copies, not imported into the source corpus or presented as new independently authenticated originals.

## Corrected robots assessment

The earlier description of repeated wildcard groups as an unresolved crawling defect was too strong. RFC 9309 section 2.2.1 requires matching groups to be combined, and Google's robots specification confirms the same behavior. Cloudflare intentionally prepends its managed group to an existing origin file. Repeated wildcard groups alone are valid and do not require disabling Bot Preference Sync.

The live merged policy was parsed with Protego 0.7.0 on both hosts. For each host, all 71 tested public paths (home, archive and 69 identifier routes) are allowed to Googlebot, bingbot and an unknown crawler. The API/viewer exclusions remain effective. Every explicitly listed training/other bot is blocked at the robots layer, and the ai-train=no signal is present. This tests crawler directives, not enforcement of Cloudflare WAF rules. No Cloudflare security, crawler or training setting was changed. See robots-policy-verification.json. The two textual wildcard groups remain intentionally present; the functional policy check passes.

References: https://www.rfc-editor.org/rfc/rfc9309.html#section-2.2.1 ; https://developers.google.com/crawling/docs/robots-txt/robots-txt-spec ; https://developers.cloudflare.com/bots/additional-configurations/managed-robots-txt/

## Deployed acceptance and final edge-cache gate

PR #220 merged as 552528990862b264432c5789ab756ae4c602b6ac; main is live in Pages ae16ff05. The wiki persistent image is gah-wiki-gateway:final-holds-20261027, sha256:59cd2899876f813b1a1fd43ba5316ee513a1ed5bdcaceba81314097261920f4c. Its previous production container is retained as grok_wiki_gateway_before_final_holds_20261027. Production compose references the new tag; temporary previews are stopped. Existing server, auth, security, rate-limit and identifier-policy files remain byte-identical.

Public main acceptance passes for all 69 indexable dossiers and the 69-entry EFTA sitemap; main sitemap remains 192 and disjoint. All 69 wiki receipt cards and the 72-entry wiki sitemap pass at the origin and through fresh release-query access. **Canonical edge acceptance remains incomplete:** Cloudflare still serves the old noindex cards for EFTA00704168 and EFTA01245620, and a 70-entry cached wiki sitemap. The existing credential cannot purge the zone cache. The owner must purge the following five canonical URLs; after that, rerun public acceptance and confirm 69 current wiki cards and a 72-entry canonical wiki sitemap. The previous owner purge resolved the earlier source-hold release only; this final release requires a new purge.

https://wiki.grokarchivehub.com/sitemap.xml
https://wiki.grokarchivehub.com/
https://wiki.grokarchivehub.com/archive
https://wiki.grokarchivehub.com/receipts/EFTA00704168
https://wiki.grokarchivehub.com/receipts/EFTA01245620

The robots item is closed as a validated non-defect, not a claim that the two textual wildcard groups were removed. The entire original audit remains outside this narrower acceptance claim.
