# GAH-COMMUNITY-002 — Production gateway release

Date: October 18, 2026.

## Verified online forum

GitHub repository Discussions enabled for public danespec/grokfiles-landing; administrator identity verified as danespec. Public discussion index: https://github.com/danespec/grokfiles-landing/discussions

- Welcome / Code of Conduct: https://github.com/danespec/grokfiles-landing/discussions/120 (Announcements, verified locked)
- Gratitude America financial source check: https://github.com/danespec/grokfiles-landing/discussions/121 (Q&A, open)
- Doe v. Black October dismissal order check: https://github.com/danespec/grokfiles-landing/discussions/122 (Q&A, open)
- Phang ECF 42 / ECF 59 docket check: https://github.com/danespec/grokfiles-landing/discussions/123 (Q&A, open)

Category forms on default branch: General, Q&A, Ideas; published code of conduct linked to welcome. Posts are immediately public, not reviewed before appearing. Owner-controlled moderation can lock/remove posts. No second moderator yet verified.

GitHub repo interaction limit: existing_users for three days, ending **October 21, 2026, 22:18:03 UTC**. This restricts accounts created less than 24 hours earlier, and may affect Issues/PRs too. Expiry confirmed using the GitHub repository interaction-limits API.

GAH website pages updated: /forum, /community, /latest, homepage, three case investigations. /forum and /community are ad-excluded and indexable by local metadata; validate actual Cloudflare headers after deployment.

No changes to auth, member payments, staging Access, private backend, data storage, Reddit accounts, Discord servers or user credentials. Do not interpret GitHub forum as a secure whistleblower channel.

## Operational rollback

Revert the GAH forum gateway release through Pages, remove link if social moderation fails, lock harmful discussions; repository administrator may disable GitHub Discussions. External archived copies cannot be guaranteed removed.

## Acceptance tests

- Worker JS syntax; HTML hierarchy and all four GitHub links; source pages remain intact.
- Github GraphQL demonstrates hasDiscussionsEnabled=true; welcome locked, three Q&A discussions unlocked.
- Public GitHub Discussions URL HTTP 200. Pages route /forum, /community, Home/Latest, three source articles HTTP 200.
- /forum accurately discloses public posting, GitHub identity, privacy limits, rate-control pilot.
- Former contact email composer still functions and no source tips are auto-published.
- Website routes indexable when intended, ads excluded. No duplicate/imaginary Reddit/Discord links.

## Search indexing correction
The legacy route table still contained /forum under UTILITY_NOINDEX_EXACT_PATHS (private-communication-shell). This is now a public editorial gateway and is removed from that old noindex treatment. /forum is added to CORE_SITEMAP_ENTRIES while retaining AD-EXCLUDE. Verify actual live policy headers and meta robots after deployment.
