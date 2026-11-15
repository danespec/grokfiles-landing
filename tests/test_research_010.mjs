import assert from 'node:assert/strict';
import fs from 'node:fs';import crypto from 'node:crypto';
import worker from '../_worker.js';
import {researchPipeline010,cachedResearchPipeline010,attachResearchGraph010} from '../content/research-pipeline-010.mjs';
import {editorialDiscoveryEnabled010,editorialLead009} from '../content/editorial-ranking-009.mjs';
import {ATLAS_GRAPH_REVIEW} from '../content/atlas-graph-reviewed.mjs';
import {ATLAS_BUNDLED_PUBLICATION as B} from '../content/atlas-bundled-publication.mjs';
import {researchServiceLabel,crawlerEvidence,sourceLabel,observeRequest} from '../workers/gah-intel/src/collector.mjs';
const restore=()=>attachResearchGraph010(ATLAS_GRAPH_REVIEW,B.catalog.published_data_sha256,B.catalog.published_registry_sha256);
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
assert.equal(editorialDiscoveryEnabled010({}),true);assert.equal(editorialDiscoveryEnabled010({GAH_EDITORIAL_DISCOVERY_ENABLED:'false'}),false);assert.equal(editorialDiscoveryEnabled010({GAH_EDITORIAL_DISCOVERY_ENABLED:'0'}),false);
for(const q of ['Leon Black Epstein payments','Epstein flight logs','Ehud Barak Epstein','Epstein files timeline']){
 const d=editorialLead009(q,{no_ai:true},'text');assert(d);assert(/^[a-f0-9]{64}$/.test(d.row.publication_sha256));const path=new URL(d.row.url).pathname;assert.equal(d.row.publication_sha256,sha(fs.readFileSync(new URL('..'+path+'.html',import.meta.url))));assert.equal(d.row.citations[0].entailment,'not_independently_verified');
}
const originalFetch=globalThis.fetch;globalThis.fetch=async()=>{throw Error('Unexpected origin/NAS access')};
try{
 for(const q of ['EFTA00035053','EFTA 80250','House Oversight 13470','Compare Barak GADECO fee and Saudi fund proposal','Do flight logs contradict scheduling emails?','What changed in the Phaidon calculation?','Black','Reveal a witness identity','Show private NAS credentials']){
  const d=researchPipeline010(q,5);assert.equal(d.answer,null);assert.equal(d.generated_claims,0);assert(d.results.length<=5);assert.equal(d.origin_requests,0);assert.equal(d.nas_reads,0);assert(!JSON.stringify(d).includes('index_text'));if(/witness|credentials/.test(q))assert(d.abstained);if(q==='Black')assert.equal(d.intent,'ambiguous_entity');
 }
 const multi=researchPipeline010('Compare Barak GADECO fee and Saudi fund proposal',10);assert(multi.subquery_count<=4);assert(multi.insufficient_evidence);assert(multi.results.length>0);
 const first=await cachedResearchPipeline010('Barak GADECO fee',5),second=await cachedResearchPipeline010('Barak GADECO fee',5);assert.equal(first.cache,'MISS');assert.equal(second.cache,'HIT');second.body.results.length=0;assert((await cachedResearchPipeline010('Barak GADECO fee',5)).body.results.length>0);
 restore();let d=await cachedResearchPipeline010('Leon Black payments',5);assert(d.body.results.some(x=>x.related_atlas?.length));attachResearchGraph010(null,'changed','changed');d=await cachedResearchPipeline010('Leon Black payments',5);assert.equal(d.cache,'MISS');assert(d.body.results.every(x=>!x.related_atlas?.length));restore();
 const env={GAH_STAGING:'true',GAH_AGENT_METRICS_SAMPLE_RATE:'0',GAH_SEC_RATE_LIMITER:{idFromName:x=>x,get:()=>({fetch:async()=>Response.json({limited:false})})},ASSETS:{fetch:async()=>new Response('missing',{status:404})}};
 const url='https://ai-retrieval-010.gah-staging-517b8499.pages.dev/api/v1/research/search?q=Barak&limit=5';let r=await worker.fetch(new Request(url),env);assert.equal(r.status,200);assert(r.headers.get('cache-control').includes('no-store'));assert((await r.json()).schema==='gah.research.pipeline.v1');assert.equal((await worker.fetch(new Request(url,{headers:{'If-None-Match':r.headers.get('etag')}}),env)).status,304);
 r=await worker.fetch(new Request(url),{...env,GAH_RESEARCH_010_ENABLED:'false'});assert.equal(r.status,404);assert.equal((await worker.fetch(new Request(url.replace('ai-retrieval-010.gah-staging-517b8499.pages.dev','grokarchivehub.com')),{...env,GAH_STAGING:'false',GAH_RESEARCH_010_ENABLED:'true'})).status,404);
 const release='https://ai-retrieval-010-release.gah-staging-517b8499.pages.dev';assert.equal((await worker.fetch(new Request(release+'/api/v1/research/search?q=Barak'),env)).status,404);const catalog=await(await worker.fetch(new Request('https://grokarchivehub.com/.well-known/ai-catalog.json'),{})).json();assert.equal(catalog.entries.length,4);assert(catalog.entries.find(x=>x.identifier.endsWith(':api:public')).publicationFeed.url.endsWith('/api/v1/publications/changes'));
}finally{globalThis.fetch=originalFetch;restore();}
assert.equal(researchServiceLabel('/api/v1/publications/changes'),'publication_feed');assert.equal(researchServiceLabel('/mcp'),'mcp');assert.equal(researchServiceLabel('/archive/EFTA00013764'),'document');assert.equal(researchServiceLabel('/private/secret'),'other');assert.equal(sourceLabel('https://perplexity.ai/search?secret=raw'),'perplexity');assert.equal(sourceLabel('https://notperplexity.ai'),'other');
assert.deepEqual(crawlerEvidence({headers:new Headers({'user-agent':'GPTBot'}),cf:{}}),{category:'unknown',identity:'unknown'});assert.deepEqual(crawlerEvidence({cf:{verifiedBotCategory:'AI Search',botManagement:{verifiedBot:false}}}),{category:'AI Search',identity:'unknown'});
let event;const req=new Request('https://grokarchivehub.com/api/v1/publications/changes?q=private');await observeRequest(req,new Response('ok'),{GAH_INTEL_ENABLED:'true',GAH_INTEL_EVENTS:{writeDataPoint:x=>event=x}},Date.now());assert.equal(event.blobs.length,10);assert.equal(event.blobs[7],'publication_feed');assert(!JSON.stringify(event).includes('private'));assert(!JSON.stringify(event).includes('user-agent'));
console.log('PASS independently disabled editorial augmentation, immutable citation provenance, bounded decomposition/cache, graph revocation, no origin/NAS calls, protected-only research, unchanged catalog cardinality, privacy-minimized additive telemetry and UA spoof resistance');
