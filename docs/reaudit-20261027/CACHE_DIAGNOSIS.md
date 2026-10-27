# Cache rule corrected — canonical acceptance passed

Owner-supplied screenshots established that the last wiki bypass rule matched only paths starting with /archive/. It did not match /archive or any /receipts/ URL. The owner saved the expanded condition covering the exact /archive and /receipts roots plus their slash-delimited descendants, restricted to wiki.grokarchivehub.com. Bypass cache and last rule order were preserved. No additional purge was requested or required for the successful recheck.

At 20:35–20:36 UTC on October 27, fresh requests to the five affected canonical URLs returned HTTP 200, CF-Cache-Status DYNAMIC, Cache-Control: no-store, and CDN-Cache-Control: no-store. The old archive labels and EFTA02858491 wording were absent; the other three receipt descriptions matched the current register.

The follow-up canonical sitemap crawl checked all 72 wiki URLs and compared all 69 receipt descriptions with the source register: zero failures. Seventy-one responses were DYNAMIC; one other unchanged wiki route remained HIT. This is verification of the affected public URLs and the wiki sitemap set, not a guarantee about every Cloudflare region or browser cache. The attached cache-rule-acceptance.json records per-URL results. Bot policies, security protections, API guards, static asset rules, and production application code were unchanged by this cache correction.

## Earlier diagnosis (superseded)

# Owner purge acknowledged — cache diagnosis

The owner confirmed Purge Everything was performed. Do not assume the owner omitted that action or ask for repeated purges as the only remedy.

A fresh canonical request at 20:07 UTC reached Cloudflare DEN and returned HIT responses about one hour old. The archive still displays old labels, and EFTA02858491 still has the old wording. The three other receipt cards correctly use generic receipt-card titles; the previous checker incorrectly compared them with descriptive main-dossier titles. That predicate was wrong and is corrected to compare receipt description metadata with the register. Direct comparison shows those three cards still have old description metadata, even though their visible titles and content can appear current.

The origin currently returns updated archive/receipt content with Cache-Control: no-store and CDN-Cache-Control: no-store. This suggests an overriding cache policy or another cache layer, but the exact configuration is not established. The existing Wrangler authentication can read the zone but Cloudflare rejects cache-ruleset listing with error 10000. No cache or security configuration was changed.

Next diagnostic input: the Cloudflare Caching / Cache Rules list, then the matching wiki rule and any applicable legacy Page Rule. Preserve the owner’s bot and access policies. Prefer correcting a specific rule over repeatedly purging otherwise valid responses. Historical acceptance JSON is retained; its three generic-title failure messages are superseded by this note and the corrected metadata checks.
