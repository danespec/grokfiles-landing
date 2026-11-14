import assert from 'node:assert/strict';
import worker from '../_worker.js';
import {releaseNavigation,publicPublicationFeed,releaseSurfaceEnabled,RELEASE_STAGING_HOST} from '../content/retrieval-release.mjs';
import FEED from '../content/research-preview-feed.mjs';
const origin='https://grokarchivehub.com',stage='https://'+RELEASE_STAGING_HOST;
const requests=[];
const env={GAH_AGENT_METRICS_SAMPLE_RATE:'0',GAH_SEC_RATE_LIMITER:{idFromName:x=>x,get:()=>({fetch:async(_url,init)=>{requests.push(JSON.parse(init.body));return Response.json({limited:false});}})},ASSETS:{fetch:async()=>{throw Error('Unexpected asset read');}}};
const staging={...env,GAH_STAGING:'true'};
const call=(host,p,opts={},e=host===stage?staging:env)=>worker.fetch(new Request(host+p,opts),e);
const post=(host,p,b,e)=>call(host,p,{method:'POST',headers:{'Content-Type':'application/json','CF-Connecting-IP':'192.0.2.4'},body:JSON.stringify(b)},e);
assert(releaseSurfaceEnabled(new Request(origin),env));assert(releaseSurfaceEnabled(new Request(stage),staging));assert(!releaseSurfaceEnabled(new Request(origin),staging));assert(!releaseSurfaceEnabled(new Request(stage),env));
for(const q of ['EFTA00035053','House Oversight 13470','Leon Black payments','Epstein wiki flight logs','Barak search','private NAS password','Epstein archive EFTA00080250'])assert.equal(releaseNavigation(q),null);
const navs=[['Epstein documents archive','/archive'],['Epstein wiki','https://wiki.grokarchivehub.com/'],['Jeffrey Epstein files search','/search'],['Epstein files AI','/videos/ask-gah-search-epstein-files'],['Open the archive','/archive'],['Take me to the wiki','https://wiki.grokarchivehub.com/'],['Where is the search interface?','/search'],['How do I use Ask GAH?','/videos/ask-gah-search-epstein-files'],['Grok Archive Hub search','/search'],['GAH archive','/archive'],['Open the AI assistant guide','/videos/ask-gah-search-epstein-files'],['Where can I search the files?','/search']];
for(const host of [origin,stage]){
 for(const [q,path] of navs){const r=await post(host,'/api/search',{q,limit:5,no_ai:true});assert.equal(r.status,200);const j=await r.json();assert.equal(j.intent,'navigation');assert.equal(j.hits.length,1);assert(j.hits[0].url.endsWith(path));assert.equal(j.answer,null);}
 const rpc=async(method,params)=>(await post(host,'/mcp',{jsonrpc:'2.0',id:1,method,params})).json();
 assert((await rpc('tools/list',{})).result.tools.some(t=>t.name==='get_publication_changes'));
 assert(!(await rpc('tools/list',{})).result.tools.some(t=>t.name==='search_research_preview'));
 const n=await rpc('tools/call',{name:'search_archive',arguments:{query:'Epstein wiki'}});assert.equal(n.result.structuredContent.hits[0].url,'https://wiki.grokarchivehub.com/');
 const f=await rpc('tools/call',{name:'get_publication_changes',arguments:{limit:2}});assert.equal(f.result.structuredContent.items.length,2);
 const spec=await(await call(host,'/openapi.json')).json();assert(spec.paths['/api/v1/publications/changes']);assert(!spec.paths['/api/v1/research/search']);
 assert.equal((await call(host,'/api/v1/research/search?q=Barak')).status,404);
 let cursor=0,items=[];do{const r=await call(host,'/api/v1/publications/changes?limit=10&cursor='+cursor);assert.equal(r.status,200);const data=await r.json();items.push(...data.items);cursor=data.next_cursor;}while(cursor!==null);
 assert.deepEqual(items,FEED.items);
 const r=await call(host,'/api/v1/publications/changes?limit=2');assert.equal((await call(host,'/api/v1/publications/changes?limit=2',{headers:{'If-None-Match':r.headers.get('etag')}})).status,304);
 assert.equal(await(await call(host,'/api/v1/publications/changes',{method:'HEAD'})).text(),'');
 for(const q of ['?q=private','?limit=0','?limit=11','?cursor=999999','?cursor=1&cursor=2','?version='+ 'x'.repeat(129)])assert.equal((await call(host,'/api/v1/publications/changes'+q)).status,400,q);
 assert.equal((await call(host,'/api/v1/publications/changes?version=old')).status,409);
 assert.equal((await call(host,'/api/v1/publications/changes',{method:'POST'})).status,405);
}
for(const host of ['https://intel.grokarchivehub.com','https://unrelated.pages.dev'])assert.equal((await publicPublicationFeed(new Request(host+'/api/v1/publications/changes'),env,async()=>({limited:false}))).status,404);
assert.equal((await publicPublicationFeed(new Request(origin+'/api/v1/publications/changes'),env,async()=>null)).status,503);
assert.equal((await publicPublicationFeed(new Request(origin+'/api/v1/publications/changes'),env,async()=>({limited:true}))).status,429);
assert(requests.some(x=>x.scope==='publication-feed'));
console.log('PASS 12 exact navigation intents on both release surfaces, legacy fallback decision, 31 feed events, version/ETag, MCP/OpenAPI, experimental endpoint closed, rate limits and host isolation');
