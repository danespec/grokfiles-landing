# GAH-ADSENSE-QUALITY-034 — Live content-value and policy-readiness audit

Checked October 13, 2026 against production grokarchivehub.com.
Independent audit: 137 published apex sitemap URLs, four parallel read-only HTTPS
GET requests (rate-limited), and selective public route/header probes.
Base: PR #75 deployment e73e3f43b6f60785d023bcd5404e28e2f0bc6452.
Prior owner NAS records reviewed, rather than treating all previous AdSense
remediations as undone: Sept 27 GAH-ADSENSE-CONTENT-AUDIT-001 had 161 HTML
files, 70 indexable candidates and 53 GOOD; GAH-ADSENSE-READINESS-007
controlled staging was 61/61 GOOD with 16 technical gates passing.
Neither historical snapshot is the current 137-URL production content set.

## Policy basis (official Google pages, checked Oct 2026)

- Unique original contribution, clear navigation, and meaningful content:
  https://support.google.com/adsense/answer/7299563
- Google Publisher Policies, low-value and no-content inventory:
  https://support.google.com/adsense/answer/10502938
- AdSense Program Policies; screens primarily devoted to private messages:
  https://support.google.com/adsense/answer/48182
- Advertising privacy/cookie disclosure and vendor opt-out:
  https://support.google.com/adsense/answer/1348695
- Search Central original effort, accuracy, source transparency:
  https://developers.google.com/search/docs/fundamentals/creating-helpful-content

Google approval is discretionary. GAH's reporting on sexual abuse, litigation
and survivor records is sensitive; some lawful documentary editorial material
may attract restricted ad demand. Ads must not be placed inside private-message
browsers, unverified allegations, raw files, or non-content interfaces.
Do not conflate indexability with ad eligibility.

## Read-only live checks

| Review dimension | Observed | Audit interpretation |
| --- | --- | --- |
| Sitemap | 137/137 live HTTP200 HTML | Pass for availability; not proof of Google's crawl |
| Main-body exact duplicates | 0 exact normalized-text hashes | Pass preliminary duplicate screen; semantic reuse not ruled out |
| Investigations | 49 routes, approx. 1,093-word category median | Strong amount of text, editorial accuracy requires human check |
| Evidence briefs | 21 routes, approx. 1,070-word category median | Strong amount; source and claim boundaries still determine value |
| Guides | 9 routes, approx. 664-word category median | Primary-source links on all sampled route bodies |
| Dispatches | 9 routes, approx. 906-word category median | Substantive mixed formats; assess timeliness and attribution |
| Document autopsies | 3 routes, approx. 4,521-word category median | Long analyses with specific evidence references |
| News | 4 routes, approx. 317-word category median | Short news briefs, each had external primary/secondary references |
| Thin visual index | /photos about 33 visible static words | JS-driven photo utility, not self-explanatory editorial article |
| Thin emails browser | /barak/emails about 97 main-body words | Sensitive primary-communication interface; AD-EXCLUDE already true |
| Trust | /about, /about-the-operator, /contact, /privacy, /terms, /corrections, /methodology HTTP200 | Pass presence, not legal advice or Google approval |
| Canonical sitemap HTTP headers | 137/137 X-Robots-Tag did not contain noindex | No false noindex conflict on submitted URLs |
| Generated source cards | Four unsitemapped EFTA probes HTTP200 noindex | Intended source-card containment preserved, not all corpus inspected |
| Ad scripts | 0 of 137 contained active adsbygoogle scripts or placements | No live paid-display activation |
| Ads file | /ads.txt HTTP200 publisher line present | Seller ownership declaration, NOT AdSense approval |
| Route ad posture | /photos and /barak/emails AD-EXCLUDE; /privacy AD-EXCLUDE | Critical high-risk routes already held ad-free |
| Eligible future zones | Home/newsroom, investigations and evidence hub lower sections | Only allowlisted candidate areas, no active serving |
| Search | GSC 8 indexed of 40 tracked; 446 impressions, 4 clicks over settled 28 days to Oct 11 | Tracker not whole-domain indexed count; organic proof still limited |

Word thresholds in this table are descriptive HEURISTICS and **not** Google's
formal minimum. Long pages can be low value; short original reporting can
be excellent. Link count alone is not fact checking or source authenticity.
Raw email excerpts were not copied into audit artifacts; private report
stores route names, aggregate counts and selected public metadata only.

## Action taken in this PR

Added a clear, non-accusatory **Visual-record caution** beneath the existing
homepage source-file/photo index buttons: the index is a browsing tool,
not an authenticated finding about a person; image fragments require
source, context and privacy checks; links the already-published
/visual-evidence review methodology. This does not expose or repost any
photograph, assert identity, or imply a photo index is a verified gallery.

Added offline regression against future accidental paid-display rollout:
- Keep approvedDefault:false and multiplexApproved:false.
- Prevent explicit eligibility for photos, private Barak email browser,
  raw source/search interfaces, legal privacy, and internal workflows.
- Preserve default AD-EXCLUDE and archival source-card noindex.
- Reject active AdSense network script tags/placements in 175 tracked
  static HTML files before actual AdSense approval.
- Keep visible privacy/publisher-consent qualification and editorial
  no-guilt-by-association rule; require the new reader-context link.

## Explicit human and production gates (NOT complete)

1. **Visual gallery content/safety.** /photos is a live raw-image JS
   browser of extracted material. A responsible reviewer must inspect
   representative accessible thumbnails and their metadata for privacy,
   copyright, source and graphic-content risk. This audit did not download
   or display unreviewed imagery. Do not invent photo captions or identities.
   Preserve its AD-EXCLUDE classification; weigh separate noindex decision
   only after owner review because it impacts image search discoverability.
2. **Barak email original-source precision.** Live /barak/emails presently
   states 19 parent messages were recovered and excerpts sourced to parent
   originals. Issue #35 remains OPEN: 19 recovered-label records do NOT
   establish 19 independently authenticated complete original message
   bodies. This wording requires specific source-level review/correction
   before AdSense resubmission; do not present a label/class or attachment
   cross-reference as original email-body authentication. Keep this
   browsing route ad-free regardless of indexing.
3. **Original reporting audit.** Spot-check sensitive first-party claims,
   bylines, timestamps, original analysis and external citations before
   approval; link crawls cannot verify the truth of investigative allegations.
4. **Consent and vendor audit.** Privacy page accurately says a
   Google-certified CMP is NOT yet confirmed live. Confirm the actual
   AdSense account's current site-review decision, approved ad units and
   any EU/UK/Swiss CMP requirement before enabling ads anywhere.
5. **Demand/indexing.** Observe actual settled GSC coverage and organic
   search interest; new guides show unknown/discovered/not-indexed state.
   No guaranteed waiting-period or minimum visitor count is asserted.

## Decision

**Technical review:** strong foundation, many earlier mitigations remain.
**AdSense re-application:** HOLD until editorial human review of visuals
and the 19-email provenance wording, account/CMP check, and enough evidence
that the site presents original value rather than mainly raw archive tools.
Do not alter existing approved Cloudflare Access, WAF/Bot Fight, payments,
source privacy or ownership settings. No ads are activated by this release.

Owner-private live inventory and route/header snapshots:
  ~/_gah_builds/GAH-ADSENSE-QUALITY-034-private/live-audit-20261013.json
  ~/_gah_builds/GAH-ADSENSE-QUALITY-034-private/sitemap-header-audit-20261013.json
