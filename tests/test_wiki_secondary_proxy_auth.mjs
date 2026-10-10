import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import test from 'node:test';
const s=fs.readFileSync(new URL('../_worker.js',import.meta.url),'utf8');
const cut=(a,b)=>{const i=s.indexOf(a),j=s.indexOf(b,i);assert.ok(i>=0&&j>i);return s.slice(i,j)};
const core={Headers,Request,Response,URL,WIKI_HOST:'wiki.grokarchivehub.com',WIKI_INTERNAL_PROXY_HEADER:'X-GAH-Internal-Wiki-Proxy',WIKI_SERVICE_TOKEN_HEADER:'X-GAH-Wiki-Service-Token',isStagingEnv:env=>String(env?.GAH_STAGING)==='true',wikiHost:env=>env?.GAH_WIKI_HOST||'wiki.grokarchivehub.com',RESEARCH_INDEX_UPSTREAM_URL:'https://wiki.grokarchivehub.com/research-index'};
const a={...core};
vm.runInNewContext(cut('async function serveWikiHostNoindexRoute(request, env, path) {','  const upstream = await fetch(new Request(target.toString()',)+'\nreturn headersForUpstream;\n}\nglobalThis.check=serveWikiHostNoindexRoute;',a);
const b={...core};
vm.runInNewContext(cut('async function serveResearchIndexApex(request, env = {}) {','  const upstream = await fetch(new Request(target.toString()',)+'\nreturn headersForUpstream;\n}\nglobalThis.check=serveResearchIndexApex;',b);
const req=()=>new Request('https://grokarchivehub.com/research-index',{headers:{'X-GAH-Wiki-Service-Token':'CLIENT_SPOOF','Cookie':'sensitive_session','Authorization':'Bearer private'}});
test('Wiki-host noindex proxy replaces forged token and strips credentials',async()=>{
 const h=await a.check(req(),{GAH_WIKI_SERVICE_TOKEN:'T'.repeat(40)},'/research-index');
 assert.equal(h.get('X-GAH-Wiki-Service-Token'),'T'.repeat(40));
 assert.equal(h.get('cookie'),null);assert.equal(h.get('authorization'),null);
});
test('Wiki-host noindex proxy disallows production token on staging mock',async()=>{
 const h=await a.check(req(),{GAH_STAGING:'true',GAH_WIKI_HOST:'test.staging.example',GAH_WIKI_SERVICE_TOKEN:'T'.repeat(40)},'/research-index');
 assert.equal(h.get('X-GAH-Wiki-Service-Token'),null);
});
test('Research-index proxy replaces forged token and strips credentials',async()=>{
 const h=await b.check(req(),{GAH_WIKI_SERVICE_TOKEN:'T'.repeat(40)});
 assert.equal(h.get('X-GAH-Wiki-Service-Token'),'T'.repeat(40));
 assert.equal(h.get('cookie'),null);assert.equal(h.get('authorization'),null);
});
test('Research-index proxy without secret removes client-provided token',async()=>{
 const h=await b.check(req(),{});
 assert.equal(h.get('X-GAH-Wiki-Service-Token'),null);
});
