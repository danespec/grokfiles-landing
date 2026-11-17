import {OAuthAuthorizationServer,OAuthResourceServer,AuthorizationError,insufficientScope} from '@cloudflare/workers-oauth-provider';
import {createRemoteJWKSet,jwtVerify} from 'jose';
const SCOPE='archive:status';
const escape=s=>String(s).replace(/[&<>"']/g,c=>`&#${c.charCodeAt(0)};`);
const json=(value,status=200,headers={})=>Response.json(value,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex,nofollow',...headers}});
const exactOrigin=s=>{try{const u=new URL(s);return u.origin===s&&u.protocol==='https:'&&!u.username&&!u.password;}catch(_){return false;}};
const keySets=new Map();
async function accessSubject(request,env){
 const issuer=env.AGENT_ACCESS_ISSUER,aud=env.AGENT_ACCESS_AUD;
 if(!exactOrigin(issuer)||!new URL(issuer).hostname.endsWith('.cloudflareaccess.com')||typeof aud!=='string'||aud.length<20)return null;
 const token=request.headers.get('Cf-Access-Jwt-Assertion');if(!token||token.length>8192)return null;
 try{
  if(!keySets.has(issuer))keySets.set(issuer,createRemoteJWKSet(new URL('/cdn-cgi/access/certs',issuer),{timeoutDuration:2500}));
  const {payload}=await jwtVerify(token,keySets.get(issuer),{issuer,audience:aud,algorithms:['RS256'],requiredClaims:['sub','exp','iat']});
  if(typeof payload.sub!=='string'||!payload.sub||payload.sub.length>256)return null;
  // Store a pseudonymous subject, not an email, name or member identifier.
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(issuer+'\n'+payload.sub));
  return Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
 }catch(_){return null;}
}
async function sameSecret(a,b){if(typeof a!=='string'||typeof b!=='string'||b.length<32||a.length>512)return false;const enc=new TextEncoder();const x=new Uint8Array(await crypto.subtle.digest('SHA-256',enc.encode(a))),y=new Uint8Array(await crypto.subtle.digest('SHA-256',enc.encode(b)));let diff=0;for(let i=0;i<x.length;i++)diff|=x[i]^y[i];return diff===0;}
async function consentBinding(secret,handle,subject){
 if(typeof secret!=='string'||secret.length<32)throw Error('consent binding not configured');
 const enc=new TextEncoder(),key=await crypto.subtle.importKey('raw',enc.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 return Array.from(new Uint8Array(await crypto.subtle.sign('HMAC',key,enc.encode(JSON.stringify([handle,subject])))),b=>b.toString(16).padStart(2,'0')).join('');
}
const publicStatus=()=>fetch('https://grokarchivehub.com/api/archive-status',{redirect:'error',headers:{Accept:'application/json'},signal:AbortSignal.timeout(5000)});
export function buildPilot(issuer,{verifySubject=accessSubject,fetchStatus=publicStatus,tokenPath="/oauth/token"}={}){
 if(!exactOrigin(issuer)&&!/^http:\/\/127\.0\.0\.1:\d+$/.test(issuer))throw Error('invalid issuer');
 const resource=issuer+'/api/agent/v1/status';
 const as=new OAuthAuthorizationServer({issuer,resources:[resource],defaultResource:resource,authorizeEndpoint:'/authorize',tokenEndpoint:tokenPath,scopesSupported:[SCOPE],accessTokenTTL:300,refreshTokenTTL:0,clientIdMetadataDocumentEnabled:false,cookiePrefix:'__Host-gah-agent-pilot-'});
 const rs=new OAuthResourceServer({resourceMetadata:{resource,authorization_servers:[issuer],bearer_methods_supported:['header'],resource_name:'GAH public archive status pilot'},requiredScopes:[SCOPE],validateToken:env=>(r,t)=>as.validateToken(r,t,env),handler:{async fetch(req,env,ctx){
  if(req.method!=='GET'||req.url!==resource)return json({error:'not_found'},404);
  if(!ctx.auth.scope.includes(SCOPE))return insufficientScope(ctx.auth,[SCOPE]);
  // Only a bounded, public status service; never forward caller headers, identity, tokens or cookies.
  const source=await fetchStatus();
  if(!source.ok)return json({error:'archive_status_unavailable'},503);
  const body=await source.text();if(body.length>200000)return json({error:'archive_status_unavailable'},503);
  try{return json({schema:'gah.agent.status.v1',source:'https://grokarchivehub.com/api/archive-status',archive_status:JSON.parse(body)});}catch(_){return json({error:'archive_status_unavailable'},503);}
 }}});
 async function auth(request,env){
  const subject=await verifySubject(request,env);if(!subject)return json({error:'pilot_access_required'},401);
  const oauth=as.getOAuthApi(env);
  try{
   if(request.method==='GET'){
    const parsed=await oauth.parseAuthRequest(request);if(parsed.responseType!=='code'||parsed.codeChallengeMethod!=='S256'||!parsed.codeChallenge||parsed.resource!==resource||parsed.scope.length!==1||parsed.scope[0]!==SCOPE)return json({error:'unsupported_scope_or_pkce'},400);
    const details=await oauth.describeConsent(parsed);const consent=await oauth.beginConsent(parsed);const binding=await consentBinding(env.AGENT_CONSENT_BINDING_SECRET,consent.handle,subject);consent.headers.set('Content-Type','text/html; charset=utf-8');consent.headers.set('Cache-Control','no-store');consent.headers.set('Content-Security-Policy',"default-src 'none'; frame-ancestors 'none'; form-action 'self'; base-uri 'none'");
    return new Response(`<!doctype html><meta charset="utf-8"><title>GAH agent authorization</title><h1>Authorize ${escape(details.clientName)}?</h1><p>Read-only public archive status. No member account, payment, source-tip or private data access.</p><p>Redirect: <strong>${escape(details.redirectHost)}</strong>.</p>${details.redirectIsLoopback?'<p>Only approve if you started this local application.</p>':''}<form method="post"><input type="hidden" name="handle" value="${escape(consent.handle)}"><input type="hidden" name="binding" value="${binding}"><button name="decision" value="approve">Allow archive:status</button> <button name="decision" value="deny">Deny</button></form>`,{headers:consent.headers});
   }
   if(request.method!=='POST'||request.headers.get('origin')!==issuer||!request.headers.get('content-type')?.startsWith('application/x-www-form-urlencoded'))return json({error:'invalid_request'},400);
   const text=await request.text();if(text.length>4096)return json({error:'invalid_request'},400);const form=new URLSearchParams(text),handle=form.get('handle');if(!handle||handle.length>512||!await sameSecret(form.get('binding'),await consentBinding(env.AGENT_CONSENT_BINDING_SECRET,handle,subject)))return json({error:'invalid_request'},400);
   if(form.get('decision')!=='approve'){const denied=await oauth.denyConsent(request,handle);return new Response(null,{status:302,headers:denied.headers});}
   const approved=await oauth.approveConsent(request,handle,{scope:[SCOPE]});if(approved.request.resource!==resource||approved.request.scope.length!==1||approved.request.scope[0]!==SCOPE||approved.request.codeChallengeMethod!=='S256')return json({error:'invalid_grant'},400);
   const {redirectTo}=await oauth.completeAuthorization({request:approved.request,userId:subject,metadata:{},scope:[SCOPE],props:{purpose:'public_archive_status'}});approved.headers.set('Location',redirectTo);return new Response(null,{status:302,headers:approved.headers});
  }catch(error){if(error instanceof AuthorizationError&&error.redirectTo)return Response.redirect(error.redirectTo,302);return json({error:'authorization_failed'},400);}
 }
 async function provision(request,env){
  if(request.method!=='POST'||!request.headers.get('authorization')?.startsWith('Bearer ')||!await verifySubject(request,env)||!await sameSecret(request.headers.get('authorization')?.slice(7),env.AGENT_PROVISION_TOKEN))return json({error:'forbidden'},403);
  const redirectUri=env.AGENT_APPROVED_REDIRECT_URI;if(typeof redirectUri!=='string'||redirectUri.length>256)return json({error:'configuration_required'},503);
  let u;try{u=new URL(redirectUri);}catch(_){return json({error:'configuration_required'},503);}if(u.username||u.password||u.hash||!(u.protocol==='https:'||(u.protocol==='http:'&&['127.0.0.1','localhost'].includes(u.hostname))))return json({error:'configuration_required'},503);
  const client=await as.getOAuthApi(env).createClient({clientName:'GAH approved status agent',redirectUris:[redirectUri],grantTypes:['authorization_code'],responseTypes:['code'],tokenEndpointAuthMethod:'none'});
  return json({client_id:client.clientId,redirect_uri:redirectUri,scope:SCOPE,token_endpoint_auth_method:'none'},201);
 }
 return {async fetch(request,env,ctx){
  if(env.AGENT_PILOT_ENABLED!=='true'||!env.OAUTH_KV)return json({error:'pilot_disabled'},503);
  const u=new URL(request.url);if(u.origin!==issuer)return json({error:'not_found'},404);
  if(u.pathname==='/authorize')return auth(request,env);
  if(u.pathname==='/operator/clients')return provision(request,env);
  if(u.pathname==='/api/agent/v1/status'||u.pathname==='/.well-known/oauth-protected-resource/api/agent/v1/status')return rs.fetch(request,env,ctx);
  if(u.pathname==='/.well-known/oauth-protected-resource')return json({resource,authorization_servers:[issuer],scopes_supported:[SCOPE],bearer_methods_supported:['header']});
  if(u.pathname==='/auth.md')return new Response('# auth.md\n\n# GAH approved agent pilot\n\nPublic archive remains free. Pilot agents must be provisioned by an approved operator using POST /operator/clients with dedicated Access identity and provisioning credential. No self-registration, human account claim, or open-ended access. Use OAuth authorization code with S256 PKCE, scope archive:status; send the access token only via Authorization: Bearer to '+resource+'. Read metadata at /.well-known/oauth-protected-resource/api/agent/v1/status and /.well-known/oauth-authorization-server. Tokens expire in five minutes; no refresh. No ID-JAG or verified-email registration yet.\n',{headers:{'Content-Type':'text/markdown; charset=utf-8','Cache-Control':'no-store'}});
  if(u.pathname==='/.well-known/oauth-authorization-server'||u.pathname===tokenPath||u.pathname==='/oauth/revoke')return as.fetch(request,env,ctx);
  return json({error:'not_found'},404);
 }};
}
export default {fetch(request,env,ctx){if(env.AGENT_PILOT_ENABLED!=='true'||!exactOrigin(env.AGENT_ISSUER))return json({error:'pilot_disabled'},503);return buildPilot(env.AGENT_ISSUER).fetch(request,env,ctx);}};
