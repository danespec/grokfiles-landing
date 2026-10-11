import assert from "node:assert/strict";
import {createHmac} from "node:crypto";
const source=new URL("../_worker.js",import.meta.url);
const worker=(await import(source.href+"?idempotency-test")).default;
const secret="SYNTHETIC_WEBHOOK_SECRET_ONLY";
const events=new Map();const members=new Map();
let updates=0,revocations=0,failNextMemberWrite=false,failNextEventLookup=false;
const db={
 prepare(sql){
  return {bind(...args){return {
   async first(){
    if(sql.startsWith("SELECT event_id FROM patreon_webhook_events")){
      if(failNextEventLookup){failNextEventLookup=false;throw Error("TEST_DB_UNAVAILABLE")}
      return events.has(args[0])?{event_id:args[0]}:null;
    }
    return null;
   },
   async run(){return execSql(sql,args)}
  }}, async run(){return execSql(sql,[])}}
 }
};
async function execSql(sql,args){
 if(sql.includes("INSERT OR IGNORE INTO patreon_webhook_events")){
  if(events.has(args[0]))return {success:true,meta:{changes:0}};
  events.set(args[0],{type:args[1],received:args[2]});
  return {success:true,meta:{changes:1}};
 }
 if(sql.startsWith("INSERT INTO patreon_members")){
  if(failNextMemberWrite){failNextMemberWrite=false;throw Error("MOCK_TRANSIENT_D1_UPSERT_FAILURE")}
  members.set(args[0],{status:args[1],tiers:args[2]});updates++;
 }
 if(sql.startsWith("UPDATE member_sessions SET revoked_at"))revocations++;
 return {success:true,meta:{changes:1}};
}
const env={MEMBERS_DB:db,PATREON_WEBHOOK_SECRET:secret,ASSETS:{fetch:async()=>new Response("asset missing",{status:404})}};
const endpoint="https://grokarchivehub.com/webhooks/patreon";
async function fire(status,id="member-42",trigger="members:update"){
 const body=JSON.stringify({data:{type:"member",id,attributes:{patron_status:status},relationships:{
  user:{data:{id:"user-42",type:"user"}},currently_entitled_tiers:{data:status==="active_patron"?[{id:"allowed-tier"}]:[]}
 }}});
 const signature=createHmac("md5",secret).update(body).digest("hex");
 return worker.fetch(new Request(endpoint,{method:"POST",headers:{
  "Content-Type":"application/json","X-Patreon-Event":trigger,"X-Patreon-Signature":signature
 },body}),env);
}
let r=await fire("active_patron");
assert.equal(r.status,200);
assert.equal(members.get("user-42").status,"active_patron");
assert.equal(events.size,1);
console.log("PASS initial active membership recorded");
r=await fire("declined_patron");
assert.equal(r.status,200);
assert.equal(members.get("user-42").status,"declined_patron");
assert.equal(events.size,2);
assert.equal(revocations,1);
console.log("PASS second event for same Patreon member is processed and access revoked");
const oldCount=updates;
r=await fire("declined_patron");
assert.equal(r.status,200);assert.equal(await r.text(),"duplicate ignored");
assert.equal(updates,oldCount);assert.equal(events.size,2);
console.log("PASS exact duplicate suppressed without a second update");
const rewrittenHeader=await fire("declined_patron","member-42","members:delete");
assert.equal(rewrittenHeader.status,200);assert.equal(await rewrittenHeader.text(),"duplicate ignored");
assert.equal(updates,oldCount);assert.equal(events.size,2);
console.log("PASS modified unsigned event-type header cannot bypass deduplication");
const n=events.size;
failNextMemberWrite=true;
try {r=await fire("paused_patron","member-42","members:pledge:update");assert.notEqual(r.status,200)}catch(e){assert.match(String(e),/MOCK_TRANSIENT_D1_UPSERT_FAILURE/)}
assert.equal(events.size,n);
console.log("PASS failed membership update is NOT marked processed");
r=await fire("paused_patron","member-42","members:pledge:update");
assert.equal(r.status,200);
assert.equal(members.get("user-42").status,"paused_patron");
assert.equal(events.size,n+1);
console.log("PASS retry after interrupted member update succeeds");
failNextEventLookup=true;
r=await fire("declined_patron","member-42","members:pledge:delete");
assert.equal(r.status,503);
assert.equal(events.size,n+1);
assert.equal(members.get("user-42").status,"paused_patron");
console.log("PASS idempotency database failure returns 503 and does not modify entitlement");
console.log("RESULT 7/7 PASS");
