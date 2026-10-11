# GAH-SIGNALS-013 — Private outbound alert delivery

This is a **single-recipient, owner-authorized, transactional notification channel**, separate from public GAH newsletters, visitor email subscriptions, and production endpoints. No public website routes, Cloudflare, revenue, Patreon, or payment settings are changed.

## Channel

- Verified Resend sending domain: `grokarchivehub.com`.
- Fixed sender: `Grok Archive Hub Alerts <alerts@grokarchivehub.com>`.
- Fixed recipient: `grokcloudflare@gmail.com`.
- Credentials: a **domain-scoped, sending-only** Resend API key restricted to the verified domain, stored outside Git in `~/_gah_builds/GAH-SIGNALS-004-private/resend-alerts.key` with mode **0600** and its containing directory **0700**. Never paste into repository, notes, terminal logs, browser, or an issue.
- Private `resend-alerts-config.json` holds sender, recipient, key-file location and enabled status; mode **0600**. Both addresses are hardcoded in the program as additional accidental-misaddress protection.

## Behavior

Every 15 minutes while the Mac is awake, `send_resend.py` checks the existing **private** `events.jsonl` and `latest-report.json` for events that have not already been accepted by Resend. Sends at most 20 source-review events in one email. Tracks successful Resend acceptance in `resend-alerts-ack.json` and latest receipt in `resend-alerts-last.json`, both mode 0600.

- A new event email contains only source IDs and coarse event types. It does **not** include source title/labels, user or victim names, HTML/PDF contents, internal ledger URLs, personal identity data, or allegations.
- Critical official `phang-dcd-official-rss` and `phang-dc-circuit-appeals-rss` unavailability is marked operational health only, at most once per distinct outage combination per UTC day. A network outage is **not** a court ruling, filing, or compliance finding.
- Other configured sources' long-standing HTTP403 errors are visible in the private monitor report but do not cause repetitive emails.
- First-run baselines are silent. Existing queued private events (if any) are not deleted or rewritten.
- Stable `Idempotency-Key` per batch reduces duplicate sends on retry, but external mail does not have a general *exactly once forever* delivery guarantee. Failed sends do not mark events as accepted. Resend acceptance is **not** inbox delivery confirmation.
- Suppresses marketing tracking; uses the account's verified transactional API. Never auto-publishes findings, sends broadcast newsletters, or activates checkout.
- A sleeping/offline Mac does not guarantee 15-minute checks. The separate hourly ChatGPT source-watch automation is independent and its platform-level push/email settings are outside this Mac job.

## Installation and recovery

`python3 scripts/source-watch/test_send_resend.py` runs offline delivery, security, idempotency and outage tests.

On the authorized Mac, copy `send_resend.py` and `notify.py` + `watch.py` to private runtime `~/_gah_builds/GAH-SIGNALS-004-runtime` (or use the existing approved runtime). Configure a user-specific `com.gah.resend-source-alerts.plist` LaunchAgent with an absolute Python path, `ProgramArguments` including `--private-dir`, `StartInterval=900`, `RunAtLoad=true`, output/error logs only in the private state directory. Use private mode 0600 on the LaunchAgent. Do not print credential or HTTP response bodies to logs.

`python3 send_resend.py --private-dir ~/_gah_builds/GAH-SIGNALS-004-private` performs a normal check; `--test-email` sends a one-time explicit verification email. Use the real absolute path with no literal backslash-escaped tilde.

To disable: `launchctl bootout gui/$(id -u) ~/Library/LaunchAgents/com.gah.resend-source-alerts.plist`. Revoke the API key in Resend if transport has been compromised. Stop action does not delete evidence ledger or acknowledgement history.

## Pending exclusions

This release does not solve the blocked FBI Vault 403, unavailable complete PACER/RECAP docket, UCL 403, DOJ Data Set pagination 403, or missing in-camera/private court records. Keep Issue #9 open.
