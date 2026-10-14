# GAH Issue #57 — PayPal sandbox lifecycle acceptance

**Acceptance date:** October 14, 2026 (UTC)  
**Owner-directed scope:** PayPal sandbox only. The original live-PayPal and Patreon wording is superseded for this closeout. Live checkout remains disabled; no real charge was authorized or made.

## Results

| Gate | Evidence | Result |
|---|---|---|
| Buyer approval | Sandbox subscription `I-T6T60N8DTVCF`, plan `P-19H94217W5518663XNLECR2Q`, became `ACTIVE`; sandbox last payment USD 5.99 at `2026-10-14T16:03:32Z` | PASS |
| Signed webhook | Genuine PayPal sandbox `BILLING.PLAN.UPDATED` callbacks reached the Worker from PayPal, passed PayPal's `verify-webhook-signature` API, returned HTTP 200, and were recorded in D1 | PASS |
| Webhook idempotency | Replayed event `WH-7AF54498AE0068438-2GF0008412733613R`; D1 retained exactly one row for the event ID | PASS |
| Cancellation | PayPal sandbox cancel API returned HTTP 204; provider subscription status is `CANCELLED`, updated `2026-10-14T16:10:25Z` | PASS |
| Cancellation event | Provider event `WH-7SX28906193447914-2AE27011WU959353Y` is `BILLING.SUBSCRIPTION.CANCELLED` for the subscription; resend was accepted with HTTP 202 | PASS |
| Access revocation | D1 active member sessions for the subscription: 0; unauthenticated `/members` returns HTTP 302 to `/membership?auth=required&return_to=%2Fmembers` | PASS |
| Live safety | `operator_live_checkout_flag:false` and `live_customer_checkout_available:false` | PASS |

The USD 5.99 payment above is PayPal sandbox simulated value, not real money.

## Defect found and fixed

Cloudflare Workers rejects `fetch(..., {redirect:"error"})` at runtime. Sandbox PayPal requests now use `redirect:"manual"` and continue to fail closed on every non-2xx response. Webhook verification also preserves the exact received event bytes when embedding `webhook_event` in PayPal's verification request; parsed JSON is not reserialized.

The permanent sandbox webhook uses provider-side signature verification before D1 writes and never grants production membership. Non-subscription signed events are recorded without entitlement changes.

## Verification

- Focused exact-body webhook regression: PASS.
- Existing PayPal sandbox security/transaction regression: 9/9 PASS.
- Full Phase0 regression after the fix: **50/50 suites PASS**.
- Signed provider callback: PayPal sandbox -> Cloudflare Worker HTTP 200 -> D1 event row.
- Replay count: one D1 row for one provider event ID.
- Provider subscription read after cancellation: `CANCELLED`; last simulated payment remains USD 5.99.
- Production member route remains protected and live checkout remains off.

## Deferred by owner scope

A live PayPal customer charge/refund and Patreon lifecycle were not run. They require separate explicit authorization; this change does not enable either path.
