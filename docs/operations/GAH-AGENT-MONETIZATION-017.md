# GAH-AGENT-MONETIZATION-017

2026-11-17. Preserve all public research, membership, SEO, consent, analytics, and source-identity boundaries. The live scan is not a substitute for functional protocol conformance.

## Implemented: Web Bot Auth

The apex directory serves an Ed25519 public JWKS with RFC 9421 signatures over the request authority, content type and body digest. The dedicated signing key is stored as a Pages secret `GAH_WEB_BOT_AUTH_JWK`, never in Git, public output, or the OAuth/payment credentials. Missing or invalid keys fail closed. The operator-only `scripts/gah-signed-status-agent.mjs` signs a real, bounded, public archive-status GET, with a 60-second expiry, nonce, and signed Signature-Agent. No external paid requests, automatic payment, user credential access or private routes. BotBase registration and approval are distinct from cryptographic verification; do not claim verified bot status until approved. Rotation requires publishing the new public key and updating the agent signer together, with a separate controlled key-rotation release.

## Actual payment path: Cloudflare

- Pay Per Crawl is a separate closed beta. Owner must enable zone visibility, accept terms and complete dedicated Stripe Connect payout onboarding. Charge only eligible, publisher-owned editorial content for authorized uses; leave search engines, reference/grounding access, public source documents, and privacy/security endpoints free. Preserve training prohibitions and existing content signals. Do not assign pricing or enable charge rules without owner approval. See https://developers.cloudflare.com/ai-crawl-control/features/pay-per-crawl/use-pay-per-crawl-as-site-owner/.
- Monetization Gateway (x402 v2) is a separate closed beta. Owner eligibility, terms, screened receiving wallet and price are required. Configure a narrow GET-only rule on a future premium batch export, not `/mcp`, `/api/search`, public sources, protected identities or member endpoints. Verify `PAYMENT-CONTEXT` JWT via pinned `https://payments.cloudflare.com/certs`, Ed25519, exact audience, time and authorized amount. Never accept client-supplied payment headers as proof or set settlement for failures. See https://developers.cloudflare.com/monetization-gateway/configuration/payment-validation/.
- ACP and UCP require actual catalog/checkout/fulfillment; AP2 requires verified signed mandates and receipts. MPP discovery must describe actual payable operations; the existing approved $5.99/month plan is not approval for an unrelated one-off charge. Do not publish scanner-only documents or advertise nonexistent capabilities. Existing PayPal hosted links and Patreon access are untouched.

## OAuth and Auth.md

Current public API intentionally requires no credentials. Separate agent authorization from private operator Access, Patreon, PayPal, membership and analytics. Use Cloudflare's reviewed Workers OAuth Provider for an isolated read-only protected resource with PKCE, real consent, revocation, audience and scope enforcement; do not advertise the operator Access issuer or a fake JWKS. RFC 8414 JWKS is optional for opaque tokens, but the requested scanner may expect one. A real Auth.md registration/claim flow requires isolated registration state, credential expiry, abuse/rate limiting, verification and revocation; no open signup against existing member DB. Publish discovery only after end-to-end credential flow and rejection tests. Sources: https://developers.cloudflare.com/agents/model-context-protocol/protocol/authorization/ ; https://github.com/workos/auth.md ; https://www.rfc-editor.org/rfc/rfc8414 ; https://www.rfc-editor.org/rfc/rfc9728.

## Acceptance

Run `node tests/test_web_bot_auth_017.mjs`, CI identifier gate, exact-ID and existing discovery regression checks, verify signed directory against the public key, perform only the no-charge signed status GET, and rerun the passive scanner. No registration or payment probing in production.
