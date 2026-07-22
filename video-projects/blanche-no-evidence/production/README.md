# Rough-Cut Production Workflow

Status: dormant local rendering workflow. Generated media must stay outside Git.

This directory defines the local rough-cut process for:

`"No Evidence" Does Not Mean "No Records" — What DOJ Actually Said`

The rough cut is for editorial and pacing review only. It is not a publication master, not a YouTube upload artifact, and not an X publication asset.

## Output

Default output directory:

`/Users/thomas/Library/Mobile Documents/com~apple~CloudDocs/GAH Reviews/GAH-VIDEO-PILOT-001/ROUGH-CUT/`

Expected rendered files:

- `GAH-VIDEO-PILOT-001-ROUGH-CUT.mp4`
- `GAH-VIDEO-PILOT-001-ROUGH-CUT.en.vtt`
- `rough-cut-review.html`
- `rough-cut-manifest.json`
- `rough-cut-checksums.txt`
- `frame-contact-sheet.jpg`
- `REVIEW-INSTRUCTIONS.md`

## Render

```bash
node video-projects/blanche-no-evidence/production/render-rough-cut.mjs
```

The renderer requires local `ffmpeg`, `ffprobe`, `node`, and macOS `say`. It does not download dependencies and does not call YouTube, X, or deployment APIs.

Optional overrides:

- `FFMPEG_BIN`
- `FFPROBE_BIN`
- `GAH_ROUGH_CUT_EXPORT_DIR`
- `GAH_ROUGH_CUT_WORK_DIR`

## Verify

```bash
node video-projects/blanche-no-evidence/production/verify-rough-cut.mjs
```

Verification checks the MP4 container, H.264 video, AAC audio, 1920x1080 frame size, captions, source posture, rough-cut watermark plan, generated-media location, and credential exclusion.

## Source-Posture Rules

- Official Senate source material is separate from the official caption source.
- GAH hearing-exchange summaries are not complete certified transcripts.
- Only `Q-VP-001` through `Q-VP-004` are human-audio-certified exact short quotations.
- Editorial interpretation must be labeled separately from all source material.
- The rough cut must show `ROUGH CUT — NOT FOR PUBLICATION` at the opening and as a persistent corner watermark.

## Non-Actions

- No YouTube upload.
- No YouTube API write.
- No X post.
- No public watch page.
- No deployment.
- No generated media committed to Git.
