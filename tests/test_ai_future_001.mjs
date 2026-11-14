import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import worker,{gahAtlasCatalogHttp} from '../_worker.js';
const catalog=JSON.parse(await fs.readFile(new URL('../atlas/agent-catalog.json',import.meta.url)));
let assetReads=0;
const env={GAH_STAGING:'true',GAH_AGENT_METRICS_SAMPLE_RATE:'0',GAH_SEC_RATE_LIMITER:{idFromName:x=>x,get:()=>({fetch:async()=>Response.json({limited:false})})},ASSETS:{async fetch(input){
  assetReads++;assert.equal(new URL(typeof input==='string'?input:input.url).pathname,'/atlas/agent-catalog.json');
  return Response.json(catalog);
}}};
const req=(p,opts={},hostname='grokarchivehub.com',e=env)=>worker.fetch(new Request('https://'+hostname+p,opts),e);
const first=await req('/api/v1/stories'); assert.equal(first.status,200);
assert.match(first.headers.get('X-Robots-Tag'),/noindex.*nofollow/);
assert.equal(first.headers.get('Cache-Control'),'no-store');
const page=await first.json(); assert.equal(page.stories.length,20);assert.equal(page.next_cursor,20);
assert.equal(page.atlas_version,catalog.atlas_version);
assert.deepEqual(Object.keys(page.stories[0]).sort(),['canonical_url','id','tier']);
assert.equal(page.total_stories,catalog.total_stories);
const seen=new Set();
for(let cursor=0;cursor<catalog.total_stories;cursor+=20){
 const r=await req('/api/v1/stories?cursor='+cursor+'&version='+catalog.atlas_version);
 assert.equal(r.status,200);for(const row of (await r.json()).stories){assert(!seen.has(row.id));seen.add(row.id);}
}
assert.equal(seen.size,catalog.total_stories);
for(const row of catalog.stories){const r=await req('/api/v1/stories/'+row.id);assert.equal(r.status,200);assert.deepEqual((await r.json()).story,row);}
const status=await req('/api/v1/atlas/status');assert.equal(status.status,200);assert.deepEqual((await status.json()).counts,catalog.counts);
const head=await req('/api/v1/stories',{method:'HEAD'});assert.equal(head.status,200);assert.equal(await head.text(),'');assert.equal(head.headers.get('ETag'),first.headers.get('ETag'));
assert.equal((await req('/api/v1/stories',{headers:{'If-None-Match':first.headers.get('ETag')}})).status,304);
assert.equal((await req('/api/v1/stories?limit=2',{headers:{'If-None-Match':first.headers.get('ETag')}})).status,200);
for(const p of ['?limit=51','?limit=0','?cursor=-1','?limit=2&limit=3','?q=anything','?cursor=999999','?limit=01'])assert.equal((await req('/api/v1/stories'+p)).status,400,p);
assert.equal((await req('/api/v1/stories?version=v0')).status,409);
assert.equal((await req('/api/v1/stories/999999')).status,404);
assert.equal((await req('/api/v1/stories/invalid')).status,404);
assert.equal((await req('/api/v1/stories',{method:'POST'})).status,405);
assert.equal((await req('/api/v1/stories',{},'intel.grokarchivehub.com')).status,404);
assert.equal((await req('/atlas/agent-catalog.json')).status,404);
assert.equal((await req('/api/v1/stories',{},'preview.gah-staging-517b8499.pages.dev')).status,200);
assert.equal((await req('/api/v1/stories',{},'preview.gah-staging-517b8499.pages.dev',{})).status,404);
assert.equal((await req('/api/v1/stories',{},'unrelated.pages.dev')).status,404);
assert.equal((await req('/llms.txt',{},'unrelated.pages.dev')).status,404);
const missing={...env,ASSETS:{fetch:async()=>new Response('',{status:404})}};
assert.equal((await req('/api/v1/stories',{},'grokarchivehub.com',missing)).status,200);
assert.equal((await gahAtlasCatalogHttp(new Request('https://grokarchivehub.com/api/v1/stories'),env,'/api/v1/stories',null)).status,503);
const injected=structuredClone(catalog);injected.stories[0].private_note='not public';injected.stories[0].canonical_url='https://private.invalid';
const projected=await gahAtlasCatalogHttp(new Request('https://grokarchivehub.com/api/v1/stories/1'),env,'/api/v1/stories/1',injected);
const projectedBody=await projected.text();assert(!projectedBody.includes('private_note')&&!projectedBody.includes('private.invalid'));
const llms=await req('/llms.txt');assert.equal(llms.status,200);assert.match(await llms.text(),/Story Atlas/);
assert.equal((await req('/llms.txt',{method:'HEAD'})).status,200);
assert.equal((await req('/llms.txt',{method:'POST'})).status,405);
const spec=await (await req('/openapi.json')).json();for(const p of ['/api/v1/stories','/api/v1/stories/{id}','/api/v1/atlas/status'])assert(spec.paths[p].get);
const mcp={method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/list'})};
assert.equal((await req('/mcp',{...mcp,headers:{...mcp.headers,Origin:'https://untrusted.invalid'}})).status,403);
const m=await req('/mcp',mcp);assert.equal(m.status,200);assert((await m.json()).result.tools.length>=3);
const rateEnv={...env,GAH_SEC_RATE_LIMITER:{idFromName:x=>x,get:()=>({fetch:async()=>Response.json({limited:true})})}};
assert.equal((await req('/mcp',mcp,'grokarchivehub.com',rateEnv)).status,429);
assert.equal((await req('/mcp',{...mcp,headers:{...mcp.headers,Origin:'https://grokarchivehub.com'}})).status,200);
assert.equal(assetReads,0,'Atlas discovery must not depend on a mutable asset service');
console.log('PASS all '+seen.size+' story IDs, pagination, version pin, ETags, privacy projection, host/method isolation, fail-closed catalog validation, discovery, OpenAPI and MCP origin gate; '+assetReads+' local asset reads');
