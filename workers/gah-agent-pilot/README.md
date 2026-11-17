# GAH-018 — isolated agent authorization and payment validation

The dedicated production Worker gah-agent-auth-018 has been provisioned with separate KV and SQLite Durable Object storage. It is disabled and has no public routes until signing and provisioning credentials are configured. Public archive access remains free.

## Tested functionality

Run npm ci && npm test in this directory. The three local suites cover anonymous registration, signed ES256 assertions, OAuth JWT bearer exchange, access-token and registration revocation, expiry, rate limits, resource and scope binding, interactive authorization code with S256 PKCE, explicit browser consent, and negative payment-context signature tests. Tests do not collect reader identities or charge money.

The sole scope is archive:status. Interactive OAuth uses a separate preapproved client and anonymous browser consent, not GAH user identity. Anonymous agent registration does not support human account claiming, ID-JAG or verified email. No claim endpoint is advertised. Full anonymous Auth.md claim interoperability remains incomplete: the requested scanner profile also expects a working claim URI. Do not report a scanner pass until validated. Auth.md documents the actual supported flow rather than promising capabilities not implemented.

## Activation gate

The deployed Worker must have four dedicated encrypted secret bindings: AGENT_ASSERTION_JWK (private P-256 ES256 JWK), AGENT_RATE_SECRET, AGENT_CONSENT_BINDING_SECRET, and AGENT_PROVISION_TOKEN. The three non-key secrets must each be independent high-entropy values. Never use the Web Bot Auth signing key, member credentials, or payment secrets. Secure provisioning was not completed. The Worker configuration now declares all four required names as a deployment preflight. Install them directly in the Cloudflare dashboard under this Worker’s Settings > Variables and Secrets, using type Secret. Do not share the values in chat or commit them.

After provisioning, review the exact routes below, enable AGENT_PILOT_ENABLED, deploy and perform an explicitly authorized end-to-end registration and revocation test. Passive scanner tests must not POST to registration endpoints. Confirm discovery metadata, the public JWKS, uncredentialed 401, scope rejection, revocation, existing public archive routes and analytics. Rollback: remove only the new Worker routes and set AGENT_PILOT_ENABLED=false.

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
