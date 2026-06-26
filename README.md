# Grok Archive Hub front door

Cloudflare Pages project bound to `grokarchivehub.com`.

- Reader-facing routes are served from this repository.
- `/wiki` redirects to `/grok-command-v4`.
- Existing wiki, evidence, search, Barak, archive-record, and API routes are
  proxied to `wiki.grokarchivehub.com` by `_worker.js`.

Deployment task: `GAH-FRONTDOOR-002`.
