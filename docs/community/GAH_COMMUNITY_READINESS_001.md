# GAH-COMMUNITY-001: verified audit and Phase 1 source-based participation

Date: October 18, 2026. Project: Grok Archive Hub.

## Verified findings
- /forum returned 200 but contains no working discussion thread or user-submission workflow; Enter room was disabled.
- /tips and /contact offer ordinary public mailto:grokcloudflare@gmail.com. No anonymous/secure intake; the published tip instructions say so.
- /reading-room/request-queue and /open-questions are informational, not a moderated public forum.
- GitHub repository is public; Issues enabled, GitHub Discussions disabled at audit.
- No verified GAH-operated Reddit or Discord link was found in the website source. Do not advertise one without identity/moderation verification.
- External community benchmark: https://epsteinwiki.com/community-desk/ links Reddit, Discord and an independent forum. No inference of its ownership over that forum.

## Phase 1 release
- New /community is a public, indexable community desk with evidence-based email templates, privacy guidelines, three existing investigations' source requests and explicit channel status.
- Forum page remains honest, linking to the Community Desk rather than a dead disabled CTA.
- /tips, /latest, /investigations and homepage now link to Community Desk.
- Worker routing, sitemap entry, ad exclusion policy added. No change to auth/payment/Cloudflare Access boundaries. No new storage, collection endpoint or auto-moderation.

## Source contribution lifecycle
1. Tip arrives by public email with public source URL, EFTA/Bates/ECF number, date, context, and narrow claim.
2. Operator screens for survivor/private-person identification, harassment, unlawful material and nonpublic financial details. Sensitive material is not published.
3. Reviewer verifies original source, surrounding pages, any OCR distortion, conflicting sources and provenance.
4. Reviewer labels claim/source/bias/silence/confidence and disposition: accepted fact, correction, unresolved, disproved, or declined.
5. If promoted, update public investigation with citations, date and corrections trail. No automatic publication of submissions.

## Phase 2 working public discussion forum — launch gates
- Choose between moderated managed forum, GitHub Discussions, or Cloudflare Workers+D1. GitHub account requirement is a major participation/privacy constraint; GAH Issues should not take confidential tips.
- Implement authenticated roles, server-side permissions, secure sessions/cookies, CSRF and XSS protection, per-IP/account rate limits, Turnstile/spam filters, strict moderation queue, PII redaction, accessible mobile UI and deletion/retention handling.
- No unauthenticated public writes or attachments before moderation and security testing. Do not claim anonymity or end-to-end encryption.
- Link each accepted source question to the corresponding GAH case, public primary record, dated claim and editorial limits. Public status does not establish truth.
- Staging-first threat modeling, rollback snapshot, abuse testing and owner-approval gate before enabling user-generated threads.

## Reddit/Discord approach — not connected
- Verify official subreddit ownership, community rules, mod roster and sources policy before displaying links. Proposed pinned posts: GAH start, how to cite source, open receipts, corrections and survivor protection.
- Use Reddit for original posts that comply with each subreddit's promotion, attribution and spam policies; no unsolicited bulk cross-posting or invented moderator privileges.
- Launch Discord only after moderation coverage and real participant need; require named rules, roles, anti-abuse safeguards and report controls. No implied privacy.

## Test criteria
- /community, /forum, /tips, /, /latest, /investigations return 200.
- Community page mailto links target same published GAH address; no automatic submissions.
- On-site discussion, official Reddit and Discord all clearly unlaunched/unverified.
- /community has canonical and sitemap entry, is AD-EXCLUDE and index,follow.
- No private account data or victim-identifying details. Existing staging Access remains protected.
