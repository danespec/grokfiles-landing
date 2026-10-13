import assert from "node:assert/strict";
import fs from "node:fs";

const source=fs.readFileSync(new URL("../_worker.js",import.meta.url),"utf8");
const worker=(await import(new URL("../_worker.js?commerce-release-gates-014",import.meta.url))).default;
const origin="https://grokarchivehub.com";
let externalCalls=0;
const fetchBefore=globalThis.fetch;
globalThis.fetch=async()=>{externalCalls++;throw new Error("EXTERNAL_NETWORK_MUST_NOT_BE_CALLED");};
const env={ASSETS:{fetch:async()=>new Response("missing",{status:404})}};
async function request(path,method="GET",body){
  const options={method};
  if(body!==undefined){options.headers={"content-type":"application/json"};options.body=JSON.stringify(body);}
  const res=await worker.fetch(new Request(origin+path,options),env);
  const parsed=await res.json();
  return {res,parsed};
}
try {
  {
    const {res,parsed}=await request("/api/commerce/paypal/live/launch-status");
    assert.equal(res.status,200);
    assert.equal(parsed.live_customer_checkout_available,false);
    assert.equal(parsed.live_checkout_operator_approved,false);
    assert.equal(parsed.first_real_customer_transaction_tested,false);
    assert.equal(parsed.webhook_live_delivery_tested,false);
    assert.equal(parsed.sandbox_buyer_approval_tested,false);
    assert.equal(parsed.price_usd,"5.99");
    assert.equal(parsed.billing,"MONTH");
    console.log("PASS live checkout is disabled without operator authorization and tests");
  }
  for(const path of [
    "/api/commerce/paypal/live/login/request",
    "/api/commerce/paypal/live/login/verify"
  ]){
    const {res,parsed}=await request(path,"POST",{});
    assert.equal(res.status,503,path);
    assert.equal(parsed.error,"live_paypal_not_enabled");
  }
  console.log("PASS live member login cannot activate when checkout is off");
  {
    const {res,parsed}=await request("/api/commerce/paypal/live/webhook","POST",{event_type:"PAYMENT.SALE.COMPLETED"});
    assert.equal(res.status,503);
    assert.equal(parsed.error,"live_webhook_unconfigured");
  }
  {
    const {res,parsed}=await request("/api/commerce/paypal/live/bootstrap-plan","POST",{});
    assert.equal(res.status,401);
    assert.equal(parsed.error,"operator_auth_required");
  }
  console.log("PASS no unauthenticated live webhook or plan-bootstrap");
  {
    const creds={...env,
      PAYPAL_LIVE_CLIENT_ID:"synthetic-test-only-client",
      PAYPAL_LIVE_CLIENT_SECRET:"synthetic-test-only-secret",
      PAYPAL_LIVE_WEBHOOK_ID:"synthetic-test-only-hook",
      MEMBERS_DB:{prepare(){throw new Error("Database must not be reached for malformed webhook");}}
    };
    const res=await worker.fetch(new Request(origin+"/api/commerce/paypal/live/webhook",{
      method:"POST",headers:{"content-type":"application/json"},
      body:JSON.stringify({id:"synthetic-event",event_type:"PAYMENT.SALE.COMPLETED"})
    }),creds);
    assert.equal(res.status,400);
    assert.equal((await res.json()).error,"invalid_webhook_headers");
  }
  console.log("PASS missing PayPal transmission-signature headers rejected before provider/database");
  {
    const events=[
      "BILLING.SUBSCRIPTION.ACTIVATED","BILLING.SUBSCRIPTION.CANCELLED",
      "BILLING.SUBSCRIPTION.SUSPENDED","BILLING.SUBSCRIPTION.EXPIRED",
      "BILLING.SUBSCRIPTION.UPDATED","BILLING.SUBSCRIPTION.PAYMENT.FAILED",
      "PAYMENT.SALE.COMPLETED","PAYMENT.SALE.REFUNDED","PAYMENT.SALE.REVERSED"
    ];
    const start=source.indexOf("const GAH_090_LIVE_EVENTS=new Set([");
    const end=source.indexOf("]);",start);
    assert.ok(start>=0&&end>start);
    const declared=source.slice(start,end);
    for(const name of events)assert.ok(declared.includes('"'+name+'"'),name);
    assert.match(source,/const GAH_090_ADVERSE_EVENTS=new Set\(\["PAYMENT\.SALE\.REFUNDED","PAYMENT\.SALE\.REVERSED"\]\)/);
    assert.match(source,/verification\.verification_status!=="SUCCESS"/);
    assert.match(source,/const paidSinceBlock=paymentValid&&\(Date\.parse\(paymentTime\)>blocked\)/);
    assert.match(source,/checkout_enabled:String\(env\.PAYPAL_LIVE_CHECKOUT_ENABLED\|\|""\)==="true"/);
    console.log("PASS expected subscription/refund/reversal event branches remain implemented");
  }
  assert.equal(externalCalls,0);
  console.log("PASS 5 commerce release-gate groups, zero external calls or transactions");
} finally {globalThis.fetch=fetchBefore;}
