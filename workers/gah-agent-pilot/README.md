# GAH-018 — isolated agent authorization and payment validation

The dedicated production Worker gah-agent-auth-018 has been provisioned with separate KV and SQLite Durable Object storage. Production is enabled with ten narrow Worker route patterns and four owner-provisioned encrypted secrets. Deployment version 8782fa80-3cc4-413b-a2eb-9b21bd2e9ff7. Public archive access remains free.

## Tested functionality

Run npm ci && npm test in this directory. The three local suites cover anonymous registration, signed ES256 assertions, OAuth JWT bearer exchange, access-token and registration revocation, expiry, rate limits, resource and scope binding, interactive authorization code with S256 PKCE, explicit browser consent, and negative payment-context signature tests. Tests do not collect reader identities or charge money.

The resource identifier is the HTTPS site origin; the sole scope is archive:status, enforced exclusively at /api/agent/v1/status. No token authorizes another GAH route. The Worker fetches only the public archive-status JSON via the canonical Pages production hostname and rejects redirects using redirect:manual (Cloudflare Workers does not implement redirect:error). Interactive OAuth uses a separate preapproved client and anonymous browser consent, not GAH user identity. Anonymous agent registration does not support human account claiming, ID-JAG or verified email. No claim endpoint is advertised. The scanner detects anonymous registration via self-contained Auth.md and passes it, with a warning that machine-readable agent_auth claim metadata is incomplete. Full human-account claim interoperability remains unimplemented. Auth.md documents the actual supported flow rather than promising capabilities not implemented.

## Activation gate

The deployed Worker must have four dedicated encrypted secret bindings: AGENT_ASSERTION_JWK (private P-256 ES256 JWK), AGENT_RATE_SECRET, AGENT_CONSENT_BINDING_SECRET, and AGENT_PROVISION_TOKEN. The three non-key secrets must each be independent high-entropy values. Never use the Web Bot Auth signing key, member credentials, or payment secrets. Owner provisioned all four encrypted secrets; verified via names-only secret listing. The Worker configuration now declares all four required names as a deployment preflight. Install them directly in the Cloudflare dashboard under this Worker’s Settings > Variables and Secrets, using type Secret. Do not share the values in chat or commit them.

Production activation completed 2026-11-17. OAuth discovery, PRM and anonymous Auth.md scanner checks pass. Live anonymous registration, assertion verification, token exchange, actual protected archive-status retrieval, wrong-resource rejection and token/registration revocation passed. The interactive PKCE lifecycle passed locally but not with a real production client; it requires operator provisioning. Passive scanner tests must not POST to registration endpoints. Confirm discovery metadata, the public JWKS, uncredentialed 401, scope rejection, revocation, existing public archive routes and analytics. Rollback: remove only the new Worker routes and set AGENT_PILOT_ENABLED=false.

Required route patterns on grokarchivehub.com:

- /auth.md*
- /.well-known/oauth-authorization-server*
- /.well-known/oauth-protected-resource*
- /.well-known/jwks.json*
- /agent/identity*
- /authorize*
- /oauth2/token*
- /oauth2/revoke*
- /operator/agent-clients*
- /api/agent/v1/status*

The Worker enforces an exact path allowlist, HTTPS apex issuer, request method and credential scope. Do not route /api/*, /.well-known/* or the entire domain to this Worker. Keep workers.dev and preview URLs disabled. Monitor quotas, KV propagation and code-flow revocation consistency. The local test fixture must never be deployed.

## Payment gate

Cloudflare Monetization Gateway approval, verified recipient wallet, approved price and currency, exact premium route, and settlement/replay/fulfillment tests remain required. The payment verifier is inert. No live checkout, settlement, charge, entitlement, or commerce discovery claims are enabled. Pay Per Crawl requires separate onboarding. Existing Patreon and PayPal remain unchanged.
