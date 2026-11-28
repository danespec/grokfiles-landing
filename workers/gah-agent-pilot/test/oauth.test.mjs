import test from 'node:test';import assert from 'node:assert/strict';import {Miniflare} from 'miniflare';import {build} from 'esbuild';import {mkdtemp,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';import {createHash,randomBytes} from 'node:crypto';
test('isolated OAuth authorization code, PKCE, scope, issuer, registration, consent and revoke',async()=>{
 const dir=await mkdtemp(join(process.cwd(),'.build-'));const scriptPath=join(dir,'worker.mjs');let mf;
 try{
  await build({entryPoints:['test/fixture.mjs'],bundle:true,format:'esm',platform:'browser',target:'es2022',external:['cloudflare:*'],outfile:scriptPath});
  const provisioning=randomBytes(32).toString('hex');const issuer='https://agent-pilot.example',resource=issuer+'/api/agent/v1/status',redirect='https://client.example/callback';
  mf=new Miniflare({modules:true,scriptPath,compatibilityDate:'2026-07-30',bindings:{AGENT_PILOT_ENABLED:'true',AGENT_PROVISION_TOKEN:provisioning,AGENT_CONSENT_BINDING_SECRET:randomBytes(32).toString('hex'),AGENT_APPROVED_REDIRECT_URI:redirect},kvNamespaces:['OAUTH_KV']});
  const req=(p,options={})=>mf.dispatchFetch(issuer+p,options);
  const access={'x-test-subject':'test-user'};
  const unauth=await req('/api/agent/v1/status');assert.equal(unauth.status,401);assert.match(unauth.headers.get('www-authenticate'),/resource_metadata/);
  const prm=await (await req('/.well-known/oauth-protected-resource')).json();assert.equal(prm.resource,resource);assert.deepEqual(prm.authorization_servers,[issuer]);assert.deepEqual(prm.scopes_supported,['archive:status']);
  const meta=await (await req('/.well-known/oauth-authorization-server')).json();assert.equal(meta.issuer,issuer);assert.equal(meta.authorization_endpoint,issuer+'/authorize');assert.equal(meta.token_endpoint,issuer+'/oauth/token');assert(meta.grant_types_supported.includes('authorization_code'));assert(meta.response_types_supported.includes('code'));
  assert.equal((await req('/operator/clients',{method:'POST'})).status,403);
  assert.equal((await req('/operator/clients',{method:'POST',headers:{...access,authorization:'Bearer wrong'}})).status,403);
  const reg=await req('/operator/clients',{method:'POST',headers:{...access,authorization:'Bearer '+provisioning}});assert.equal(reg.status,201);const {client_id}=await reg.json();assert(client_id);
  const verifier=randomBytes(48).toString('base64url'),challenge=createHash('sha256').update(verifier).digest('base64url');
  const params=new URLSearchParams({response_type:'code',client_id,redirect_uri:redirect,scope:'archive:status',state:'test-state',resource,code_challenge:challenge,code_challenge_method:'S256'});
  assert.equal((await req('/authorize?'+params)).status,401);
  const badScope=new URLSearchParams(params);badScope.set('scope','member:read');assert.equal((await req('/authorize?'+badScope,{headers:access,redirect:'manual'})).status,400);
  const page=await req('/authorize?'+params,{headers:access,redirect:'manual'});assert.equal(page.status,200);const html=await page.text(),handle=html.match(/name="handle" value="([^"]+)"/)[1],binding=html.match(/name="binding" value="([^"]+)"/)[1];const cookie=page.headers.get('set-cookie').split(';')[0];
  const form=new URLSearchParams({handle,binding,decision:'approve'});const post={method:'POST',headers:{...access,origin:issuer,cookie,'content-type':'application/x-www-form-urlencoded'},body:form.toString(),redirect:'manual'};
  assert.equal((await req('/authorize',{...post,headers:{...post.headers,origin:'https://evil.example'}})).status,400);
  assert.equal((await req('/authorize',{...post,headers:{...post.headers,'x-test-subject':'other-user'}})).status,400);
  const approve=await req('/authorize',post);assert.equal(approve.status,302);const callback=new URL(approve.headers.get('location'));assert.equal(callback.origin,'https://client.example');assert.equal(callback.searchParams.get('state'),'test-state');assert.equal(callback.searchParams.get('iss'),issuer);const code=callback.searchParams.get('code');assert(code);
  const tokenBody=new URLSearchParams({grant_type:'authorization_code',client_id,code,redirect_uri:redirect,code_verifier:verifier,resource});const tokenReq={method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:tokenBody.toString()};
  const issued=await req('/oauth/token',tokenReq);const tokens=await issued.json();assert.equal(issued.status,200,JSON.stringify({error:tokens.error,description:tokens.error_description}));assert(tokens.access_token);assert(!tokens.refresh_token);assert.equal(tokens.expires_in,300);
  const status=await req('/api/agent/v1/status',{headers:{authorization:'Bearer '+tokens.access_token}});assert.equal(status.status,200);assert.deepEqual((await status.json()).archive_status,{ok:true,public:true});
  assert.equal((await req('/members',{headers:{authorization:'Bearer '+tokens.access_token}})).status,404);assert.equal((await req('/api/agent/v1/status',{method:'POST',headers:{authorization:'Bearer '+tokens.access_token}})).status,404);
  const rev=new URL(meta.revocation_endpoint);assert.equal(rev.origin,issuer);const revoke=await req(rev.pathname,{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id,token:tokens.access_token,token_type_hint:'access_token'}).toString()});assert.equal(revoke.status,200);assert.equal((await req('/api/agent/v1/status',{headers:{authorization:'Bearer '+tokens.access_token}})).status,401);
  assert.notEqual((await req('/oauth/token',tokenReq)).status,200);
 }finally{await mf?.dispose();await rm(dir,{recursive:true,force:true});}
});
