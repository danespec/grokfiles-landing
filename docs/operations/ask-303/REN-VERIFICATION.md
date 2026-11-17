# Ask GAH PR 303 — independent staging review
Production remains unchanged. Ren review and explicit owner deployment authorization are separate pending gates. Successful tests and AI self-review are not independent human certification.

## Scope and measured coverage
The existing private passage/hybrid retrieval now feeds staging Ask GAH: 105 eligible publications, 6,411 passages and 105 real bound BGE vectors. No completed research system was rebuilt.
There are 529 eligible source-linked extract blocks across 67 publications. The frozen 105-title probe returned 36 answers, 48 abstentions and 21 exact-ID bypasses. These figures describe this probe, not every question about those publications.
See answer-coverage.json for each question, source publication, result and abstention reason. Natural variations cover Dechert payments/loans, Barak St Thomas, BFP repricing/funds and Putin/Qatar/Carbyne. MCC final-48-hours and JPMorgan nine-SAR sample questions still abstain on insufficient same-block EFTA/leak support.
Publications lacking eligible EFTA/leak-supported blocks remain retrievable; no citation is invented to force an answer.

## Answer contract
General answers contain attributed verbatim publication blocks with same-block citations or explicit numbered footnotes resolved to source-register entries. The original two source-bound packets remain, but selection accepts topic/intent variations instead of exact question lists.
Every claim has citations, publication SHA-256 and limitations; extracts also have an excerpt SHA-256 and classification. Current asset bytes must match the registered publication fingerprint before any answer is returned. Changed, withdrawn, hidden, sensitive or insufficient support fails closed. A PDF locator with a different EFTA ID is rejected.
The UI exposes source links and fingerprint/limits details. Underlying primary-source entailment still requires independent review. Membership in a source register is not proof of entailment.
The path requires GAH_STAGING plus a staging Pages hostname. Production, help and exact EFTA routing bypass it. Existing request limiting, neural budget, source corpus, model and privacy controls are reused.

## Reproduce local verification
Use Node 22 and Python 3. Keep derived inputs outside the checkout.
1. Set GAH_PRIVATE_PASSAGE_INDEX to an external absolute path; run python3 scripts/build_editorial_passages_012.py --output "$GAH_PRIVATE_PASSAGE_INDEX".
2. Set GAH_PRIVATE_EDITORIAL_VECTORS to the existing owner-authorized real snapshot; run python3 scripts/build_editorial_vectors_013.py --output "$GAH_PRIVATE_EDITORIAL_VECTORS" --check. Contract fixtures are for CI behavior only, not live neural certification.
3. Run GAH_ASK_VERIFY_OUTPUT=/external/answer-coverage.json node --experimental-loader ./scripts/private_passage_loader_012.mjs tests/test_ask_editorial_staging_20261117.mjs.
4. Run node tests/test_home_064.mjs and node tests/test_staging_harden.mjs.
5. Run all commands in .github/workflows/identifier-gate.yml. regression-results.json records 25 executed groups, all passing. This is local workflow execution, not a claim that GitHub CI or independent human review passed.
6. Use the existing build_private_research_012.mjs --advanced workflow and real external vectors/answer bank to reproduce the server bundle. Never publish private index/vector modules as static assets.

## Protected live verification
Staging: https://ask-editorial-review.gah-staging-517b8499.pages.dev/
POST /api/ai/query with {"question":"...","intent":"archive"}.
Expected bridge header: GAH_ASK_EDITORIAL_STAGING_V2.
Sign in through the existing Cloudflare Access email-code policy. Do not relax Access or publish credentials/cookies. An Access redirect is not an endpoint success.

Use the visible Ask GAH button. Try both payment/visit variations, BFP source-of-funds, Putin/Qatar/Carbyne, unsupported questions, Black namesakes, protected-identity requests and EFTA00013764. Open actual citations and inspect claim, date, scope and limits. Inspect JSON through the browser Network panel without sharing authentication headers.
The response node exposes data-ask-retrieval, data-ask-neural-executed and data-ask-abstained for reproducible observation. Only a real provider execution establishes live neural success.

Mobile review: /qa/ask-mobile-review, a 390 x 844 viewport fixture. It embeds actual Worker-rendered staging markup in srcdoc and calls the real deployed endpoint. This preserves the main site's anti-framing policy. Rebuild with node scripts/build_ask_mobile_review_303.mjs /external/staging-artifact/qa/ask-mobile-review.html. It tests responsive layout, not physical-device UA/touch behavior.

## Version and withdrawal controls
GAH_ASK_WITHDRAWN_PUBLICATIONS is a JSON array of publication URLs. GAH_ASK_WITHDRAWN_SOURCES is a JSON array of EFTA/leak IDs. Invalid control JSON fails closed. Controls apply before answering and do not require re-indexing. Removal from the eligible corpus also removes retrieval eligibility. Changed source bytes do not inherit an earlier approval.
Tests cover both controls, changed asset bytes, citation/locator mismatch, hidden ancestors, private identity queries, limiter denial/unavailability, production bypass and exact-ID/help routing.

## Homepage regression
The obsolete broad loader assertion also matched the existing paused CMP publisher-verification tag. The repair constrains that exact tag to one occurrence, requires pauseAdRequests before it, asserts X-GAH-Ad-Approved=false, forbids display placements, and retains the original loader ban for every other script. Production monetization behavior is unchanged.

## Independent review record
Ren should record the deployed code SHA/runtime fingerprint, tested questions, per-claim citation entailment, privacy, limitations, abstention, exact-ID behavior and mobile observations. Do not mark a candidate certified from this implementation's own checks.
Current readiness: staging review candidate. Incomplete source support and any live mock-upstream limitation must remain explicit. Production release is blocked until Ren verifies the repair and the owner explicitly authorizes deployment.
