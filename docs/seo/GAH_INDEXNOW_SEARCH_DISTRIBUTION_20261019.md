# GAH-SEARCH-DISTRIBUTION-001 — IndexNow for October 19 editorial changes

Objective: notify Bing and other participating IndexNow engines of actual changed public GAH pages. Google does not participate; this does NOT cause or request Google indexing.

References: https://www.indexnow.org/documentation and https://www2.bing.com/indexnow/getstarted.

Existing authoritative Google sitemap remains /sitemap.xml. A new publicly verifiable randomly generated 32-character IndexNow ownership key is published as a root TXT resource using both a root file and a Worker explicit route. The key is public by protocol; it is not a payment secret or user login.

The manual Python script uses the live canonical sitemap, selects only URLs with the given real lastmod date, checks HTTP 200 and canonical plus indexability, refuses batches above 100, verifies the public key file, and sends exactly one IndexNow POST only when explicitly passed --send. All other executions are dry runs. Avoid repeated requests or submission of all historical unchanged records.

Release requirements: Worker syntax, 11 regression suites, live verification TXT resource exact text/plain, sitemap unchanged, POST HTTP response 200 or 202. HTTP200/202 acknowledges receipt (or pending verification) and does not guarantee crawler visits, rankings or traffic. Existing X scheduled posts, Instagram assets, Cloudflare Access, editorial privacy and Patreon settings remain unchanged.
