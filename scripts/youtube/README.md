# Grok Archive Hub YouTube Tooling

These scripts are local-only infrastructure for the `Grok Archive Hub` YouTube channel.

Credential defaults:

- OAuth client: `~/.config/gah-youtube/client_secret.json`
- OAuth token: `~/.config/gah-youtube/token.json`
- Verified channel record: `~/.config/gah-youtube/channel.json`

Overrides:

- `GAH_YOUTUBE_CLIENT_SECRET`
- `GAH_YOUTUBE_TOKEN`
- `GAH_YOUTUBE_CHANNEL_RECORD`

Safety rules:

- No script prints client secrets, access tokens, refresh tokens, authorization codes, or complete token JSON.
- Write scripts default to dry run and require `--execute`.
- Write scripts must verify the authenticated channel title is `Grok Archive Hub` before any API mutation.
- Upload defaults are private, made-for-kids false, and notify-subscribers false.
- No script posts to X. Video publication creates only queue-ready metadata for the existing X workflow.

OAuth status:

```bash
node scripts/youtube/auth-status.mjs
```

If the token is absent, bootstrap locally:

```bash
node scripts/youtube/oauth-bootstrap.mjs --execute
```

Do not paste authorization codes or token JSON into shared logs.

Dry-run upload example:

```bash
node scripts/youtube/upload-video.mjs \
  --registry-id RECORD_ID \
  --source /path/to/reviewed-video.mp4
```

Live upload remains disabled in this dormant infrastructure branch until the token exists, channel verification passes, and a reviewed execution adapter is enabled.
