# GAH-SIGNALS-004 — Private primary-source intake (v0.1)

This is **not** the Trending widget, a legal-compliance verdict, an automated newsroom, or an iPhone/email push delivery service. It is a read-only monitored-source snapshot and change detector, independent of Google Trends and news headlines.

## What is working (October 11, 2026)
Run `python3 scripts/source-watch/watch.py --update` on the authorized Mac to create a private 0600 JSON baseline, latest health report, and append-only event log in `~/_gah_builds/GAH-SIGNALS-004-private`. An ordinary invocation without `--update` is a read-only dry-run. No public website, Cloudflare KV, webhook, membership, checkout, or Git branch is changed.

- DOJ numbered disclosures and notices: observe **new link targets**, not completeness of individual data sets.
- Senate Finance index and the September 30 banker FD-302 release request: observe **new indexed links**; attribution remains a Senate committee assertion. $1.4B is a separate aggregate.
- Federal Register keyword search: observe new search results; this is not proof of full legal compliance with the Act's redaction-justification requirement.
- Norway Storting September 30 and October 1 hearing transcript pages: observe changed visible text; changes are editorial review leads, not criminal findings.
- FBI Vault Parts index: configured, but Mac requests receive HTTP 403. Status **unavailable**, not “no new parts.”
- **Official D.D.C. CM/ECF RSS feed:** `https://ecf.dcd.uscourts.gov/cgi-bin/rss_outside.pl` is reachable without PACER login and carries recent publicly docketed activity. Filter exactly to **1:26-cv-01417, Phang v. Blanche**. The monitored window rotates; store unique matching events permanently across polls and never equate disappearance from the feed with deletion. Entry summaries and public docket metadata do not include the full underlying filing. A no-match poll does **not** establish no filing or compliance.
- **Official D.C. Circuit appeals RSS:** `https://ecf.cadc.uscourts.gov/n/beam/servlet/TransportRoom?servlet=RSSGenerator` monitors orders/opinions/judgments for **26-5299** and **26-5334**. Empty valid fresh feed is *not* an error, but does not establish no appellate motion or other filing. An appellate order may affect deadlines; do not assert a stay without its actual text.
- Official GovInfo Phang *opinions* page: accessible; can flag revisions/new judicial opinions but **not docket filings or party submissions**. CourtListener and Justia docket mirrors remain unavailable from this Mac; no docket freshness guarantee.
- Added direct Norway parliamentary commission page; the Paris financial prosecutor February 16 press PDF (raw SHA-256 only); the Paris court press index (all topics, requiring editorial relevance review); and DOJ Data Set 1 and 12 first-page document link inventory only.
- UCL November 16 Freeman lecture official page is identified and cataloged, **but the Mac gets HTTP 403**. The public UCL page announces intended source-material publication on November 16, not a pre-existing verified research release.
- Remaining gaps: full DOJ pagination + per-item versions; French case-specific releases beyond the PNF press PDF; UK case-specific court records, October grand-jury filings, political ads, litigations, and UCL access. See `sources.json`.

## Source integrity rules
1. All watched sources must be HTTPS and use preapproved source domains. HTTP redirects to unknown hosts are refused.
2. A non-200 response, an empty index, or unavailable source **preserves the last successful baseline**.
3. A missing link in one successful index response means **absent from the currently observed index**. It is not evidence that a record was deleted, withheld, or never existed.
4. Only a new primary-source link or text change produces a **review-required** event. No automated allegation or public posting follows.
5. First successful fetch is a silent baseline, not proof of recent publication. Original publication dates must be verified separately.
6. Do not republish victim names; no PDF bodies or full hearing transcripts are persisted. Link labels come from official sources and require privacy review before any public display.
7. Run `python3 scripts/source-watch/test_watch.py` to check isolated fixture scenarios, including a mock HTTP 403, rolling RSS entry preservation, court-URL rejection, and a false-removal test.

## Alerts: what is and is not delivered

Local **macOS Notification Center** alerts are generated for new review events by `notify.py`. A plain, non-sensitive, batched alert says a private evidence event needs review, without exposing source titles, witness names, document contents, or URLs on the lock screen. A delivery acknowledgement in `notified.json` avoids repeated popups, and failed notification attempts are retried in later hourly runs. Live `osascript` notification creation returned success October 11. Notification Center presentation still depends on Mac system permissions and Focus settings, and **does not sync with the iPhone**, send email, or overcome ChatGPT account-level disabled notifications. For actual remote alert delivery, configure an explicitly approved recipient and a secured sender channel; neither has been created.

## State, scheduling, and recovery
State and events remain outside the repository. `latest-report.json` is a private operational diagnostic; `events.jsonl` is a *triage inbox*, not publishable evidence. Recommended polling cadence is one hour, using one process lock and read-only GETs. On an unavailable source, the snapshot remains unchanged; a subsequent successful fetch is compared with the last successful baseline.

To stop a macOS LaunchAgent used with this script: `launchctl bootout gui/$(id -u) ~/Library/LaunchAgents/com.gah.primary-source-watch.plist`. This does not delete the private evidence ledger. The standalone runner has no credentials or privileged operations. Do not assume a sleeping or powered-off Mac ran the checks.

