# GAH-SIGNALS-009: FEC filing watch for the Colorado 5th District ad lead

**Purpose:** Add directly attributable Federal Election Commission (FEC) *independent-expenditure filing* metadata as a lead to the GAH private review queue. This is **NOT** an estimate of advertising devoted to Epstein, evidence of the contents of any creative, or proof of spending behind a particular ad.

## Sources and scope

- Official API: `https://api.open.fec.gov/v1/schedules/schedule_e/`. Two narrowly scoped queries use the FEC-provided `DEMO_KEY`, the 2026 transaction period, and a single page of 100 entries. FEC API terms and usage limits apply. **No candidate finance total or party-level inference is made.**
- Candidate IDs independently resolved through the official FEC candidates search endpoint (October 11, 2026):
  - Jeff Crank: `H6CO05142`.
  - Jessica Willow Killin: `H6CO05324`.
- Context for why those are monitored: October 2026 reporting on an Epstein-related attack ad in the Colorado 5th District. GAH must separately obtain the relevant actual creative, advertiser/sponsor identification and FEC link before claiming a specific dollar amount for that ad.
- An independent-expenditure line item can reflect printing, postage, production, consulting or other purposes. It **cannot** prove a specific issue was discussed. FEC returns *filings*, often reported later than the expenditure occurred.

## Private operation

`python3 scripts/source-watch/fec/watch_fec.py` performs a dry-run. `--update` initializes private local `~/_gah_builds/GAH-FEC-009-private` baselines and updates the private review event ledger. Source and output files are mode 0600, private directory 0700. 2026 FEC Schedule E record IDs persist across API pagination rollovers. If an official endpoint is unavailable or malformed, its previous successful data stays intact. First successful poll is a baseline, not a new event.

Only the first 100 entries *as ordered by the FEC API* are observed per candidate; never imply a complete index when `pagination.count` exceeds the returned entries. Result health is `partial_latest_page_only` even if both queries succeed. A 2026 expense reported months later might be outside the current window and therefore undetected. Document retrieval and image/content verification are **not implemented**.

An hourly/three-hourly run generates a small number of API calls to stay within shared demo-key rate limits. When new entries are found, a generic local macOS notification can be generated through the existing `source-watch/notify.py`; it contains neither detailed campaign info nor personal data. **No remote push/email delivery is set up.**

Tests: `python3 scripts/source-watch/fec/test_fec.py`. Assertions include identity validation, first-run silence, diff idempotence, missing source fail-closed, no issue attribution, file permissions and malformed source responses.

## Remaining gating work

Correlate specific ad creative and sponsor with primary-source FEC records; determine if any expenditure line item actually relates to Epstein-themed advertising; obtain a full index via permitted data export/approved API pagination, with independent saved before/after snapshots. Do not extrapolate from an IE record to campaign misconduct. This adapter is a narrowly-scoped research lead, not an FEC-certified Epstein ad-spend calculator.
