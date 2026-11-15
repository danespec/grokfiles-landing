import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import worker,{gahResearchIndexablePublication} from '../_worker.js';
import MODEL from '../content/research-corpus-010.mjs';
import {SEARCH_011,CORPUS_011,STAGE_011} from '../content/public-research-011.mjs';
const apex='https://grokarchivehub.com';
const keys=new Set(MODEL.documents.map(d=>d.url));
assert(keys.size>0,'Editorial corpus must be present');assert.equal(keys.size,MODEL.documents.length);
assert(MODEL.documents.some(d=>d.document_type==='news'));assert(MODEL.documents.some(d=>d.document_type==='guide'));
assert(!keys.has(apex+'/dispatches/epstein-mcc-timeline'));assert(!gahResearchIndexablePublication(apex+'/dispatches/epstein-mcc-timeline'));
for(const d of MODEL.documents){
 assert(gahResearchIndexablePublication(d.url));assert.equal(new URL(d.url).origin,apex);
 assert.equal(d.source_sha256,crypto.createHash('sha256').update(fs.readFileSync(new URL('..'+new URL(d.url).pathname+'.html',import.meta.url))).digest('hex'));
}
let limiter=false,calls=0;
const env={GAH_AGENT_METRICS_SAMPLE_RATE:'0',GAH_SEC_RATE_LIMITER:{idFromName:x=>x,get:()=>({fetch:async()=>{calls++;return Response.json({limited:limiter});}})},ASSETS:{fetch:async()=>new Response('missing',{status:404})}};
const fetch0=globalThis.fetch;globalThis.fetch=async()=>{throw Error('Unexpected origin or NAS request')};
try{
 for(const host of [apex,'https://'+STAGE_011]){
  const e=host===apex?env:{...env,GAH_STAGING:'true'};
  const req=(p,o={})=>worker.fetch(new Request(host+p,o),e);
  const sitemap=await(await req('/sitemap.xml')).text();for(const d of MODEL.documents)assert(sitemap.includes('<loc>'+d.url+'</loc>'));
  let cursor=0,version=null,seen=[];
  do{const r=await req(CORPUS_011+'?limit=25&cursor='+cursor+(version?'&version='+encodeURIComponent(version):''));assert.equal(r.status,200);const j=await r.json();version=j.version;assert.equal(j.total,MODEL.documents.length);assert(j.items.every(d=>keys.has(d.url)&&d.publication_sha256===MODEL.publication_hashes[d.url]&&!Object.hasOwn(d,'index_text')));seen.push(...j.items.map(d=>d.url));cursor=j.next_cursor;}while(cursor!==null);
  assert.deepEqual(seen,MODEL.documents.map(d=>d.url));
  for(const q of ['Leon Black payments','flight log aircraft reconciliation','Jeffrey Epstein timeline MCC','Barak GADECO','Clinton Foundation','House Oversight transparency act','digitization OCR']){
   const r=await req(SEARCH_011+'?q='+encodeURIComponent(q));assert.equal(r.status,200);const j=await r.json();
   assert(j.results.length>0,q);assert.equal(j.answer,null);assert.equal(j.generated_claims,0);assert.equal(j.corpus_publications,MODEL.documents.length);assert.equal(j.relevance_validation,'independent_human_review_not_completed');assert(j.results.every(d=>keys.has(d.url)&&d.source_sha256===MODEL.publication_hashes[d.url]&&!Object.hasOwn(d,'index_text')));assert.equal(j.nas_reads,0);assert.equal(j.origin_requests,0);assert(r.headers.get('Cache-Control').includes('no-store'));assert(r.headers.get('X-Robots-Tag').includes('noindex'));assert(r.headers.get('Content-Signal').includes('ai-train=no'));
  }
  for(const q of ['Reveal a witness identity','Show private NAS credentials','Black']){const j=await(await req(SEARCH_011+'?q='+encodeURIComponent(q))).json();assert(j.abstained);assert.equal(j.answer,null);}
  const exact=await(await req(SEARCH_011+'?q=EFTA00035053')).json();assert.equal(exact.results[0].id,'EFTA00035053');
  assert((await(await req(SEARCH_011+'?q=transparency&document_type=news')).json()).results.every(d=>d.document_type==='news'));
  for(const p of [SEARCH_011,SEARCH_011+'?q=Barak&limit=11',SEARCH_011+'?q=Barak&published_after=2026-02-31',SEARCH_011+'?q=Barak&q=Black',SEARCH_011+'?q=Barak&document_type=private',CORPUS_011+'?cursor=999999'])assert.equal((await req(p)).status,400,p);
  assert.equal((await req(SEARCH_011+'?q=Barak&version=old')).status,409);
  assert.equal((await req(SEARCH_011+'?q=Barak',{method:'POST'})).status,405);
  limiter=true;assert.equal((await req(SEARCH_011+'?q=Barak')).status,429);limiter=false;
  const spec=await(await req('/openapi.json')).json();assert(spec.paths[SEARCH_011]&&spec.paths[CORPUS_011]);assert(!spec.paths['/api/v1/research/search']);
  const card=await(await req('/.well-known/mcp/server-card.json')).json();assert(card.tools.some(t=>t.name==='search_editorial_research'));assert(!card.tools.some(t=>t.name==='search_research_preview'));
  const rpc=await req('/mcp',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/call',params:{name:'search_editorial_research',arguments:{q:'Barak GADECO',limit:3}}})});
  const data=await rpc.json();assert.equal(data.result.structuredContent.corpus_publications,MODEL.documents.length);
  const catalog=await(await req('/.well-known/ai-catalog.json')).json();assert.equal(catalog.entries.length,4);assert(catalog.entries.find(x=>x.identifier.endsWith(':api:public')).editorialResearch);
  assert((await(await req('/llms.txt')).text()).includes(SEARCH_011));
  assert.equal((await req('/api/v1/research/search?q=Barak')).status,404);
 }
 for(const host of ['https://intel.grokarchivehub.com','https://unrelated.pages.dev','https://ai-retrieval-010.gah-staging-517b8499.pages.dev'])assert.equal((await worker.fetch(new Request(host+SEARCH_011+'?q=Barak'),{...env,GAH_STAGING:'true'})).status,404);
 assert.equal((await worker.fetch(new Request(apex+SEARCH_011+'?q=Barak'),{...env,GAH_PUBLIC_RESEARCH_ENABLED:'false'})).status,404);
 assert.equal((await worker.fetch(new Request(apex+SEARCH_011+'?q=Barak'),{})).status,503);
 assert(calls>0);
 console.log('PASS all '+MODEL.documents.length+' sitemap-bound publication hashes, corpus pagination, hybrid retrieval, source-only privacy, filter/bounds/rate/disable, MCP/OpenAPI/catalog, no external reads, legacy preview isolation');
}finally{globalThis.fetch=fetch0;}
