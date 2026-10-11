# GAH-SIGNALS-004 — Private primary-source intake (v0.1)

This is **not** the Trending widget, a legal-compliance verdict, an automated newsroom, or a comprehensive alert engine. It is a read-only monitored-source snapshot and change detector, independent of Google Trends and news headlines.

## What is working (October 11, 2026)
Run `python3 scripts/source-watch/watch.py --update` on the authorized Mac to create a private 0600 JSON baseline, latest health report, and append-only event log in `~/_gah_builds/GAH-SIGNALS-004-private`. An ordinary invocation without `--update` is a read-only dry-run. No public website, Cloudflare KV, webhook, membership, checkout, or Git branch is changed.

- DOJ numbered disclosures and notices: observe **new link targets**, not completeness of individual data sets.
- Senate Finance index and the September 30 banker FD-302 release request: observe **new indexed links**; attribution remains a Senate committee assertion. $1.4B is a separate aggregate.
- Federal Register keyword search: observe new search results; this is not proof of full legal compliance with the Act's redaction-justification requirement.
- Norway Storting September 30 and October 1 hearing transcript pages: observe changed visible text; changes are editorial review leads, not criminal findings.
- FBI Vault Parts index: configured, but Mac requests receive HTTP 403. Status **unavailable**, not “no new parts.”
- Phang CourtListener and Justia mirrors: unavailable from this Mac; no docket freshness guarantee.
- Additional coverage gaps remain listed in `sources.json`: French prosecutors, UK source-specific orders, October grand-jury filings, UCL event source URL, ad data, litigation records, and item-level DOJ before/after hashes.

## Source integrity rules
1. All watched sources must be HTTPS and use preapproved source domains. HTTP redirects to unknown hosts are refused.
2. A non-200 response, an empty index, or unavailable source **preserves the last successful baseline**.
3. A missing link in one successful index response means **absent from the currently observed index**. It is not evidence that a record was deleted, withheld, or never existed.
4. Only a new primary-source link or text change produces a **review-required** event. No automated allegation or public posting follows.
5. First successful fetch is a silent baseline, not proof of recent publication. Original publication dates must be verified separately.
6. Do not republish victim names; no PDF bodies or full hearing transcripts are persisted. Link labels come from official sources and require privacy review before any public display.
7. Run `python3 scripts/source-watch/test_watch.py` to check isolated fixture scenarios, including a mock HTTP 403 and a false-removal test.

## State, scheduling, and recovery
State and events remain outside the repository. `latest-report.json` is a private operational diagnostic; `events.jsonl` is a *triage inbox*, not publishable evidence. Recommended polling cadence is one hour, using one process lock and read-only GETs. On an unavailable source, the snapshot remains unchanged; a subsequent successful fetch is compared with the last successful baseline.

To stop a macOS LaunchAgent used with this script: `launchctl bootout gui/$(id -u) ~/Library/LaunchAgents/com.gah.primary-source-watch.plist`. This does not delete the private evidence ledger. The standalone runner has no credentials or privileged operations. Do not assume a sleeping or powered-off Mac ran the checks.

## Gating before Issue #9 closure
The 6/9 successfully accessible configured sources do **not** qualify as complete eight-lead monitoring. Add reliable FBI Vault and Phang docket access, expand the missing official-source adapters, test archival per-file hashes and dates, provide a non-sensitive health report, and add editorial review/acknowledgement before considering automatic delivery. Keep the public Trending mechanism separate.

GitHub: https://github.com/danespec/grokfiles-landing/issues/9
