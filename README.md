# Grok Archive Hub front door

Cloudflare Pages project bound to `grokarchivehub.com`.

- Reader-facing routes are served from this repository.
- `/wiki` redirects to `/grok-command-v4`.
- Existing wiki, evidence, search, Barak, archive-record, and API routes are
  proxied to `wiki.grokarchivehub.com` by `_worker.js`.

Deployment task: `GAH-FRONTDOOR-002`.

## Video and YouTube infrastructure

Video publication is dormant by default. The canonical registry is
`content/video-registry.json`; generated public artifacts are produced with:

```bash
node scripts/build-video-pages.mjs
node scripts/build-video-pages.mjs --check
node scripts/video-regression.mjs
```

The checked-in registry must not contain Google OAuth credentials, refresh
tokens, access tokens, or unpublished source-media paths. Draft, private,
unlisted, scheduled, failed, and archived video records do not generate public
watch pages or video sitemap entries.

Local YouTube tooling lives under `scripts/youtube/`. Credential defaults:

- OAuth client: `~/.config/gah-youtube/client_secret.json`
- OAuth token: `~/.config/gah-youtube/token.json`

Run:

```bash
node scripts/youtube/auth-status.mjs
```

If the token is absent, the script reports `AUTHORIZATION_REQUIRED` and the
local bootstrap command. Upload, thumbnail, caption, update, playlist, and
registry-sync scripts default to dry run and require `--execute`; no YouTube
write action may proceed until the authenticated channel verifies as
`Grok Archive Hub`.
