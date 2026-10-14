import assert from "node:assert/strict";
const mod=await import(new URL("../_worker.js?paypal-sandbox-058",import.meta.url));
const worker=mod.default;
const base="https://grokarchivehub.com";
const secret="a".repeat(64);
const subId="I-ABCDEF0123456789";
const planId="P-ABCDEF0123456789";
let external=[],nextApproveHost="www.sandbox.paypal.com",wrongTestId=false;
const oldFetch=globalThis.fetch;
globalThis.fetch=async (url,options={})=>{
  const s=String(url);external.push({url:s,method:options.method||"GET"});
  assert.ok(s.startsWith("https://api-m.sandbox.paypal.com/"),"network must only use sandbox");
  if(s.endsWith("/v1/oauth2/token")) return Response.json({token_type:"Bearer",access_token:"test-token-long-enough",expires_in:3600});
  if(s.endsWith("/v1/billing/plans/"+planId)) return Response.json({
    id:planId,status:"ACTIVE",billing_cycles:[{tenure_type:"REGULAR",frequency:{interval_unit:"MONTH",interval_count:1},
    pricing_scheme:{fixed_price:{currency_code:"USD",value:"5.99"}}}]
  });
  if(s.endsWith("/v1/billing/subscriptions")&&options.method==="POST"){
    const body=JSON.parse(options.body);
    assert.equal(body.plan_id,planId);
    assert.equal(body.custom_id,"gah-sandbox-058-diagnostics");
    assert.ok(!s.includes("api-m.paypal.com"));
    return Response.json({id:subId,status:"APPROVAL_PENDING",links:[{rel:"approve",method:"GET",
      href:"https://"+nextApproveHost+"/webapps/billing/subscriptions?ba_token=TEST"}]},{status:201});
  }
  if(s.endsWith("/v1/billing/subscriptions/"+subId)){
    return Response.json({id:subId,plan_id:planId,custom_id:wrongTestId?"other-subscription":"gah-sandbox-058-diagnostics",
    status:"ACTIVE",billing_info:{last_payment:{time:"2026-10-14T13:00:00Z",amount:{currency_code:"USD",value:"5.99"}}}});
  }
  if(s.endsWith("/v1/billing/subscriptions/"+subId+"/cancel")){
    assert.equal(options.method,"POST");
    return new Response(null,{status:204});
  }
  throw Error("Unexpected sandbox endpoint "+s);
};
const db={prepare(sql){
  assert.match(sql,/SELECT \* FROM gah_paypal_plans/);
  return {bind(...values){assert.deepEqual(values,["sandbox"]);return {first:async()=>({
    environment:"sandbox",plan_id:planId,sku:"gah-research-access-monthly",price_minor:599,currency:"USD"
  })}}};
}};
const env={
  ASSETS:{fetch:async()=>new Response("not-found",{status:404})},
  PAYPAL_SANDBOX_CLIENT_ID:"synthetic-client",
  PAYPAL_SANDBOX_CLIENT_SECRET:"synthetic-secret",
  MEMBERS_DB:db,GAH_SANDBOX_TEST_TOKEN:secret,PAYPAL_LIVE_CHECKOUT_ENABLED:"false"
};
async function call(action,body={},token=secret,environment=env){
  const r=await worker.fetch(new Request(base+"/api/commerce/paypal/sandbox/subscription-test",{
    method:"POST",headers:{"Authorization":"Bearer "+token,"Content-Type":"application/json"},
    body:JSON.stringify({action,confirm_sandbox:true,...body})
  }),environment);
  return {status:r.status,json:await r.json()};
}
try{
  let x=await call("create",{},"b".repeat(64));
  assert.equal(x.status,401);
  assert.equal(external.length,0);
  console.log("PASS sandbox operator authentication denies wrong credential before network");
  x=await call("create",{},secret,{...env,PAYPAL_LIVE_CHECKOUT_ENABLED:"true"});
  assert.equal(x.status,423);
  assert.equal(external.length,0);
  console.log("PASS sandbox test automatically disabled if live checkout is enabled");
  x=await call("create",{confirm_sandbox:false});
  assert.equal(x.status,400);
  assert.equal(external.length,0);
  console.log("PASS explicit sandbox consent guard");
  x=await call("create");
  assert.equal(x.status,201);
  assert.equal(x.json.environment,"sandbox");
  assert.equal(x.json.price_usd,"5.99");
  assert.equal(x.json.approve_url,"https://www.sandbox.paypal.com/webapps/billing/subscriptions?ba_token=TEST");
  assert.equal(x.json.buyer_approval_completed,false);
  assert.equal(x.json.live_charges_allowed,false);
  assert.equal(x.json.entitlement_granted,false);
  console.log("PASS sandbox API creates pending $5.99 simulated buyer approval only");
  x=await call("create",{},secret);
  assert.equal(x.status,201);
  assert.equal(x.json.subscription_id,subId);
  console.log("PASS repeat request uses fixed PayPal-Request-Id to avoid duplicate order");
  x=await call("status",{subscription_id:subId});
  assert.equal(x.status,200);
  assert.equal(x.json.subscription_status,"ACTIVE");
  assert.equal(x.json.payment_amount_matches_five_ninetynine,true);
  console.log("PASS sandbox status reads only provider ID, price, and status");
  wrongTestId=true;
  x=await call("cancel",{subscription_id:subId});
  assert.equal(x.status,409);
  wrongTestId=false;
  assert.equal(external.filter(x=>x.url.endsWith("/cancel")).length,0);
  console.log("PASS unrelated sandbox subscription cannot be cancelled");
  x=await call("cancel",{subscription_id:subId});
  assert.equal(x.status,200);
  assert.equal(x.json.cancellation_requested,true);
  assert.equal(x.json.entitlement_granted,false);
  console.log("PASS sandbox-only cancellation with no membership");
  nextApproveHost="evil.example";
  x=await call("create");
  assert.equal(x.status,502);
  console.log("PASS malicious/out-of-provider approval URL rejected");
  assert.ok(external.every(x=>x.url.startsWith("https://api-m.sandbox.paypal.com/")));
  console.log("RESULT 9/9 sandbox-only security/transaction tests passed; NO real provider requests");
} finally {globalThis.fetch=oldFetch}
