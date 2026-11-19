import {buildPilot} from './worker.mjs';
import {AgentRegistry,registrationService,SCOPE,GRANT,json,random,sha,mac,signingKey,bounded} from './agent-registration.mjs';
export {AgentRegistry};
const COOKIE='__Host-gah-agent-browser';
const routes=new Set(['/auth.md','/.well-known/oauth-authorization-server','/.well-known/oauth-protected-resource','/.well-known/oauth-protected-resource/api/agent/v1/status','/.well-known/jwks.json','/agent/identity','/authorize','/oauth2/token','/oauth2/revoke','/operator/agent-clients','/api/agent/v1/status']);
const secureCookie=(value)=>COOKIE+'='+value+'; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=600';
async function browserSubject(req,env,create=false){
 const v=(req.headers.get('cookie')||'').split(';').map(s=>s.trim()).find(s=>s.startsWith(COOKIE+'='))?.slice(COOKIE.length+1);
 if(v&&/^[0-9a-f]{48}\.[0-9]{10}\.[0-9a-f]{64}$/.test(v)){const [id,expiry,sig]=v.split('.');if(Number(expiry)>Math.floor(Date.now()/1000)&&await mac(env.AGENT_CONSENT_BINDING_SECRET,'browser:'+id+':'+expiry)===sig)return {id};}
 if(!create)return null;const id=random(24),expiry=Math.floor(Date.now()/1000)+600;return {id,cookie:secureCookie(id+'.'+expiry+'.'+await mac(env.AGENT_CONSENT_BINDING_SECRET,'browser:'+id+':'+expiry))};
}
function docs(issuer){return '# auth.md\n\n# Grok Archive Hub — anonymous agent registration\n\nThe ordinary public archive, public MCP tools and public API remain free and do not require an account. This separate agent-authenticated pilot provides only public archive status. No access to member accounts, private evidence, source tips, editorial publishing, payments or personal data.\n\n## Discover\n\nFetch '+issuer+'/.well-known/oauth-protected-resource and '+issuer+'/.well-known/oauth-authorization-server. The logical resource identifier is '+issuer+'. The only protected endpoint is '+issuer+'/api/agent/v1/status. The sole scope is archive:status; bearer credentials go in the Authorization header.\n\n## Register\n\nAnonymous registration is supported. POST '+issuer+'/agent/identity with Content-Type: application/json and body {"type":"anonymous"}. The response contains registration_id, a signed identity_assertion, assertion_expires and pre_claim_scopes. Registration expires in one hour. No email, human account, claim ceremony or verified identity is supported by this pilot. Do not send personal data.\n\n## Exchange and use\n\nPOST '+issuer+'/oauth2/token as application/x-www-form-urlencoded with grant_type='+GRANT+'&assertion=YOUR_IDENTITY_ASSERTION&resource='+issuer+'. The access_token expires after at most 300 seconds. GET '+issuer+'/api/agent/v1/status with Authorization: Bearer YOUR_ACCESS_TOKEN. The same assertion can obtain new tokens until it expires, subject to rate limits. No refresh token.\n\n## Revoke\n\nPOST '+issuer+'/oauth2/revoke as application/x-www-form-urlencoded with token=YOUR_ACCESS_TOKEN to revoke one token, or token=YOUR_IDENTITY_ASSERTION to revoke the registration and all its tokens. Keep all credentials confidential. On 429, back off and honor Retry-After.\n\n## Interactive OAuth\n\nPreapproved clients may use authorization_code with S256 PKCE through /authorize and /oauth2/token after explicit anonymous browser consent. Contact the operator to provision a client; no dynamic client registration or human identity assertion is advertised.\n\nPublic access and content-use policy: see /robots.txt, /privacy and /openapi.json. No model training; public citation and reference access remain unchanged. Restricted routes under /api/x/, /api/ai/, /api/phang-docket/, /api/analytics/, /api/newsletter/ and /members are not authorized by this service. Never reuse browser sessions or existing user credentials for autonomous access. Contact: /contact.\n';}
export function buildPublicAgent(issuer,{fetchStatus=()=>fetch('https://grokfiles-landing.pages.dev/api/archive-status',{redirect:'manual',headers:{Accept:'application/json'},signal:AbortSignal.timeout(5000)})}={}){
 const reg=registrationService(issuer,{fetchStatus});
 const pilot=buildPilot(issuer,{tokenPath:'/oauth2/token',resourceId:issuer,verifySubject:async req=>req.headers.get('x-gah-internal-subject')||null,fetchStatus});
 const prm={resource:reg.resource,resource_name:'GAH public archive status',authorization_servers:[issuer],scopes_supported:[SCOPE],bearer_methods_supported:['header']};
 const publicHeaders={'Access-Control-Allow-Origin':'*'};
 function method(req,allowed){return allowed.includes(req.method);}
 function sanitized(req,subject){const h=new Headers(req.headers);h.delete('x-gah-internal-subject');if(subject)h.set('x-gah-internal-subject',subject);return new Request(req,{headers:h});}
 async function budget(req,env,max=30,purpose="interactive"){const b=await reg.call(env,{op:'rate',rate:await reg.rate(req,env,60,max,600,purpose)});return b.limited?json({error:'rate_limited'},429,{'Retry-After':'60'}):null;}
 return {async fetch(req,env,ctx){
  if(env.AGENT_PILOT_ENABLED!=='true'||!env.AGENT_REGISTRY||!env.OAUTH_KV||!env.AGENT_ASSERTION_JWK||!env.AGENT_RATE_SECRET||!env.AGENT_CONSENT_BINDING_SECRET||!env.AGENT_PROVISION_TOKEN)return json({error:'pilot_disabled'},503);
  const u=new URL(req.url);if(u.origin!==issuer||!routes.has(u.pathname))return json({error:'not_found'},404);
  const p=u.pathname;if(u.search&&p!=='/authorize')return json({error:'invalid_request'},400);
  try{
   if(p==='/auth.md'||p.startsWith('/.well-known/')){
    if(!method(req,['GET','HEAD']))return json({error:'method_not_allowed'},405,{Allow:'GET, HEAD'});
    let r;
    if(p==='/auth.md')r=new Response(docs(issuer),{headers:{'Content-Type':'text/markdown; charset=utf-8','Cache-Control':'no-store','X-Robots-Tag':'noindex,follow',...publicHeaders}});
    else if(p.includes('oauth-protected-resource'))r=json(prm,200,publicHeaders);
    else if(p==='/.well-known/jwks.json')r=json({keys:[(await signingKey(env.AGENT_ASSERTION_JWK)).jwk]},200,publicHeaders);
    else{const base=await pilot.fetch(sanitized(new Request(issuer+p)),env,ctx);if(!base.ok)return base;const m=await base.json();r=json({...m,...prm,issuer,jwks_uri:issuer+'/.well-known/jwks.json',revocation_endpoint:issuer+'/oauth2/revoke',grant_types_supported:['authorization_code',GRANT],response_types_supported:['code'],agent_auth:{skill:issuer+'/auth.md',register_uri:issuer+'/agent/identity',identity_endpoint:issuer+'/agent/identity',identity_types_supported:['anonymous'],anonymous:{credential_types_supported:['access_token']}}},200,publicHeaders);}
    return req.method==='HEAD'?new Response(null,{status:r.status,headers:r.headers}):r;
   }
   if(p==='/agent/identity')return await reg.register(req,env);
   if(p==='/api/agent/v1/status'){
    if(req.method!=='GET')return json({error:'method_not_allowed'},405,{Allow:'GET'});
    if((req.headers.get('authorization')||'').startsWith('Bearer gah_at_')||!req.headers.has('authorization'))return await reg.status(req,env);
    const b=await budget(req,env);if(b)return b;return await pilot.fetch(sanitized(req),env,ctx);
   }
   if(p==='/authorize'){
    if(!method(req,['GET','POST']))return json({error:'method_not_allowed'},405,{Allow:'GET, POST'});
    const b=await budget(req,env);if(b)return b;const subject=await browserSubject(req,env,req.method==='GET');if(!subject)return json({error:'authorization_session_expired'},401);
    let input=req;if(req.method==='POST'){if(!req.headers.get('content-type')?.startsWith('application/x-www-form-urlencoded'))return json({error:'invalid_request'},400);let body;try{body=await bounded(req,4096);}catch{return json({error:'invalid_request'},400);}input=new Request(req.url,{method:'POST',headers:req.headers,body});}const r=await pilot.fetch(sanitized(input,subject.id),env,ctx);if(!subject.cookie)return r;const h=new Headers(r.headers);h.append('Set-Cookie',subject.cookie);return new Response(r.body,{status:r.status,headers:h});
   }
   if(p==='/operator/agent-clients'){
    if(req.method!=='POST')return json({error:'method_not_allowed'},405,{Allow:'POST'});
    const b=await budget(req,env,6,"provision");if(b)return b;
    // Dedicated high-entropy provisioning secret is the only operator authorization here. No GAH admin/session credential works.
    const h=new Headers(req.headers);h.set('x-gah-internal-subject','isolated-provisioner');
    return await pilot.fetch(new Request(issuer+'/operator/clients',{method:'POST',headers:h}),env,ctx);
   }
   if(!method(req,['POST']))return json({error:'method_not_allowed'},405,{Allow:'POST'});
   if(!req.headers.get('content-type')?.startsWith('application/x-www-form-urlencoded'))return json({error:'invalid_request'},400);
   let body;try{body=await bounded(req,8192);}catch{return json({error:'invalid_request'},400);}
   const form=new URLSearchParams(body);if([...form.keys()].some(k=>form.getAll(k).length!==1))return json({error:'invalid_request'},400);
   if(p==='/oauth2/revoke'){
    const t=form.get('token')||'';
    if(t.startsWith('gah_at_')||t.split('.').length===3)return await reg.revoke(req,env,form);
    const b=await budget(req,env);if(b)return b;return await pilot.fetch(sanitized(new Request(issuer+'/oauth2/token',{method:'POST',headers:req.headers,body})),env,ctx);
   }
   if(form.get('grant_type')===GRANT)return await reg.exchange(req,env,form);
   if(form.get('grant_type')!=='authorization_code')return json({error:'unsupported_grant_type'},400);
   const b=await budget(req,env);if(b)return b;return await pilot.fetch(sanitized(new Request(req.url,{method:'POST',headers:req.headers,body})),env,ctx);
  }catch{return json({error:'agent_service_unavailable'},503);}
 }};
}
export default {fetch(req,env,ctx){if(env.AGENT_ISSUER!=='https://grokarchivehub.com')return json({error:'pilot_disabled'},503);return buildPublicAgent(env.AGENT_ISSUER).fetch(req,env,ctx);}};
