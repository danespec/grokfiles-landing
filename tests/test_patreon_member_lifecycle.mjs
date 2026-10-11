import assert from "node:assert/strict";
const worker=(await import(new URL("../_worker.js?patreon-member-lifecycle",import.meta.url))).default;
let oauthState=null, member=null, memberSession=null, providerCalls=[];
const db={
 prepare(sql){return {
  bind(...args){return{
   async run(){
    if(sql.includes("INSERT INTO oauth_states"))oauthState={state_hash:args[0],return_to:args[1],created_at:args[2],expires_at:args[3],used_at:args[4]};
    else if(sql.includes("UPDATE oauth_states SET used_at"))oauthState.used_at=args[0];
    else if(sql.includes("INSERT INTO patreon_members"))member={patreon_user_id:args[0],membership_status:args[1],entitled_tier_ids:args[2],first_synced_at:args[3],last_synced_at:args[4],last_login_at:args[5]};
    else if(sql.includes("INSERT INTO member_sessions"))memberSession={session_id_hash:args[0],patreon_user_id:args[1],issued_at:args[2],expires_at:args[3],renewed_at:args[4],revoked_at:args[5]};
    else if(sql.includes("UPDATE member_sessions SET"))memberSession.revoked_at=args[0];
    return {success:true};
   },
   async first(){
    if(sql.includes("SELECT state_hash"))return oauthState;
    if(sql.includes("FROM member_sessions s"))return memberSession&&member?{...memberSession,...member}:null;
    return null;
   }
  }},
  async run(){return {success:true}},
  async first(){return null}
 }}
};
const env={
 MEMBERS_DB:db,
 MEMBER_SESSION_SIGNING_KEY:"mock_session_key_for_integration_test_20261011",
 PATREON_CLIENT_ID:"MOCK_CLIENT",PATREON_CLIENT_SECRET:"MOCK_SECRET",
 PATREON_ALLOWED_TIER_IDS:"123456",
 ASSETS:{fetch:async()=>new Response("Not found",{status:404})}
};
const base="https://grokarchivehub.com";
const old=globalThis.fetch;
globalThis.fetch=async(u)=>{
 providerCalls.push(String(u));
 if(String(u).includes("/api/oauth2/token"))return Response.json({access_token:"TOKEN_ONLY_FOR_MOCK"});
 if(String(u).includes("/api/oauth2/v2/identity")){
  return Response.json({data:{type:"user",id:"MOCK_USER",relationships:{memberships:{data:[{id:"MOCK_MEMBERSHIP",type:"member"}]}}},
   included:[{id:"MOCK_MEMBERSHIP",type:"member",attributes:{patron_status:"active_patron"},relationships:{campaign:{data:{type:"campaign",id:"16343031"}},currently_entitled_tiers:{data:[{type:"tier",id:"123456"}]}}}]});
 }
 throw new Error("Unexpected mocked provider destination");
};
try {
 const start=await worker.fetch(new Request(base+"/auth/patreon/start?return_to=/members/account"),env);
 assert.equal(start.status,302);
 const url=new URL(start.headers.get("Location")),state=url.searchParams.get("state");
 const stateCookie=start.headers.get("set-cookie").split(";")[0];
 assert.ok(state&&stateCookie.startsWith("gah_oauth_state="));
 console.log("PASS state created for authorized mock Patreon member");
 const callback=await worker.fetch(new Request(base+"/auth/patreon/callback?state="+encodeURIComponent(state)+"&code=mock_code",{headers:{cookie:stateCookie}}),env);
 assert.equal(callback.status,302,"callback "+callback.status+" "+(await callback.text()).slice(0,160));
 assert.equal(callback.headers.get("Location"),"/members/account");
 const cookies=callback.headers.getSetCookie();
 const memberCookie=cookies.find(x=>x.startsWith("gah_member_session="))?.split(";")[0];
 assert.ok(memberCookie);
 assert.equal(member?.membership_status,"active_patron");
 assert.equal(JSON.parse(member.entitled_tier_ids)[0],"123456");
 assert.equal(memberSession?.patreon_user_id,"MOCK_USER");
 console.log("PASS provider-backed identity and allowed tier issue signed session");
 const account=await worker.fetch(new Request(base+"/members/account",{headers:{cookie:memberCookie}}),env);
 assert.equal(account.status,200);
 assert.match(await account.text(),/Account Status/);
 console.log("PASS new session grants protected account");
 member.membership_status="declined_patron";
 const revoked=await worker.fetch(new Request(base+"/members/account",{headers:{cookie:memberCookie}}),env);
 assert.equal(revoked.status,403);
 assert.match(await revoked.text(),/Access not available/);
 console.log("PASS subscription revocation immediately denies protected account");
 assert.equal(providerCalls.length,2);
 console.log("SUCCESSFUL_PATREON_LOGIN_END_TO_END_ISOLATED_PASS");
} finally {globalThis.fetch=old;}
