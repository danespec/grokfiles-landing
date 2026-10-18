# GAH-COMMUNITY-002 — GitHub Discussions beta moderation and release

**Project:** Grok Archive Hub (GAH) | **Date:** October 18, 2026

## Platform decision

Use GitHub Discussions on the public repository [danespec/grokfiles-landing](https://github.com/danespec/grokfiles-landing/discussions) as an initial, authenticated discussion engine. The admin identity is danespec. This is a low-infrastructure pilot, not a replacement for an independent forum, a confidential source service, or a database-backed moderated submission queue. An independent hosted forum could be considered when there is a sustained volunteer moderation team.

## What the system actually guarantees

- GitHub authentication and GitHub's native discussion moderation: maintainers can delete/hide comments, lock/close threads, and report abuse.
- Public discussions appear when submitted **before human review**; there is no advance moderation approval. The account/profile and writing are visible.
- Discussion category forms request public source IDs, dates, narrow claims, alternative interpretations and privacy affirmations. Forms prompt responsible posting but cannot guarantee accuracy or remove malicious uploads.
- GitHub protects its own session/authentication and renders Markdown; the GAH Cloudflare site does not accept or store public forum posts.
- GAH cannot promise that the owner will monitor every post in real time. No response-time SLA or confidentiality assurances.

## Moderator review workflow

1. Inspect GitHub notification and flagged content while the operator is available; the owner is currently the only verified administrator/moderator.
2. Prioritize removing any survivor identifying information, private data, illegal or nonpublic material, threats, impersonation or suspected protected SAR information. Do not quote/remove-and-repost sensitive material.
3. Lock unsafe discussions immediately, and use GitHub platform reporting or legal/emergency channels for serious abuse. Restore only after content and discussion purpose are safe.
4. For documentary leads, open the *primary* public source and verify the date, page, EFTA/Bates/ECF identifier, scope, provenance and surrounding context. Note bias, alternative readings and what is not proved.
5. Do not promote a discussion into a GAH article until independent editorial review. Link eventual accepted findings and corrections to public articles with dates and citations.
6. Restrict interactions via GitHub's admin controls when abuse spikes. Restriction may impact repository Issues and PRs; document the scope and time window.
7. Handle correction/appeals via the public [GAH Contact](https://grokarchivehub.com/contact) with discussion URLs, *not* reposted private details.

## Privacy and abuse limitations

Public GitHub posts are indexable and may be copied even if deleted. Users must not post any identifying details about anonymous victims or survivors, protected court material, full account numbers, private contact information, access tokens, passwords, illicitly obtained records, or material requiring a protected tip service. Normal email is also not anonymous, confidential or a secure legal intake.

GitHub controls login, public profiles, Markdown rendering, native per-user abuse controls, and moderator permissions. There is no custom Cloudflare UGC database, bypassable unauthenticated write endpoint, or GAH-admin token in client-side scripts.

## Release gates

- Code of Conduct exists on default branch and is linked in Welcome.
- Default General, Q&A and Ideas category forms exist on default branch and match actual live category slugs.
- A welcome discussion is published and locked or pinned; at least two source-linked evidence questions are seeded.
- Owner confirms the new Discussions index loads while signed out and that the owner can create/edit/lock content while signed in.
- Cross-site navigation from /forum and /community links to **actual** forum, states GitHub account required, and explicitly says on-site comments do not exist.
- Public article-specific links point to the actual case investigations; any claims about detailed court documents remain attributed.
- Staging isolation/auth/payment unchanged. Worker JS parser, website static QA, production deployment and route HTTP checks pass.
- Rollback: first remove GAH website links, lock discussions, then disable GitHub Discussions if moderation fails. Do not falsely claim deletion retracts indexed copies.

## Reddit and Discord constraints

No verified official GAH subreddit or Discord server has been established. The previously used GAH Reddit publishing account was reported sitewide banned/shadowbanned in October 2026 with an appeal pending. **Do not create an alternative account or subreddit to evade platform enforcement.** Resume Reddit community work only upon legitimate account restoration and independently verified moderator authority. Discord is deferred until the owner has support for member moderation.

## Next-phase optional roadmap

If GitHub login becomes a meaningful audience barrier, investigate an authenticated managed forum with queue-before-publication, rate limits, moderation reports, retention/deletion handling, accessibility tests, and a data-protection review before changing hosts.
