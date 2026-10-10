import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import test from 'node:test';
const s=fs.readFileSync(new URL('../_worker.js',import.meta.url),'utf8');
function slice(a,b){const i=s.indexOf(a),j=s.indexOf(b,i);assert.ok(i>=0&&j>i,'source anchors');return s.slice(i,j);}
const scope={Headers,Response,Request,URL,console};
const corsSource=slice('const WIKI_PUBLIC_SEARCH_ORIGIN', 'async function proxyProofLayer');
vm.runInNewContext(corsSource+'\nglobalThis.getCors=wikiSearchCorsHeaders;\nglobalThis.decorate=decorateWikiSearchCors;',scope);
test('CORS restricted to wiki origin, no cookies',async()=>{
 const ok=new Request('https://grokarchivehub.com/api/search',{headers:{Origin:'https://wiki.grokarchivehub.com'}});
 const bad=new Request('https://grokarchivehub.com/api/search',{headers:{Origin:'https://evil.example'}});
 assert.equal(scope.getCors(ok)['Access-Control-Allow-Origin'],'https://wiki.grokarchivehub.com');
 assert.equal(scope.getCors(bad),null);
 assert.equal(scope.getCors(ok)['Access-Control-Allow-Credentials'],undefined);
 const res=scope.decorate(new Response(JSON.stringify({ok:true}),{headers:{'Content-Type':'application/json'}}),ok);
 assert.equal(res.headers.get('Access-Control-Allow-Origin'),'https://wiki.grokarchivehub.com');
 assert.equal((await res.json()).ok,true);
});
const proxyChunk=slice('async function proxyProofLayer(request, env = {}) {','  const upstream = await fetch(');
const proxyContext={Request,Response,Headers,URL,WIKI_HOST:'wiki.grokarchivehub.com',WIKI_INTERNAL_PROXY_HEADER:'X-GAH-Internal-Wiki-Proxy',WIKI_SERVICE_TOKEN_HEADER:'X-GAH-Wiki-Service-Token',cleanPath:p=>p,isStagingEnv:env=>String(env?.GAH_STAGING)==='true',wikiHost:env=>env?.GAH_WIKI_HOST||'wiki.grokarchivehub.com'};
vm.runInNewContext(proxyChunk+'\n return {url:target.toString(),headers:headersForUpstream};\n}\nglobalThis.hop=proxyProofLayer;',proxyContext);
function input(){return new Request('https://grokarchivehub.com/api/search',{method:'POST',headers:{'X-GAH-Wiki-Service-Token':'ATTACKER_VALUE',Cookie:'apex_session=sensitive',Authorization:'Bearer sample'},body:'{}'});}
test('server token replaces spoofed token and strips credentials',async()=>{
 const h=(await proxyContext.hop(input(),{GAH_WIKI_SERVICE_TOKEN:'T'.repeat(40)})).headers;
 assert.equal(h.get('X-GAH-Wiki-Service-Token'),'T'.repeat(40));
 assert.equal(h.get('cookie'),null);assert.equal(h.get('authorization'),null);
});
test('no token secret means spoofed browser token stripped',async()=>{
 const h=(await proxyContext.hop(input(),{})).headers;
 assert.equal(h.get('X-GAH-Wiki-Service-Token'),null);
});
test('production token not sent to staging mock',async()=>{
 const h=(await proxyContext.hop(input(),{GAH_STAGING:'true',GAH_WIKI_HOST:'mock.gah-staging.example',GAH_WIKI_SERVICE_TOKEN:'T'.repeat(40)})).headers;
 assert.equal(h.get('X-GAH-Wiki-Service-Token'),null);
});
