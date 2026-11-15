# GAH-AI-RETRIEVAL-009 — editorial ranking alongside the full archive
Base: 7a0f904; rollback deployment ee91c02a-9b1a-4dc2-8f83-1ee895e7be64 (verify current immediately before release).
The uploaded 100-query benchmark (ten rounds of ten queries) showed unchanged subject results after the 008 navigation release. Four topic families are addressed here, not a general semantic retrieval claim.

## Implementation
- For exact, reviewed query aliases in payment, flight, Barak and timeline families, add one published editorial locator first, after normal full-archive retrieval succeeds. The timeline lead is the existing timeline hub, not a claim of comprehensive chronology.
- Existing approved 007 public metadata supplies the other three locators. No new underlying factual claims, source hashes or people associations. Preserve the original requested legacy result page as archive_results, including displaced rows. The normal hits/results remain capped by requested limit.
- Only explicit no_ai=true, successful non-degraded, unfiltered text requests with the bounded recognized payload shape qualify. Mixed/identifier/filtered/generative requests remain unchanged. No extra upstream request, embedding computation or new binding. Experimental semantic endpoint remains disabled in production.
- Navigation results now explicitly report degraded=false, without inventing backend processing time.
- Separate protected 009 staging alias exercises the production release profile, not the 007 prototype. Never point staging at production wiki. Local actual-Worker tests use an isolated mock backend, not production.
- This is targeted curated ranking, not a human-reviewed 100-query live relevance benchmark or competitive superiority result.

## Production gate
Authenticate to the 009 alias. Verify four top destinations, six existing controls, original archive page preservation and duplicate handling, full archive outside pilot, filtered/identifier queries, noindex, no production bindings, actual limiter preservation, MCP, feed, and experimental endpoint exclusion. If the staging wiki mock is not configured, use the existing approved isolated staging backend process; do not bypass Access or substitute production. Record asset parity, CI, current production deployment, and CPU/latency. Merge and deploy only exact validated artifact; rollback on material error, latency, privacy or archive regression. Repeat the uploaded 10 x 10 benchmark on production after deployment; distinguish live results from fixture results. No training/payment, title, homepage, indexing or firewall changes.
