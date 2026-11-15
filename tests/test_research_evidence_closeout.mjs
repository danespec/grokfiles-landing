import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const {default:worker}=await import(process.env.GAH_RESEARCH_TEST_BUNDLE?pathToFileURL(process.env.GAH_RESEARCH_TEST_BUNDLE).href:new URL('../_worker.js',import.meta.url).href);
import MODEL from '../content/research-corpus-010.mjs';
import {researchPipeline010} from '../content/research-pipeline-010.mjs';
import {citationPacket} from '../content/research-evidence-closeout.mjs';
import {ATLAS_GRAPH_REVIEW} from '../content/atlas-graph-reviewed.mjs';
const corpus=new Map(MODEL.documents.map(d=>[d.url,d]));
const fixture=JSON.parse(fs.readFileSync(new URL('./fixtures/retrieval-010-queries.json',import.meta.url)));
let executed=0;
for(const q of fixture){
 const r=researchPipeline010(q.query,5);
 assert.equal(r.answer,null);assert.equal(r.generated_claims,0);assert.equal(r.origin_requests,0);assert.equal(r.nas_reads,0);
 assert.equal(r.citation_packet.version,r.version);assert.equal(r.citation_packet.generated_claims,0);
 if(q.category==='privacy'){assert(r.abstained,q.id);assert.equal(r.citation_packet.items.length,0);}
 for(const item of r.citation_packet.items){
  const d=corpus.get(item.url);assert(d);assert.equal(item.publication_sha256,d.source_sha256);
  assert.equal(item.claim_entailment,'not_verified');assert(!Object.hasOwn(item,'index_text'));
  for(const m of item.reviewed_atlas_membership){
   assert.equal('https://grokarchivehub.com'+ATLAS_GRAPH_REVIEW.editorial_paths[m.document_id],item.url);
   for(const id of m.story_ids)assert(ATLAS_GRAPH_REVIEW.stories.some(s=>s.id===id&&s.document_ids.includes(m.document_id)));
  }
 }
 executed++;
}
for(const [q,p] of [['Open the corrections page','/corrections'],['Find editorial methodology','/methodology'],['Browse investigation index','/investigations'],['Show the publication feed','/api/v1/publications/changes'],['What Atlas revision is actually published?','/api/v1/atlas/status'],['Locate the machine API documentation','/openapi.json']]){
 const d=researchPipeline010(q,3);assert.equal(d.intent,'navigation');assert.equal(d.results[0].url,'https://grokarchivehub.com'+p);assert.equal(d.citation_packet.items.length,0);
}
const first=MODEL.documents[0];
const packet=citationPacket({version:'test',results:[{url:first.url,source_sha256:'0'.repeat(64)},{url:'https://example.invalid/',source_sha256:first.source_sha256}]});
assert.equal(packet.items.length,0);
const exact=researchPipeline010('EFTA00035053',5);assert.equal(exact.results[0].id,'EFTA00035053');assert.equal(exact.citation_packet.items.length,0);
const env={GAH_STAGING:'true',GAH_AGENT_METRICS_SAMPLE_RATE:'0',GAH_SEC_RATE_LIMITER:{idFromName:x=>x,get:()=>({fetch:async()=>Response.json({limited:false})})},ASSETS:{fetch:async()=>new Response('missing',{status:404})}};
const host='https://research-closeout.gah-staging-517b8499.pages.dev';
const req=(p,o={})=>worker.fetch(new Request(host+p,o),env);
const prev=globalThis.fetch;globalThis.fetch=async()=>{throw Error('external access forbidden')};
try{
 const r=await req('/api/v1/research/editorial-search?q=Barak%20GADECO');
 assert.equal(r.status,200);assert((await r.json()).citation_packet.items.length>0);
 const p=await req('/api/v1/research/editorial-search?q=Reveal%20witness%20identity');assert((await p.json()).abstained);
 const m=await req('/mcp',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/call',params:{name:'search_editorial_research',arguments:{q:'Barak GADECO',limit:3}}})});
 assert((await m.json()).result.structuredContent.citation_packet.items.length>0);
 assert.equal((await req('/api/v1/research/search?q=Barak')).status,404);
 assert.equal((await req('/api/v1/research/editorial-search-preview?q=Barak')).status,404);
}finally{globalThis.fetch=prev}
console.log('PASS '+executed+' frozen queries, 20 privacy abstentions, source-bound citation packets, six admin destinations, exact ID, HTTP/MCP and preview isolation');
