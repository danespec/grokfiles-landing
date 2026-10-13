# GAH-COMMERCE-ACCEPTANCE-014 — Payment and Membership Release Gates

Status as independently observed on **2026-10-13 UTC**. This is an evidence-backed release checklist, **not** merchant signoff or approval to charge customers.

## Production public-service observations

- `GET /api/commerce/paypal/live/launch-status`: HTTP 200, `live_client_id_present`, `live_client_secret_present`, `live_webhook_id_present`, `resend_key_present`, `membership_db_present`, `session_signing_key_present`, `live_product_created`, `live_plan_created`, and `fixed_price_valid` are true. The configured plan is $5.99 USD per month.
- `operator_live_checkout_flag=false`, `live_customer_checkout_available=false`, `first_real_customer_transaction_tested=false`, `webhook_live_delivery_tested=false`, `sandbox_buyer_approval_tested=false`. **Never describe these as completed.**
- `GET /api/commerce/paypal/plan-status`: sandbox product and plan are provisioned, but buyer subscription creation and checkout remain disabled.
- `GET /api/commerce/providers`: the preexisting hosted PayPal and Venmo links support visitor-initiated donations, not paid membership entitlements. Existing support links must never become a substitute for a verified subscription.
- `GET /api/commerce/paypal/readiness` is a **legacy sandbox-preparation** compatibility report; some fields describe older functionality. For live authorization decisions, use the more specific `/live/launch-status` plus explicit real events and provider/merchant records, **not** the older combined readiness schema.

## CI regression evidence

All checks run offline, use synthetic provider data only, and cannot create PayPal orders, send money, or change a real member account.

1. Patreon mock OAuth state and callback validate expected entitled tier and signed member cookie.
2. Patreon mock access revocation rejects an inactive/declined membership immediately.
3. Patreon mock webhook idempotency covers duplicate events, cancellation-like revocations and database-retry semantics without deleting protected records.
4. PayPal disabled checkout and disabled live member login return fail-closed responses.
5. PayPal unauthenticated bootstrap and missing webhooks reject before provider or DB access.
6. PayPal webhook event-branch invariants include subscription activation/cancellation/suspension/expiry/failure and sale completion/refunds/reversals; static branch checks are **not** end-to-end webhook proof.
7. No network operations or financial transactions occur in the test suite.

These were previously excluded from `tests/run_phase0_regression.sh`; the 014 release adds all three suites, increasing **21 → 24**. Changes are isolated to tests, documentation, and the CI workflow display label. No production Worker, payment credentials, account status, products, pricing, or Cloudflare flag changes are in this PR.

## Mandatory owner/provider acceptance before enabling live checkout

| Gate | Status | Acceptance evidence required |
| --- | --- | --- |
| Configured live product/plan | TECHNICALLY PRESENT | Reconfirm live merchant's $5.99 recurring plan, settlement currency and correct owner account |
| First real buyer approval | BLOCKED/NOT TESTED | Merchant-authorized real test subscription with buyer consent; capture PayPal provider ID and subscription state |
| Signed webhook delivery | BLOCKED/NOT TESTED | Verify provider-created live signature and matching webhook ID for activation and payment |
| Buyer identity, session and entitlement | BLOCKED/NOT TESTED | Verify owner-authorized subscriber sign-in, active provider status and protected-content access |
| Cancellation/suspension | BLOCKED/NOT TESTED | Confirm provider change removes membership entitlement and invalidates sessions |
| Refund/reversal/dispute | BLOCKED/NOT TESTED | Confirm signed provider event plus payment recency/blocked-before timestamp revoke access; prove reactivation requires a new settled payment |
| Idempotency/replay/failure recovery | SYNTHETIC COVERED; LIVE UNVERIFIED | Re-send authorized test event, confirm no duplicate fulfillment; test storage/provider outages |
| Patreon membership lifecycle | SYNTHETIC COVERED; LIVE PROVIDER UNVERIFIED | Authorized account test for tier upgrade, decline, deletion, session and webhook |
| Public paid checkout switch | OFF | **Keep `PAYPAL_LIVE_CHECKOUT_ENABLED` unset/false** until all critical gates above pass and owner approves real charging |

**Not automatically approved:** production checkout activation, any real charge, a new merchant account, refund/dispute mutation, billing-account changes, emails to real customers, or misrepresenting hosted support links as paid membership.

## Other roadmap gates still open

Barak recovered-parent source authenticity, full attachment source provenance, unavailable Source Watch origins, SEO/AdSense site-wide acceptance, and final accessibility/performance security regression. Those are independent of CI green status. Preserve open issues #9, #31, #33, #35, #36 and #37 as appropriate.
