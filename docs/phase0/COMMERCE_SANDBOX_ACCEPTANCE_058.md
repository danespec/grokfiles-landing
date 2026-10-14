# GAH-COMMERCE-058 — Owner-authorized PayPal sandbox recurring acceptance

**Scope:** PayPal **sandbox only**; test simulated buyer subscription for the established USD $5.99 monthly All Access plan. Explicit owner authorization: October 14, 2026. Live payments and production membership unlock stay OFF.

## Implementation
- New protected POST path: `/api/commerce/paypal/sandbox/subscription-test`, actions `create`, `status`, and `cancel`.
- Only a separate 256-bit hex bearer `GAH_SANDBOX_TEST_TOKEN` (Pages encrypted secret) authenticates. It is *not* the existing global admin credential; token has no access to site administration or live payment APIs.
- Deny absent/wrong credential with 401 before any provider/DB call; deny while `PAYPAL_LIVE_CHECKOUT_ENABLED=true`; require `confirm_sandbox:true`. Strict JSON-size cap; no GET mutations, no CSRF cookie, no token logging.
- Enforce the **sandbox** D1 plan row, product SKU, $5.99 USD and one-month provider plan. OAuth and subscription APIs use ONLY `api-m.sandbox.paypal.com`; the returned approval URL must be on the PayPal sandbox hostname.
- Creation is provider-idempotent using a fixed PayPal-Request-Id for this single owner acceptance run. No capture endpoint exists. Buyer must separately approve using PayPal sandbox credentials; pending approval does not grant access.
- Status returns provider subscription status and last-payment existence/amount check but excludes buyer PII. Cancel accepts only the subscription with matching sandbox plan and exact `gah-sandbox-058-diagnostics` custom ID; cannot cancel unrelated subscriptions.
- This route **never enables real billing**, creates a live PayPal subscription, sends an email, grants paid content, or changes `PAYPAL_LIVE_CHECKOUT_ENABLED`.

## Tested
- Local isolated provider mocks: 9/9 security/transaction groups PASS, covering wrong token, disabled on live flag, explicit sandbox confirmation, correct plan and approval URL, provider idempotency, status, unrelated-plan cancellation rejection, sandbox cancellation and malicious URL rejection. Zero external provider requests in mocks.
- Independent full Phase0 suite **47/47** PASS locally prior to release.
- Still requires actual sandbox provider approval and provider-signed sandbox webhook + D1 state evidence. A synthetic pass is **not** actual subscription acceptance.

## Deploy and rollback
- Stage code under existing owner-only Access, retaining staging auth; then production code rollout with **live checkout and auto advertising disabled**, exact 058 Worker change against approved release. Compare artifact tree excluding Worker and tooling before deploy.
- The operator token must be generated cryptographically and stored in a macOS owner-only 0600 file; send it to Cloudflare via Wrangler stdin only. Do not log, commit, print, or send it in chat. For temporary operator use, send token to curl via stdin configuration rather than shell argv.
- After provider test, remove the temporary endpoint and dedicated token and redeploy the prior vetted Worker, unless owner separately approves permanent administration capability.
- On any unexpected production regression, roll back immediately to the previously verified release artifact.

## Mandatory post-approval acceptance
Verify signed PayPal webhook delivery using actual provider event and current signature verification, D1 idempotency, subscriber ACTIVE transition and later cancellation/revocation. The sandbox webhook deliberately never grants real paid access. Patreon true-tier test and LIVE $5.99 charge, refund, and signed webhook remain separate operator-approved future gates; no real charge is authorized by this sandbox-only test.
