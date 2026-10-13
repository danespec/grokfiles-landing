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


## DOJ OIP interim investigative-holdings release (2026-10-13)
The official [DOJ OIP FOIA Library](https://www.justice.gov/oip/available-documents-oip)
lists a release posted October 9, 2026, labeled
"Review of Investigative Holdings Relating to Jeffrey Epstein and his Criminal Case,"
with interim record dates March 18–27, 2025.
The single [government PDF](https://www.justice.gov/oip/media/1465356/dl?inline=)
is separately monitored as a first-party PDF digest and byte count, not mirrored.
The authorized Mac fetched exactly 4,203,552 bytes on October 13, 2026;
that DOJ-hosted response had SHA-256
`27e80537984876c80512ea360ae8e1e674636d2540d8c112d40adcd0127351ac`.
This is a dated one-source byte fingerprint, not a guarantee of archival completeness.
The payload exceeds the existing 3,500,000-byte transport cap. Only this exact URL receives a 5,000,000-byte bound; all other
sources retain 3,500,000 bytes. Source change is a private review event, never
an automatic accusation, deletion claim, or publication. The OIP release is
**not** the unavailable FBI Vault part series or a complete inventory.
After merge, install the revised `watch.py` and `sources.json` on the
authorized hourly Mac watcher; merging alone does not change its installed catalog.
Fixture test: `python3 scripts/source-watch/test_oip_pdf_022.py`.

## Justia TLS root-store diagnostic — GAH-SIGNALS-023 (October 13, 2026)

The Mac's curl originally failed Justia TLS verification with exit code 60.
An owner-private Mozilla CA bundle downloaded over verified HTTPS from
https://curl.se/ca/cacert.pem (Mozilla export dated September 25, 2026,
SHA-256 a41b5d356aea97a529fe27e0f7316d2f9d946d75927476cf9cf1b90637d00505)
passes curl TLS verification for the Justia mirror; the upstream then returns
HTTP 403. FBI Vault, CourtListener, and UCL also return HTTP 403 from the
authorized Mac. These statuses do not prove files were removed or withheld.

For only the exact configured Justia source URL, the watcher accepts an
owner-supplied CA bundle in the GAH_SOURCEWATCH_JUSTIA_CA_BUNDLE environment
variable. The selected absolute path must point to an owner-owned, 0600,
non-symlink file of a bounded size (10–500 KB) with the expected Mozilla
bundle header. Other sources use the unchanged default TLS trust path.
No global certificate installation or TLS-verification bypass occurs.
Watch runs do not download or update CA roots. Malformed configurations
fail closed; HTTP 403 remains unavailable, not successful monitoring.
Private PDF bodies, docket contents and other fetched material are not saved.

Reproduce offline with test_justia_trust_023.py. Keep issue #9 OPEN;
this resolves only the misleading TLS transport failure for Justia,
not the remote site's access restrictions or court docket freshness.

## OIP FOIA recent-release inventory and July 2025 memorandum records (GAH-SIGNALS-024; October 13, 2026)

The DOJ OIP FOIA Library (https://www.justice.gov/oip/available-documents-oip)
contains two Epstein-titled entries in the Recent Releases section.
Targeted source mode oip_recent_epstein reads ONLY those named entries and their
DOJ OIP media links, not the entire changing FOIA Library, older FOIA Logs,
other political or legal topics, or unrelated media links. One current entry
is the Oct 9 investigative-holdings interim PDF already watched under 022.
The other is a September 23, 2026 OIP Final Response on July 6-7, 2025
DOJ/FBI memorandum acquisition/reporting communications.

New distinct official PDFs monitored by digest only, with first-party Mac
responses verified on October 13, 2026:

- DOJ OIP communications (29 pages by official PDF rendering),
  https://www.justice.gov/oip/media/1462251/dl?inline= ,
  1,274,587 bytes, SHA-256 f8ad8ea91200259af6ccefb7a247870b34a7aa44ac4d2d13f3038578eb081ccd.
- Original DOJ/FBI July 2025 memorandum hosted by the Office of Public Affairs,
  https://www.justice.gov/opa/media/1407001/dl?inline ,
  141,171 bytes, SHA-256 ec70cb11a7f246d79aa23b7fb15cf38e9cb0cb96411ef9a7c3ec569073ffb724.

The OIP released communications include an official public-affairs response
identifying the DOJ/FBI memorandum URL as authentic (PDF p.10 / zero-index 9).
That authentication of the *memo as a government communication* does not
independently prove each substantive assertion in the memo. The memo,
press correspondence, and separate OIP investigative-holdings review must
not be merged as a single source, nor used as personal allegations.

All new PDFs remain below the existing 3.5MB global size cap; the exact
5MB exception from GAH-SIGNALS-022 still applies ONLY to the earlier
October 9 PDF. No document bytes are persisted. For HTML release-index
changes, new official media links are review-required events, and a link
disappearing from the currently observed index is NEVER proof of deletion.
Interleaved unrelated updates to the massive OIP page do not trigger alerts.
Changes to a PDF hash require human assessment of document revisions.
Tests: python3 -m unittest discover -s scripts/source-watch -p 'test_*.py' -q.

Live Mac runtime requires installing the updated watch.py and sources.json
separately from merging the source-watch branch. Preserve the private 0600
state and existing hourly LaunchAgent / CA trust, and do not modify production.
