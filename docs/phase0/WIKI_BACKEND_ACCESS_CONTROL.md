# SEC-PATH-LEAK-001 — Wiki Backend Access Control Investigation

**Date:** 2026-10-10
**Method:** Safe, read-only POST requests to `https://wiki.grokarchivehub.com/api/search`

## Findings

### 1. X-GAH-Internal-Wiki-Proxy is NOT authentication

| Test | Result |
|---|---|
| Request WITHOUT the header | ✅ `{"ok":true, ...}` (search works) |
| Request WITH wrong header value (`wrong-value`) | ✅ `{"ok":true, ...}` (search works) |
| Request WITH correct header (`apex-proof-layer`) | ✅ `{"ok":true, ...}` (search works) |

**Conclusion:** The wiki backend does NOT validate the `X-GAH-Internal-Wiki-Proxy`
header. It is not treated as authentication. The header is informational only.

### 2. The /api/search endpoint is publicly accessible

Anyone who knows the URL `https://wiki.grokarchivehub.com/api/search` can query
the search backend directly, bypassing the apex Worker's:
- Rate limiting (the DO throttle)
- Credential stripping (irrelevant here — search doesn't need credentials)
- Path sanitization (the SEC-PATH-LEAK-001 fix)
- Access logging and monitoring

### 3. Security implications

**Do NOT rely on the static header as a security boundary.** It provides zero
access control.

The wiki backend MUST have independent access controls:
- **Option A (recommended):** Restrict `/api/search` to Cloudflare-trusted
  sources. If the wiki backend is behind Cloudflare, use WAF rules or
  Access policies to allow only the apex Worker's egress IPs.
- **Option B:** Require a secret token (not a static public header) that the
  apex Worker sends and the wiki backend validates. Rotate regularly.
- **Option C:** mTLS between apex and wiki backend.

**At minimum:** The wiki backend should validate that requests come from the
apex Worker, not from arbitrary internet clients.

## Recommendations

1. **Immediate:** Implement one of the options above before production.
2. **The apex path sanitization (SEC-PATH-LEAK-001) remains necessary** as
   defense in depth, but it does not prevent direct backend access.
3. **Audit wiki backend logs** for direct (non-apex) access to `/api/search`.

## What this does NOT affect

- The apex Worker's credential stripping (still valid — it prevents credential
  forwarding on the proxied hop).
- The DO rate limiter (still valid — it throttles at the apex edge).
- These are defense-in-depth at the apex; the backend needs its own controls.
