import assert from "node:assert/strict";

const mod=await import(new URL("../_worker.js?paypal-sandbox-webhook-raw-057",import.meta.url));
const worker=mod.default;
const eventId="WH-RAW057-ABCDEFGH";
const raw=' { "event_type":"BILLING.PLAN.UPDATED", "id":"'+eventId+'", "resource": { "id":"P-ABCDEF0123456789" } } ';
let verifierBody="",eventInsert=null;
const oldFetch=globalThis.fetch;

globalThis.fetch=async (url,options={})=>{
  const value=String(url);
  if(value.endsWith("/v1/oauth2/token")){
    assert.equal(options.redirect,"manual","Worker-compatible sandbox OAuth must reject redirects manually");
    return Response.json({token_type:"Bearer",access_token:"sandbox-token-long-enough",expires_in:3600});
  }
  if(value.endsWith("/v1/notifications/verify-webhook-signature")){
    assert.equal(options.redirect,"manual","Worker-compatible webhook verification must reject redirects manually");
    verifierBody=String(options.body||"");
    assert.ok(verifierBody.endsWith('"webhook_event":'+raw+"}"),
      "provider verification must embed the exact signed event bytes");
    return Response.json({verification_status:"SUCCESS"});
  }
  throw Error("Unexpected provider request: "+value);
};

const db={
  prepare(sql){
    if(/SELECT \* FROM gah_paypal_plans/.test(sql)){
      return {bind(){return {first:async()=>({
        environment:"sandbox",plan_id:"P-ABCDEF0123456789",
        sku:"gah-research-access-monthly",price_minor:599,currency:"USD"
      })}}};
    }
    if(/INSERT OR IGNORE INTO gah_paypal_webhook_events/.test(sql)){
      return {bind(...values){eventInsert=values;return {sql,values}}};
    }
    throw Error("Unexpected SQL: "+sql);
  },
  async batch(statements){
    assert.equal(statements.length,1);
    return [{success:true}];
  }
};

const env={
  ASSETS:{fetch:async()=>new Response("not-found",{status:404})},
  PAYPAL_SANDBOX_CLIENT_ID:"synthetic-client",
  PAYPAL_SANDBOX_CLIENT_SECRET:"synthetic-secret",
  PAYPAL_SANDBOX_WEBHOOK_ID:"96469065C43881637",
  MEMBERS_DB:db
};

try{
  const response=await worker.fetch(new Request(
    "https://grokarchivehub.com/api/commerce/paypal/sandbox/webhook",{
      method:"POST",
      headers:{
        "content-type":"application/json",
        "paypal-transmission-id":"057-raw-payload-test",
        "paypal-transmission-time":new Date().toISOString(),
        "paypal-transmission-sig":"signature-long-enough",
        "paypal-cert-url":"https://api.sandbox.paypal.com/v1/notifications/certs/CERT-test-057",
        "paypal-auth-algo":"SHA256withRSA"
      },
      body:raw
    }),env);
  const body=await response.json();
  assert.equal(response.status,200);
  assert.equal(body.signature_verified,true);
  assert.equal(body.recorded,true);
  assert.equal(body.membership_access_granted,false);
  assert.ok(verifierBody.includes('"webhook_id":"96469065C43881637"'));
  assert.deepEqual(eventInsert.slice(0,3),[eventId,"sandbox","BILLING.PLAN.UPDATED"]);
  assert.equal(eventInsert[5],null);
  console.log("PASS exact PayPal sandbox webhook bytes preserved for signature verification");
  console.log("PASS verified unrelated provider event is recorded without granting membership");
} finally {
  globalThis.fetch=oldFetch;
}
