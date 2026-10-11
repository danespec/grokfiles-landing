# Edge, IP headers, and rate-limit budgets (staging)

## IP-header assumptions

Throttle keys are sharded per scope + client IP. The client IP is resolved
by `gahSecClientIp` with this precedence (documented in
`docs/security-remediation/NOTES.md` and verified by handler-level tests):

1. `CF-Connecting-IP` — set by the Cloudflare edge; authoritative when the
   request arrives through Cloudflare.
2. The last entry of `X-Forwarded-For` — fallback for non-Cloudflare paths
   (tests, direct origin hits).
3. `"unknown"` — all requests without a resolvable IP share one throttle key
   (conservative: they throttle each other, never bypass).

**Staging must confirm:** the staging project sits behind the Cloudflare
edge so `CF-Connecting-IP` is present and edge-set (clients cannot spoof
it). If staging is reached directly (bypassing the edge), throttles fall
back to `X-Forwarded-For`/unknown — still safe, but shared keys throttle
more aggressively. This is an operational check for ChatGPT at deploy time.

## Rate-limit budgets

| Scope | Budget | Window | Key |
|---|---|---|---|
| `/api/search` | 60 req | 1 min | IP |
| A2A `message:send` | 30 req | 1 min | IP |
| `/admin/login` | 5 attempts | 15 min | IP |

Budgets are enforced by the `GahSecRateLimiterDO` Durable Object
(`workers/sec-rate-limiter/`), sharded per scope+IP (`idFromName`).
Over budget → 429 with `Retry-After`. Confirm these budgets against
observed staging traffic before production — they are starting values,
not load-tested ones.

## Degradation order

1. DO healthy → exact atomic throttles.
2. DO subrequest throws → KV best-effort (approximate), then fail-open.
3. Binding absent → KV best-effort if bound, else fail-open.
4. Sealed-cookie admin counter always applies (client-resettable; the
   DO/KV counter is authoritative).

A missing or unhealthy binding must never become an outage — see
`staging/smoke-tests/bindings.sh` for the three-state evidence procedure.

## Wiki-host dependency

Search results are proxied from the wiki backend. The upstream host is
`wiki.grokarchivehub.com` unless the `GAH_WIKI_HOST` environment variable
overrides it (staging-only; see `staging/bindings.md`). For contract
testing, point `GAH_WIKI_HOST` at a staging wiki host or a mock backend
that replays recorded fixtures. Production leaves the variable unset.
