import {SignJWT,jwtVerify,importJWK,calculateJwkThumbprint} from 'jose';
export const SCOPE='archive:status', GRANT='urn:ietf:params:oauth:grant-type:jwt-bearer';
export const json=(v,status=200,headers={})=>Response.json(v,{status,headers:{'Cache-Control':'no-store','Pragma':'no-cache','X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex,nofollow',...headers}});
const enc=new TextEncoder(), hex=b=>Array.from(new Uint8Array(b),x=>x.toString(16).padStart(2,'0')).join('');
export const random=(n=32)=>hex(crypto.getRandomValues(new Uint8Array(n)));
export const sha=async v=>hex(await crypto.subtle.digest('SHA-256',enc.encode(v)));
export async function mac(secret,text){if(typeof secret!=='string'||secret.length<32)throw Error('not configured');const k=await crypto.subtle.importKey('raw',enc.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);return hex(await crypto.subtle.sign('HMAC',k,enc.encode(text)));}
export async function signingKey(raw){
 const j=JSON.parse(raw);if(j.kty!=='EC'||j.crv!=='P-256'||!j.d||!j.x||!j.y)throw Error('invalid signing key');
 const p={kty:j.kty,crv:j.crv,x:j.x,y:j.y};const kid=await calculateJwkThumbprint(p);
 return {privateKey:await importJWK(j,'ES256'),publicKey:await importJWK(p,'ES256'),jwk:{...p,kid,alg:'ES256',use:'sig'},kid};
}
export async function bounded(request,limit=4096){
 const reader=request.body?.getReader();if(!reader)throw Error('missing body');let size=0,chunks=[];
 try{while(true){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>limit){await reader.cancel();throw Error('body too large');}chunks.push(value);}}finally{reader.releaseLock();}
 const all=new Uint8Array(size);let offset=0;for(const c of chunks){all.set(c,offset);offset+=c.byteLength;}return new TextDecoder('utf-8',{fatal:true}).decode(all);
}
// One isolated SQLite DO. All issuance, revocation and rate updates serialize atomically.
// No raw bearer token, assertion, IP address, email or member ID is persisted.
export class AgentRegistry{
 constructor(ctx){this.ctx=ctx;this.sql=ctx.storage.sql;this.sql.exec('CREATE TABLE IF NOT EXISTS regs (id TEXT PRIMARY KEY, jti TEXT NOT NULL, expires INTEGER NOT NULL)');this.sql.exec('CREATE TABLE IF NOT EXISTS tokens (hash TEXT PRIMARY KEY, reg TEXT NOT NULL, expires INTEGER NOT NULL)');this.sql.exec('CREATE INDEX IF NOT EXISTS tokens_reg ON tokens(reg)');this.sql.exec('CREATE TABLE IF NOT EXISTS limits (id TEXT PRIMARY KEY, count INTEGER NOT NULL, expires INTEGER NOT NULL)');}
 one(query,...args){return this.sql.exec(query,...args).toArray()[0];}
 async fetch(request){
  if(request.method!=='POST')return json({},405);
  const {op,rate,id,jti,hash,expires}=await request.json();const now=Math.floor(Date.now()/1000);
  const result=this.ctx.storage.transactionSync(()=>{
   this.sql.exec('DELETE FROM tokens WHERE expires<=?',now);this.sql.exec('DELETE FROM regs WHERE expires<=?',now);this.sql.exec('DELETE FROM limits WHERE expires<=?',now);
   if(rate){const {key,window,max,global,purpose=op}=rate;const bucket=Math.floor(now/window);for(const [k,cap] of [[purpose+':'+key+':'+bucket,max],[purpose+':global:'+bucket,global]]){const row=this.one('SELECT count FROM limits WHERE id=?',k);if((row?.count||0)>=cap)return {limited:true};this.sql.exec('INSERT INTO limits VALUES (?,1,?) ON CONFLICT(id) DO UPDATE SET count=count+1',k,(bucket+1)*window);}}
   if(op==='register'){this.sql.exec('INSERT INTO regs VALUES (?,?,?)',id,jti,expires);return {ok:true};}
   if(op==='issue'){const r=this.one('SELECT * FROM regs WHERE id=? AND jti=? AND expires>?',id,jti,now);if(!r)return {};if(this.one('SELECT COUNT(*) AS n FROM tokens WHERE reg=?',id).n>=10)return {limited:true};const end=Math.min(expires,r.expires);if(end<=now)return {};this.sql.exec('INSERT INTO tokens VALUES (?,?,?)',hash,id,end);return {ok:true,expires:end};}
   if(op==='validate'){const r=this.one('SELECT t.expires,t.reg FROM tokens t JOIN regs r ON t.reg=r.id WHERE t.hash=? AND t.expires>? AND r.expires>?',hash,now,now);return r?{ok:true,id:r.reg,expires:r.expires}:{};}
   if(op==='revoke'){this.sql.exec('DELETE FROM tokens WHERE hash=?',hash);return {ok:true};}
   if(op==='revoke-registration'){this.sql.exec('DELETE FROM tokens WHERE reg=?',id);this.sql.exec('DELETE FROM regs WHERE id=? AND jti=?',id,jti);return {ok:true};}
   if(op==='rate')return {ok:true};return {};
  });return json(result);
 }
}
export function registrationService(issuer,{fetchStatus}){
 const resource=issuer,endpoint=issuer+'/api/agent/v1/status',tokenEndpoint=issuer+'/oauth2/token';
 const challenge='Bearer resource_metadata="'+issuer+'/.well-known/oauth-protected-resource", scope="'+SCOPE+'"';
 const unauthorized=()=>json({error:'invalid_token'},401,{'WWW-Authenticate':challenge});
 const limited=()=>json({error:'rate_limited'},429,{'Retry-After':'60'});
 const error=(e='invalid_request')=>json({error:e},400);
 async function call(env,body){const stub=env.AGENT_REGISTRY.get(env.AGENT_REGISTRY.idFromName('v1'));const r=await stub.fetch('https://registry.internal/state',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});if(!r.ok)throw Error('registry unavailable');return r.json();}
 async function rate(request,env,window,max,global,purpose="general"){const ip=request.headers.get('CF-Connecting-IP');if(!ip||ip.length>128)throw Error('edge identity missing');return {key:await mac(env.AGENT_RATE_SECRET,'rate:'+Math.floor(Date.now()/3600000)+':'+ip),window,max,global,purpose};}
 async function assertion(raw,env){try{if(typeof raw!=='string'||raw.length>4096)return null;const key=await signingKey(env.AGENT_ASSERTION_JWK);const {payload,protectedHeader}=await jwtVerify(raw,key.publicKey,{issuer,audience:tokenEndpoint,algorithms:['ES256'],typ:'oauth-id-jag+jwt',requiredClaims:['sub','jti','iat','exp','aud'],maxTokenAge:3600});if(protectedHeader.kid!==key.kid||payload.aud!==tokenEndpoint||payload.scope!==SCOPE||payload.kind!=='anonymous'||!/^reg_[0-9a-f]{48}$/.test(payload.sub)||!/^jti_[0-9a-f]{48}$/.test(payload.jti))return null;return payload;}catch{return null;}}
 async function register(request,env){
  if(request.method!=='POST')return json({error:'method_not_allowed'},405,{Allow:'POST'});
  if(!request.headers.get('content-type')?.toLowerCase().startsWith('application/json'))return error();
  let data;try{data=JSON.parse(await bounded(request,512));}catch{return error();}
  if(!data||typeof data!=='object'||Object.keys(data).length!==1||data.type!=='anonymous')return error('anonymous_only');
  const id='reg_'+random(24),jti='jti_'+random(24),now=Math.floor(Date.now()/1000),expires=now+3600;
  const r=await call(env,{op:'register',rate:await rate(request,env,3600,6,120,"registration"),id,jti,expires});if(r.limited)return limited();if(!r.ok)throw Error('registration failed');
  const key=await signingKey(env.AGENT_ASSERTION_JWK);
  const jwt=await new SignJWT({kind:'anonymous',scope:SCOPE}).setProtectedHeader({alg:'ES256',kid:key.kid,typ:'oauth-id-jag+jwt'}).setIssuer(issuer).setAudience(tokenEndpoint).setSubject(id).setJti(jti).setIssuedAt(now).setExpirationTime(expires).sign(key.privateKey);
  return json({registration_id:id,registration_type:'anonymous',identity_assertion:jwt,assertion_expires:new Date(expires*1000).toISOString(),pre_claim_scopes:[SCOPE],claim_supported:false});
 }
 async function exchange(request,env,form){
  if(form.get('grant_type')!==GRANT||form.getAll('assertion').length!==1||form.getAll('resource').length>1||form.getAll('scope').length>1||[...form.keys()].some(k=>!['grant_type','assertion','resource','scope'].includes(k)))return error();
  const budget=await call(env,{op:'rate',rate:await rate(request,env,60,30,600)});if(budget.limited)return limited();
  if(form.has('resource')&&form.get('resource')!==resource)return error('invalid_target');if(form.has('scope')&&form.get('scope')!==SCOPE)return error('invalid_scope');
  const p=await assertion(form.get('assertion'),env);if(!p)return error('invalid_grant');
  const token='gah_at_'+random(),now=Math.floor(Date.now()/1000);const r=await call(env,{op:'issue',rate:await rate(request,env,60,20,600,"issuance"),id:p.sub,jti:p.jti,hash:await sha(token),expires:now+300});
  if(r.limited)return limited();if(!r.ok)return error('invalid_grant');return json({access_token:token,token_type:'Bearer',expires_in:r.expires-now,scope:SCOPE});
 }
 async function revoke(request,env,form){
  const budget=await call(env,{op:'rate',rate:await rate(request,env,60,30,600)});if(budget.limited)return limited();const t=form.get('token');
  if(/^gah_at_[0-9a-f]{64}$/.test(t||''))await call(env,{op:'revoke',hash:await sha(t)});
  else{const p=await assertion(t,env);if(p)await call(env,{op:'revoke-registration',id:p.sub,jti:p.jti});}
  return new Response(null,{status:200,headers:{'Cache-Control':'no-store'}});
 }
 async function status(request,env){
  if(request.method!=='GET'||request.url!==endpoint)return json({error:'not_found'},404);
  const budget=await call(env,{op:'rate',rate:await rate(request,env,60,30,600)});if(budget.limited)return limited();
  const t=request.headers.get('authorization')||'';if(!/^Bearer gah_at_[0-9a-f]{64}$/.test(t))return unauthorized();
  const v=await call(env,{op:'validate',hash:await sha(t.slice(7))});if(!v.ok)return unauthorized();
  const r=await fetchStatus();if(!r.ok)return json({error:'status_unavailable'},503);
  return json({schema:'gah.agent.status.v1',source:'https://grokarchivehub.com/api/archive-status',archive_status:JSON.parse(await bounded(r,200000))});
 }
 return {register,exchange,revoke,status,call,rate,resource,unauthorized};
}
