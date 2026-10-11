# SEC-PATH-LEAK-001 — Wiki Backend Remediation Required

**For:** Thomas / ChatGPT (wiki backend is not in this repo)
**Date:** 2026-10-10

## Problem

The wiki backend at `wiki.grokarchivehub.com` returns internal filesystem paths
in search API responses. Observed 2026-10-10:

```json
{
  "hits": [{
    "title": "EFTA00500001",
    "summary": "SourcePDF: /Volumes/homes/admin/DOJ_Epstein/_incoming/...",
    "read_url": "/archive/EFTA00500001"
  }]
}
```

The `/Volumes/homes/admin/DOJ_Epstein/...` path reveals:
- NAS mount structure (`/Volumes/homes/`)
- OS username (`admin`)
- Directory organization (`DOJ_Epstein/_incoming/`)

## Apex defense (done)

The apex Worker (`_worker.js`, `sanitizePublicSearchValue`) now redacts embedded
filesystem paths as defense in depth. See `tests/test_path_leak.mjs` (27 checks).

## Wiki backend fix (required at source)

The wiki backend should **never emit internal paths** in API responses. Fix at
the source:

1. **Strip `SourcePDF:` prefixes** containing local paths from summaries, OR
   replace with the public `read_url` / Bates identifier.
2. **Audit all API response fields** for:
   - `/Volumes/...`, `/Users/...`, `/mnt/...`, `/volumeN/...`
   - `/homes/...`, `/home/...`
   - Windows paths (`C:\...`, `D:\...`)
   - Any absolute filesystem path
3. **Replace with:** the EFTA Bates ID (e.g., `EFTA00500001`) or the public
   `read_url` (e.g., `/archive/EFTA00500001`).

**Rationale:** Defense in depth is not a substitute for fixing the source.
The apex redaction is a safety net; the wiki backend must not leak paths
in the first place.

## Verification

After the wiki backend fix, re-run:
```bash
curl -X POST "https://wiki.grokarchivehub.com/api/search" \
  -H "Content-Type: application/json" \
  -H "X-GAH-Internal-Wiki-Proxy: apex-proof-layer" \
  -d '{"q":"EFTA00000001","limit":5,"no_ai":true}' | grep -i "volumes\|/users/\|/mnt/\|/homes/"
# Expected: no matches
```
