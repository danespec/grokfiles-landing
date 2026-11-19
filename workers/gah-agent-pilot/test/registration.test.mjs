import test from 'node:test';import assert from 'node:assert/strict';import {Miniflare} from 'miniflare';import {build} from 'esbuild';import {mkdtemp,rm} from 'node:fs/promises';import {join} from 'node:path';import {randomBytes,createHash} from 'node:crypto';import {generateKeyPair,exportJWK,importJWK,jwtVerify,SignJWT} from 'jose';
const issuer='https://agent-pilot.example',resource=issuer,grant='urn:ietf:params:oauth:grant-type:jwt-bearer';
test('real anonymous registration, signed assertion, scoped token, revocation, quotas, and interactive OAuth',async()=>{
 const dir=await mkdtemp(join(process.cwd(),'.build-'));let mf;
 try{
 const scriptPath=join(dir,'worker.mjs');await build({entryPoints:['test/public-fixture.mjs'],bundle:true,format:'esm',platform:'browser',target:'es2022',external:['cloudflare:*'],outfile:scriptPath});
 const pair=await generateKeyPair('ES256',{extractable:true}),secret=randomBytes(32).toString('hex'),redirect='https://client.example/callback';
 mf=new Miniflare({modules:true,scriptPath,compatibilityDate:'2026-07-30',bindings:{AGENT_PILOT_ENABLED:'true',AGENT_ASSERTION_JWK:JSON.stringify(await exportJWK(pair.privateKey)),AGENT_RATE_SECRET:randomBytes(32).toString('hex'),AGENT_PROVISION_TOKEN:secret,AGENT_CONSENT_BINDING_SECRET:randomBytes(32).toString('hex'),AGENT_APPROVED_REDIRECT_URI:redirect},kvNamespaces:['OAUTH_KV'],durableObjects:{AGENT_REGISTRY:{className:'AgentRegistry',useSQLite:true}}});
 const req=(path,options={})=>mf.dispatchFetch(issuer+path,{...options,headers:{'CF-Connecting-IP':'192.0.2.10',...options.headers}});
 const form=(obj)=>({method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams(obj).toString()});
 const register=()=>req('/agent/identity',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type:'anonymous'})});
 const meta=await (await req('/.well-known/oauth-authorization-server')).json();assert.equal(meta.issuer,issuer);assert.equal(meta.authorization_endpoint,issuer+'/authorize');assert.equal(meta.token_endpoint,issuer+'/oauth2/token');assert(meta.grant_types_supported.includes(grant));assert.equal(meta.agent_auth.register_uri,issuer+'/agent/identity');assert.deepEqual(meta.agent_auth.identity_types_supported,['anonymous']);
 const prm=await (await req('/.well-known/oauth-protected-resource')).json();assert.equal(prm.resource,resource);assert.deepEqual(prm.authorization_servers,[issuer]);assert.deepEqual(prm.bearer_methods_supported,['header']);
 assert.match((await req('/api/agent/v1/status')).headers.get('www-authenticate'),/resource_metadata/);
 assert.equal((await req('/agent/identity')).status,405);
 assert.equal((await req('/agent/identity',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type:'anonymous',email:'ignored@example.invalid'})})).status,400);
 const r=await register();assert.equal(r.status,200);const reg=await r.json();assert.match(reg.registration_id,/^reg_/);assert.deepEqual(reg.pre_claim_scopes,['archive:status']);assert.equal(reg.claim_supported,false);
 const jwks=await (await req('/.well-known/jwks.json')).json();assert.equal(jwks.keys[0].d,undefined);const key=await importJWK(jwks.keys[0],'ES256');
 const {payload}=await jwtVerify(reg.identity_assertion,key,{issuer,audience:meta.token_endpoint,algorithms:['ES256']});assert.equal(payload.sub,reg.registration_id);
 const args={grant_type:grant,assertion:reg.identity_assertion,resource};
 assert.equal((await req('/oauth2/token',form({...args,resource:issuer+'/members'}))).status,400);
 assert.equal((await req('/oauth2/token',form({...args,scope:'member:read'}))).status,400);
 assert.equal((await req('/oauth2/token',form({...args,assertion:reg.identity_assertion.slice(0,-5)+'xxxxx'}))).status,400);
 const forged=await new SignJWT({...payload,exp:Math.floor(Date.now()/1000)-1}).setProtectedHeader({alg:'ES256',kid:jwks.keys[0].kid,typ:'oauth-id-jag+jwt'}).sign(pair.privateKey);
 assert.equal((await req('/oauth2/token',form({...args,assertion:forged}))).status,400);
 const issue=await req('/oauth2/token',form(args));assert.equal(issue.status,200,await issue.clone().text());const token=await issue.json();assert(token.expires_in<=300);assert(!token.refresh_token);assert.equal(token.scope,'archive:status');
 const access={authorization:'Bearer '+token.access_token};assert.equal((await req('/api/agent/v1/status',{headers:access})).status,200);assert.equal((await req('/members',{headers:access})).status,404);assert.equal((await req('/api/agent/v1/status',{method:'POST',headers:access})).status,405);
 assert.equal((await req('/oauth2/revoke',form({token:token.access_token}))).status,200);assert.equal((await req('/api/agent/v1/status',{headers:access})).status,401);
 const t2=await (await req('/oauth2/token',form(args))).json();assert(t2.access_token);
 assert.equal((await req('/oauth2/revoke',form({token:reg.identity_assertion}))).status,200);assert.equal((await req('/api/agent/v1/status',{headers:{authorization:'Bearer '+t2.access_token}})).status,401);assert.equal((await req('/oauth2/token',form(args))).status,400);
 // Code flow is separately provisioned and anonymous; no existing member identities.
 assert.equal((await req('/operator/agent-clients',{method:'POST',headers:{'x-gah-internal-subject':'forged'}})).status,403);
 const client=await req('/operator/agent-clients',{method:'POST',headers:{authorization:'Bearer '+secret}});assert.equal(client.status,201,await client.clone().text());const {client_id}=await client.json();
 const verifier=randomBytes(48).toString('base64url'),challenge=createHash('sha256').update(verifier).digest('base64url');
 const params=new URLSearchParams({response_type:'code',client_id,redirect_uri:redirect,scope:'archive:status',state:'test-state',resource,code_challenge:challenge,code_challenge_method:'S256'});
 const page=await req('/authorize?'+params,{redirect:'manual'});assert.equal(page.status,200,await page.clone().text());const html=await page.text(),handle=html.match(/name="handle" value="([^"]+)"/)[1],binding=html.match(/name="binding" value="([^"]+)"/)[1];const cookie=page.headers.getSetCookie().map(x=>x.split(';')[0]).join('; ');assert.match(cookie,/__Host-gah-agent-browser/);
 const post=form({handle,binding,decision:'approve'});post.headers={...post.headers,origin:issuer,cookie};post.redirect='manual';
 assert.equal((await req('/authorize',{...post,headers:{...post.headers,cookie:''}})).status,401);
 const approval=await req('/authorize',post);assert.equal(approval.status,302,await approval.clone().text());const code=new URL(approval.headers.get('location')).searchParams.get('code');assert(code);
 const codeReq=form({grant_type:'authorization_code',client_id,code,redirect_uri:redirect,code_verifier:verifier,resource});
 const issued=await req('/oauth2/token',codeReq);assert.equal(issued.status,200,await issued.clone().text());const ct=await issued.json();assert.equal((await req('/api/agent/v1/status',{headers:{authorization:'Bearer '+ct.access_token}})).status,200);
 assert.equal((await req('/oauth2/revoke',form({client_id,token:ct.access_token,token_type_hint:'access_token'}))).status,200);
 assert.equal((await req('/api/agent/v1/status',{headers:{authorization:'Bearer '+ct.access_token}})).status,401);
 assert.notEqual((await req('/oauth2/token',codeReq)).status,200);
 for(let i=0;i<5;i++)assert.equal((await register()).status,200);
 assert.equal((await register()).status,429);
 }finally{await mf?.dispose();await rm(dir,{recursive:true,force:true});}
});
