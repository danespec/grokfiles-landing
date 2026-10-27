# Owner purge acknowledged — cache diagnosis

The owner confirmed Purge Everything was performed. Do not assume the owner omitted that action or ask for repeated purges as the only remedy.

A fresh canonical request at 20:07 UTC reached Cloudflare DEN and returned HIT responses about one hour old. The archive still displays old labels, and EFTA02858491 still has the old wording. The three other receipt cards correctly use generic receipt-card titles; the previous checker incorrectly compared them with descriptive main-dossier titles. That predicate was wrong and is corrected to compare receipt description metadata with the register. Direct comparison shows those three cards still have old description metadata, even though their visible titles and content can appear current.

The origin currently returns updated archive/receipt content with Cache-Control: no-store and CDN-Cache-Control: no-store. This suggests an overriding cache policy or another cache layer, but the exact configuration is not established. The existing Wrangler authentication can read the zone but Cloudflare rejects cache-ruleset listing with error 10000. No cache or security configuration was changed.

Next diagnostic input: the Cloudflare Caching / Cache Rules list, then the matching wiki rule and any applicable legacy Page Rule. Preserve the owner’s bot and access policies. Prefer correcting a specific rule over repeatedly purging otherwise valid responses. Historical acceptance JSON is retained; its three generic-title failure messages are superseded by this note and the corrected metadata checks.
