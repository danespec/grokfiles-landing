import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import worker,{gahAtlasCatalogHttp} from '../_worker.js';
import {ATLAS_GRAPH_REVIEW as review} from '../content/atlas-graph-reviewed.mjs';
const raw=await fs.readFile(new URL('../atlas/data.json',import.meta.url));
const source=JSON.parse(raw),catalog=JSON.parse(await fs.readFile(new URL('../atlas/agent-catalog.json',import.meta.url)));
const registryRaw=await fs.readFile(new URL('../content/identifier-dossiers.json',import.meta.url));
const dossiers=JSON.parse(registryRaw).entries;
assert.equal(source.internal_only,false);
const hash=createHash('sha256').update(raw).digest('hex');
assert.equal(catalog.published_data_sha256,hash);
const registryHash=createHash('sha256').update(registryRaw).digest('hex');
assert.equal(catalog.published_registry_sha256,registryHash);
const current=hash===review.published_data_sha256&&registryHash===review.published_registry_sha256;
const expected=review.stories.flatMap(s=>s.document_ids.map(id=>({from:s.id,to:id,relation:'cites_public_record'})));
assert(expected.length<=100);
assert.equal(new Set(expected.map(e=>e.from+':'+e.to)).size,expected.length);
assert.equal(new Set(review.stories.map(s=>s.id)).size,review.stories.length);
for(const e of expected){
 assert.match(e.to,/^EFTA[0-9]{8}$/);
 assert.match(review.editorial_paths[e.to],/^\/(reels|investigations)\/[a-z0-9-]+$/);
 await fs.access(new URL('..'+review.editorial_paths[e.to]+'.html',import.meta.url));
 if(current){
  const story=source.stories.find(s=>s.id===e.from);assert(story);
  assert(story.anchors.some(a=>a.match(/\bEFTA[0-9]{8}\b/g)?.includes(e.to)));
  assert(!source.privacy_minimized_document_ids.includes(e.to));
  const doc=dossiers.find(d=>d.id===e.to);assert.equal(doc?.indexable,true);assert.equal(new URL(doc.source).hostname,'www.justice.gov');
 }
}
const envFor=data=>({catalogFixture:data,GAH_STAGING:'true',GAH_AGENT_METRICS_SAMPLE_RATE:'0',GAH_SEC_RATE_LIMITER:{idFromName:x=>x,get:()=>({fetch:async()=>Response.json({limited:false})})},ASSETS:{fetch:async input=>{
 assert.equal(new URL(typeof input==='string'?input:input.url).pathname,'/atlas/agent-catalog.json');return Response.json(data);
}}});
const env=envFor(catalog);
const get=(p,o={},e=env,h='grokarchivehub.com')=>{const request=new Request('https://'+h+p,o);return e===env?worker.fetch(request,e):gahAtlasCatalogHttp(request,e,new URL(request.url).pathname,e.catalogFixture);};
const path='/api/v1/atlas/graph';
const response=await get(path);assert.equal(response.status,200);
const graph=await response.json();
assert.equal(graph.review_status,current?'partial_citation_pilot':'review_required');
assert.deepEqual(graph.edges,current?expected:[]);
assert.equal(graph.total_stories,source.stories.length);
assert.equal(graph.reviewed_story_count,current?review.stories.length:0);
assert.equal(graph.document_nodes.length,current?new Set(expected.map(e=>e.to)).size:0);
for(const d of graph.document_nodes) {
 assert.deepEqual(d,{id:d.id,archive_url:'https://grokarchivehub.com/archive/'+d.id,editorial_canonical_url:'https://grokarchivehub.com'+review.editorial_paths[d.id]});
}
for(const s of review.stories){
 const detail=await (await get(path+'?story='+s.id)).json();
 assert.deepEqual(detail.edges,current?expected.filter(e=>e.from===s.id):[]);
}
for(const id of new Set(expected.map(e=>e.to))){
 const detail=await (await get(path+'?document='+id)).json();
 assert.deepEqual(detail.edges,current?expected.filter(e=>e.to===id):[]);
}
const intersect=await (await get(path+'?story=P13&document=EFTA00022062')).json();
assert.equal(intersect.edges.length,current?1:0);
assert(!JSON.stringify(graph).includes('entry_markdown'));assert(!JSON.stringify(graph).includes('anchors'));
assert.equal((await get(path,{method:'HEAD'})).headers.get('ETag'),response.headers.get('ETag'));
assert.equal((await get(path,{headers:{'If-None-Match':response.headers.get('ETag')}})).status,304);
const other=catalog.stories.find(x=>!review.stories.some(s=>s.id===x.id)).id;
const unreviewed=await (await get(path+'?story='+other)).json();
assert.equal(unreviewed.review_status,current?'no_reviewed_match':'review_required');assert.deepEqual(unreviewed.edges,[]);
const unknown=await (await get(path+'?document=EFTA99999999')).json();assert.equal(unknown.edges.length,0);
const changed=structuredClone(catalog);changed.published_data_sha256='0'.repeat(64);
const stale=await (await get(path,{},envFor(changed))).json();
assert.equal(stale.review_status,'review_required');assert.equal(stale.edges.length,0);
const revoked=structuredClone(catalog);revoked.published_registry_sha256='0'.repeat(64);
const revokedGraph=await (await get(path,{},envFor(revoked))).json();
assert.equal(revokedGraph.review_status,'review_required');assert.equal(revokedGraph.edges.length,0);
const injected=structuredClone(catalog);injected.edges=[{from:'3',to:'EFTA99999999'}];injected.stories[0].private_note='PRIVATE_MARKER';
const safe=await (await get(path,{},envFor(injected))).text();assert(!safe.includes('EFTA99999999'));assert(!safe.includes('PRIVATE_MARKER'));
for(const q of ['?story=../etc','?story=P4&story=P4','?document=../etc','?document=EFTA00022062&document=EFTA00022062','?unknown=1'])assert.equal((await get(path+q)).status,400);
assert.equal((await get(path+'?story=P999999')).status,404);
assert.equal((await get(path+'?version=v0')).status,409);
assert.equal((await get(path,{method:'POST'})).status,405);
for(const host of ['intel.grokarchivehub.com','unrelated.pages.dev'])assert.equal((await get(path,{},env,host)).status,404);
const mcp=async(method,params)=> (await get('/mcp',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params})})).json();
const tools=(await mcp('tools/list',{})).result.tools;
assert(tools.some(t=>t.name==='get_atlas_citation_graph'));assert(tools.some(t=>t.name==='list_atlas_stories'));
const result=await mcp('tools/call',{name:'get_atlas_citation_graph',arguments:{document:'EFTA00022062'}});
assert(!result.result.isError);
assert.deepEqual(JSON.parse(result.result.content[0].text).edges,current?expected.filter(e=>e.to==='EFTA00022062'):[]);
const list=await mcp('tools/call',{name:'list_atlas_stories',arguments:{limit:2}});
assert(!list.result.isError);assert.equal(JSON.parse(list.result.content[0].text).stories.length,2);
const bad=await mcp('tools/call',{name:'get_atlas_citation_graph',arguments:{url:'https://private.invalid'}});
assert(bad.result.isError);
console.log('PASS '+review.stories.length+' reviewed stories, '+expected.length+' citation edges, '+new Set(expected.map(e=>e.to)).size+' public records, reverse lookup, canonical distinction, expiry, privacy, MCP parity and host guards');
