import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import worker from '../_worker.js';
const root=new URL('../',import.meta.url);
const env={GAH_STAGING:'true',GAH_AGENT_METRICS_SAMPLE_RATE:'0',ASSETS:{async fetch(input){
 const path=new URL(typeof input==='string'?input:input.url).pathname;
 try{return new Response(await fs.readFile(new URL('.'+path,root)),{headers:{'Content-Type':path.endsWith('.json')?'application/json':'text/html'}});}
 catch{return new Response(null,{status:404});}
}}};
const get=(path,options={})=>worker.fetch(new Request('https://grokarchivehub.com'+path,options),env);
const a=await get('/.well-known/ai-catalog.json');assert.equal(a.status,200);
const catalog=await a.json();
assert.equal(catalog.specVersion,'1.0');assert.equal(catalog.entries.length,4);
assert.equal(new Set(catalog.entries.map(e=>e.identifier)).size,4);
for(const e of catalog.entries){
 const u=new URL(e.url);assert.equal(u.origin,'https://grokarchivehub.com');assert.equal((await get(u.pathname)).status,200);
 if(e.identifier.endsWith(':server:research-mcp')||e.identifier.endsWith(':api:public'))assert(e.representativeQueries.some(q=>q.includes('Story Atlas')));
}
for(const p of ['/api/v1/stories','/api/v1/atlas/graph','/api/v1/atlas/status','/videos/ask-gah-search-epstein-files'])assert(a.headers.get('Link').includes('<'+p+'>'));
assert.match(a.headers.get('Content-Signal'),/ai-train=no/);
const api=await (await get('/.well-known/api-catalog')).json();
const entry=api.linkset[0];assert(entry['service-doc'].some(d=>d.href.endsWith('/llms.txt')));
assert(entry['service-doc'].some(d=>d.href.endsWith('/videos/ask-gah-search-epstein-files')&&d.title.includes('not a public agent API')));
assert(entry.status.some(d=>d.href.endsWith('/api/v1/atlas/status')));
assert.deepEqual(entry.related.map(r=>new URL(r.href).pathname),['/atlas/','/api/v1/stories','/api/v1/atlas/graph']);
const spec=await (await get('/openapi.json')).json();
for(const p of ['/api/v1/stories','/api/v1/atlas/graph','/api/v1/atlas/status'])assert(spec.paths[p]?.get);
const mcp=await (await get('/.well-known/mcp/server-card.json')).json();
for(const t of ['list_atlas_stories','get_atlas_citation_graph'])assert(mcp.tools.some(x=>x.name===t));
const llms=await (await get('/llms.txt')).text();
for(const path of ['/videos/ask-gah-search-epstein-files','/investigations/barak-st-thomas-dec-2014','/investigations/barak-epstein-putin-qatar-carbyne','/investigations/leon-black-2023-sdny-referral-status'])assert(llms.includes('https://grokarchivehub.com'+path));
assert(!JSON.stringify(catalog).includes('/api/ai/'));assert(!JSON.stringify(api).includes('/api/ai/'));
const skills=await (await get('/.well-known/agent-skills/index.json')).json();
assert.equal(skills.skills.length,3);
for(const s of skills.skills){const r=await get(s.url);assert.equal(r.status,200);assert.equal('sha256:'+crypto.createHash('sha256').update(await r.text()).digest('hex'),s.digest);}
const robots=await (await get('/robots.txt')).text();assert.match(robots,/ai-train=no/i);
for(const p of ['/api/x/','/api/ai/','/api/phang-docket/','/api/analytics/','/api/newsletter/'])assert(robots.includes('Disallow: '+p));
const head=await get('/.well-known/ai-catalog.json',{method:'HEAD'});assert.equal(head.status,200);assert.equal(await head.text(),'');assert.equal(head.headers.get('Link'),a.headers.get('Link'));
console.log('PASS discovery catalog links, advertised tools, source-first subject routes, three skill digests, HEAD, training policy and private-route exclusions');
