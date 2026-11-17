// GAH-WBA-017 — isolated Ed25519 key directory and outbound request signer.
// No user identity, OAuth keys, payment authorization or access escalation.
const encoder = new TextEncoder();
const DIRECTORY = '/.well-known/http-message-signatures-directory';
const CONTENT_TYPE = 'application/http-message-signatures-directory+json';
const b64 = bytes => btoa(String.fromCharCode(...new Uint8Array(bytes)));
const b64url = bytes => b64(bytes).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const quote = s => JSON.stringify(s);
const hash = async text => crypto.subtle.digest('SHA-256',encoder.encode(text));
async function material(raw){
 const jwk = typeof raw === 'string' ? JSON.parse(raw) : raw;
 if (!jwk || jwk.kty!=='OKP'||jwk.crv!=='Ed25519'||! /^[A-Za-z0-9_-]{43}$/.test(jwk.x||'') || ! /^[A-Za-z0-9_-]{43}$/.test(jwk.d||'')) throw Error('invalid_web_bot_key');
 const publicKey={crv:'Ed25519',kty:'OKP',x:jwk.x};
 const kid=b64url(await hash(JSON.stringify(publicKey)));
 const privateKey=await crypto.subtle.importKey('jwk',{...publicKey,d:jwk.d,ext:true},{name:'Ed25519'},false,['sign']);
 return {publicKey:{...publicKey,kid},kid,privateKey};
}
async function signFields(key,fields,tag,now){
 const created=Math.floor(now/1000),expires=created+60;
 const nonce=b64url(crypto.getRandomValues(new Uint8Array(16)));
 const params=`(${fields.map(([name])=>name).join(' ')});alg="ed25519";keyid=${quote(key.kid)};nonce=${quote(nonce)};tag=${quote(tag)};created=${created};expires=${expires}`;
 const input=fields.map(([name,value])=>`${name}: ${value}`).concat(`"@signature-params": ${params}`).join('\n');
 const signature=b64(await crypto.subtle.sign('Ed25519',key.privateKey,encoder.encode(input)));
 return {'Signature-Input':'sig1='+params,Signature:`sig1=:${signature}:`};
}
export async function webBotDirectory(request,env,now=Date.now()){
 const url=new URL(request.url);
 if(url.pathname!==DIRECTORY)return null;
 const common={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex,follow','Access-Control-Allow-Origin':'*'};
 if(url.protocol!=='https:'||url.hostname!=='grokarchivehub.com'||url.port||url.search)return new Response('Not found',{status:404,headers:common});
 if(!['GET','HEAD'].includes(request.method))return new Response(null,{status:405,headers:{...common,Allow:'GET, HEAD'}});
 if(!env?.GAH_WEB_BOT_AUTH_JWK)return new Response('Key directory not configured',{status:503,headers:common});
 try{
  const key=await material(env.GAH_WEB_BOT_AUTH_JWK);
  const body=JSON.stringify({keys:[key.publicKey]});
  const digest=`sha-256=:${b64(await hash(body))}:`;
  const headers=await signFields(key,[[ '"@authority";req',url.host],['"content-type"',CONTENT_TYPE],['"content-digest"',digest]],'http-message-signatures-directory',now);
  return new Response(request.method==='HEAD'?null:body,{status:200,headers:{...common,...headers,'Content-Type':CONTENT_TYPE,'Content-Digest':digest,'Access-Control-Expose-Headers':'Signature, Signature-Input, Content-Digest','Content-Signal':'ai-train=no, search=yes, ai-input=yes'}});
 }catch(_){return new Response('Key directory unavailable',{status:503,headers:common});}
}
// Outbound signing is operator-side only, restricted to public read-only GAH status endpoints.
// Do not sign payment headers or accept externally supplied signature fields or request bodies.
export async function signedStatusRequest(raw,urlString,now=Date.now()){
 const url=new URL(urlString);
 if(url.origin!=='https://grokarchivehub.com'||url.search||url.hash||!['/api/archive-status','/api/book-of-black/status'].includes(url.pathname))throw Error('target_not_allowed');
 const key=await material(raw),agent='"https://grokarchivehub.com"';
 const fields=[['"@method"','GET'],['"@authority"',url.host],['"@path"',url.pathname],['"signature-agent"',agent]];
 return new Request(url,{method:'GET',redirect:'error',headers:{...await signFields(key,fields,'web-bot-auth',now),'Signature-Agent':agent,'User-Agent':'GAH-StatusAgent/1.0 (+https://grokarchivehub.com/auth.md)',Accept:'application/json'}});
}