## Gating before Issue #9 closure
The reachable configured sources (8/11 in the October 11 live dry-run, with occasional source timeouts) do **not** qualify as complete eight-lead monitoring. Add reliable FBI Vault access and complete Phang docket access (the public court RSS is only a recent activity signal), reliable delivery to the user away from their Mac, expand the missing official-source adapters, test archival per-file hashes and dates, provide a non-sensitive health report, and add editorial review/acknowledgement before considering automatic delivery. Keep the public Trending mechanism separate.

GitHub: https://github.com/danespec/grokfiles-landing/issues/9

## October 15–16 readiness and hard limitations

The September 16 ECF 42 order calls for production of the administrative record **to the plaintiff by October 15**, which need not itself produce a publicly visible docket entry. The separate October 16 judicial review deadline for FBI notes is also not guaranteed to produce an immediately accessible public document. Monitoring the official court RSS can detect relevant newly docketed events; it cannot certify compliance, inspect sealed/in-camera papers, or prove nothing happened when no entry appears. Where the RSS indicates activity, follow the official docket through properly authorized access before making a public factual claim.

## Scope and rate-control safeguards

`official_pdf` validates `%PDF-` and hashes source bytes; no PDF contents are stored or reproduced. Paris press-release index changes are unfiltered publisher activity and do not establish involvement in any case. DOJ Data Sets 1 and 12 are *first-page* listings, not the full catalog. First successful source fetch is a baseline, not proof of a new filing or new press release. Source availability is reported per run and errors preserve prior hashes/links. FBI Vault remains HTTP 403 from both Mac and NAS; do not use alternate mirrors as conclusive proof of the official current part count.

Transient transport timeouts receive **one retry** after one second; HTTP 403/404, malformed responses, expired RSS windows, and unexpected content are **not** retried. Failed runs retain their previous successful source baseline. This is bounded, not an unlimited crawler.

## Critical court-feed health alerts (October 15–16 readiness)

In addition to **new evidence** notices, the hourly run checks the official D.D.C. and D.C. Circuit Phang RSS fetch health. A failure of either feed produces a separate generic macOS notification titled *GAH Court Watch degraded*, no more than once per distinct failure combination per UTC day; failures retry if macOS notification delivery itself fails. Permanent FBI Vault, CourtListener, Justia and UCL failures do **not** trigger this court-only alert. The private report's `court_health_notification` gives the result. Court access outage is **not** evidence of missed filings or legal deadline noncompliance. Mac notifications may be suppressed by macOS settings and do not provide iPhone/email delivery.

## CO-05 independent-vs-coordinated ad distinction (2026-10-11)

The October 5 DCCC announcement (https://dccc.org/dccc-releases-new-tv-ad-in-co-05-featuring-family-of-jeffrey-epstein-victim-virginia/) describes the named *Virginia* ad as a coordinated DCCC + Killin campaign six-figure media buy. The claim about price is **the committee's own self-description**, not an amount verified in FEC filings. See also the campaign's first-party original announcement at https://www.killinforcolorado.com/news/new-killin-ad-epstein-victim-virginia-giuffres-family-slams-jeff-crank-over-epstein-coverup and FEC's official DCCC committee ID C00000935 at https://www.fec.gov/data/committee/C00000935/?cycle=2026.

The separate FEC Schedule E monitoring introduced by PR #16 tracks independent expenditures involving CO-05 candidate IDs and does not establish the amount, source, or content of the *coordinated* DCCC/Killin ad. The FEC describes Schedule F as recording coordinated party expenditures. Follow Schedule F and, where appropriate, Schedule B disbursements, with transaction images/filing dates, independently of the campaign release before assigning a dollar amount to that ad. The official FEC DEMO_KEY endpoint was returning HTTP 429 during an October 11 query for Schedule F; no rate-limit bypass was used.

The three newly configured primary pages are monitored by hashing the visible article/main body only, to reduce false alerts from changing site navigation. A missing/empty main-body is marked unavailable, not silently treated as zero changes. These are mostly partisan/self-published pages and **are not independent corroboration** of campaign accusations or actual ad expenditure.

## UK source of record — Oct 8, 2026 High Court

Official judicial publication: https://www.judiciary.uk/judgments/andrew-mountbatten-windsor-v-the-central-criminal-court-and-another/ with court order https://www.judiciary.uk/wp-content/uploads/2026/10/AC-2026-LON-002321-Mountbatten-Windsor-v-Central-Criminal-Court-and-another.pdf (claim AC 2026-LON-002321, 10 pages). The order says Thames Valley Police conceded unlawful warrants under section 8 of PACE; the warrants/searches/seizures were found unlawful for that reason, **not** that every possible ground for challenge succeeded, and **not** that the criminal investigation ended. Whether material may still be retained under s59 remains pending. Court-ordered publication of specified proceedings documents is subject to redaction of police officer/staff names/contact details and certain legal-representative details. Press and parties may apply concerning those redactions within 14 days of Oct 8 order. Monitor court HTML main content plus PDF SHA-256. The source is primary, but the PDF by itself is not proof of a future retention ruling or a new charge.
