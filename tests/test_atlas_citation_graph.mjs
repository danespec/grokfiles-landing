import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import worker from '../_worker.js';
import {ATLAS_GRAPH_REVIEW as review} from '../content/atlas-graph-reviewed.mjs';
const raw=await fs.readFile(new URL('../atlas/data.json',import.meta.url));
const source=JSON.parse(raw), catalog=JSON.parse(await fs.readFile(new URL('../atlas/agent-catalog.json',import.meta.url)));
const dossiers=JSON.parse(await fs.readFile(new URL('../content/identifier-dossiers.json',import.meta.url))).entries;
assert.equal(source.internal_only,false);
const hash=createHash('sha256').update(raw).digest('hex');
assert.equal(catalog.published_data_sha256,hash);
const current=hash===review.published_data_sha256;
if(current){
 const story=source.stories.find(s=>s.id===review.story_id);assert(story);
 assert.equal(story.tier,'probable');
 for(const id of review.document_ids){
  assert(story.anchors.some(a=>a.includes(id)));
  assert(!source.privacy_minimized_document_ids.includes(id));
  const doc=dossiers.find(d=>d.id===id);assert(doc?.indexable);assert(new URL(doc.source).hostname==='www.justice.gov');
 }
}
const envFor=data=>({GAH_STAGING:'true',GAH_AGENT_METRICS_SAMPLE_RATE:'0',ASSETS:{fetch:async input=>{
 assert.equal(new URL(typeof input==='string'?input:input.url).pathname,'/atlas/agent-catalog.json');return Response.json(data);
}}});
const env=envFor(catalog);
const get=(p,o={},e=env,h='grokarchivehub.com')=>worker.fetch(new Request('https://'+h+p,o),e);
const path='/api/v1/atlas/graph';
const response=await get(path+'?story='+review.story_id);assert.equal(response.status,200);
const graph=await response.json();
assert.equal(graph.review_status,current?'partial_citation_pilot':'review_required');
assert.equal(graph.edges.length,current?review.document_ids.length:0);
assert.equal(graph.total_stories,source.stories.length);
if(current){
 assert.equal(graph.story_nodes[0].tier,'probable');
 assert.deepEqual(graph.document_nodes.map(x=>x.id),review.document_ids);
 for(const e of graph.edges)assert.deepEqual(e,{from:review.story_id,to:e.to,relation:'cites_public_record'});
}
assert(!JSON.stringify(graph).includes('entry_markdown'));
assert(!JSON.stringify(graph).includes('anchors'));
assert.equal((await get(path+'?story='+review.story_id,{method:'HEAD'})).headers.get('ETag'),response.headers.get('ETag'));
assert.equal((await get(path+'?story='+review.story_id,{headers:{'If-None-Match':response.headers.get('ETag')}})).status,304);
const other=catalog.stories.find(x=>x.id!==review.story_id).id;
const unreviewed=await (await get(path+'?story='+other)).json();
assert.equal(unreviewed.review_status,current?'not_reviewed':'review_required');assert.deepEqual(unreviewed.edges,[]);
const changed=structuredClone(catalog);changed.published_data_sha256='0'.repeat(64);
const stale=await (await get(path,{},envFor(changed))).json();
assert.equal(stale.review_status,'review_required');assert.equal(stale.edges.length,0);
const injected=structuredClone(catalog);injected.edges=[{from:review.story_id,to:'EFTA99999999'}];injected.stories[0].private_note='PRIVATE_MARKER';
const safe=await (await get(path,{},envFor(injected))).text();assert(!safe.includes('EFTA99999999'));assert(!safe.includes('PRIVATE_MARKER'));
for(const q of ['?story=../etc','?story=P4&story=P4','?unknown=1'])assert.equal((await get(path+q)).status,400);
assert.equal((await get(path+'?story=P999999')).status,404);
assert.equal((await get(path+'?version=v0')).status,409);
assert.equal((await get(path,{method:'POST'})).status,405);
assert.equal((await get(path,{},env,'intel.grokarchivehub.com')).status,404);
const mcp=async(method,params)=> (await get('/mcp',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params})})).json();
const tools=(await mcp('tools/list',{})).result.tools;
assert(tools.some(t=>t.name==='get_atlas_citation_graph'));assert(tools.some(t=>t.name==='list_atlas_stories'));
const result=await mcp('tools/call',{name:'get_atlas_citation_graph',arguments:{story:review.story_id}});
assert(!result.result.isError);
assert.deepEqual(JSON.parse(result.result.content[0].text).edges,graph.edges);
const list=await mcp('tools/call',{name:'list_atlas_stories',arguments:{limit:2}});
assert(!list.result.isError);assert.equal(JSON.parse(list.result.content[0].text).stories.length,2);
const bad=await mcp('tools/call',{name:'get_atlas_citation_graph',arguments:{url:'https://private.invalid'}});
assert(bad.result.isError);
console.log('PASS exact publication hash, reviewed citation membership, privacy exclusion, version expiry, graph/MCP parity and input guards');
