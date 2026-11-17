# Ask GAH v3 — independent staging review

Release status: staging candidate only. Do not merge or deploy to production until Ren independently verifies claim entailment, privacy, natural-language relevance, and mobile behavior, and the owner explicitly authorizes release.

## Baseline and changes
- Main baseline: 7aad10043a8b9f272feddff79f95454055dd0b71 (172 sitemap URLs).
- Existing 105-publication / 6,411-passage corpus and actual bound 105-document BGE vector snapshot retained; no new corpus admissions.
- Broadened bounded candidate examination from three to eight publications; source-bound packets now include MCC chronology, Gratitude America account exhibit, Hold the Letter, and Amador report, in addition to Dechert and Barak. Matching candidates must retain their registered publication bytes and non-withdrawn source IDs.
- Tightened exact EFTA link/anchor checks; hidden anchors and unrelated URLs no longer validate citations. All staging archive requests share a rate limiter and privacy guard before exact/mixed-ID locator routing. A mixed-ID question returns locators only, not an upstream mock answer.
- Discovery links are labeled navigation only: published topic, timeline, Atlas and dataset routes. They are not claim evidence.
- Frozen title probe: 36 answers, 48 abstentions, 21 identifier bypasses; 485 eligible extract blocks in 65 publications. These are local contract observations, not independent entailment certification. The nine-SAR amounts remain an abstention because the required claim-level EFTA support is not established. Related publication locators are available.
- UI preserves original source links and additionally shows supporting publication and research navigation. Rebuilt 390x844 fixture; no physical-device verification claimed.

## Reproduce
Use Node 22, Python 3, external private passages, real bound vectors and existing reviewed answer bank. Follow REN-VERIFICATION.md, substituting the v3 bridge header GAH_ASK_EDITORIAL_STAGING_V3.
Run the Ask contract test with GAH_ASK_VERIFY_OUTPUT set to an external file; compare answer-coverage.json. Run the full identifier gate and deploy/prepare-publication-release.sh --check. Never publish derived private inputs as static assets.

## Independent review cases
1. Dechert payment/loan variations and Barak visit; compare each claim against its exact cited source.
2. MCC last two days, Gratitude America account transfers/deposit, Hold the Letter timing, Amador expert report; distinguish primary material, official findings, and expert opinion.
3. Black namesakes, unsupported claims, protected identity requests, and restricted mixed-ID questions must abstain. Known ID alone and ordinary mixed-ID question return only requested verified public locator(s), not a generated answer.
4. Withdraw a source or publication in a controlled test; changed bytes or malformed controls must fail closed. Nine-SAR totals must not inherit the Amador report citation.
5. Inspect topic, timeline, dataset and Atlas links for navigation only. Check real neural execution separately from contract fixture behavior.
6. Use authenticated protected staging, test /qa/ask-mobile-review and physical mobile if available. Confirm no production fallback; no production merge authorized.

Prior staging evidence files refer to the earlier V2 deployment only. V3 requires a new independent review record. Do not interpret the earlier receipt or screenshot as V3 live verification.
