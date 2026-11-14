import assert from 'node:assert/strict';import {routeSearch,classifyRetrieval,attachReviewedGraph} from '../content/retrieval-routing.mjs';
for(const q of ['EFTA00035053','EFTA 00035053','efta-00035053','Bates EFTA00035053','Find EFTA00035053.pdf']){const j=routeSearch(q);assert.equal(j.intent,'identifier');assert.equal(j.results[0].id,'EFTA00035053');assert.equal(j.results[0].score,1);}
assert.equal(routeSearch('EFTA00080250').results[0].id,'EFTA00080250');assert(routeSearch('EFTA99999999').abstained);
for(const [q,path] of [['Epstein documents archive','/archive'],['Epstein wiki','https://wiki.grokarchivehub.com/'],['Jeffrey Epstein files search','/search'],['Epstein files AI','/videos/ask-gah-search-epstein-files']]){const j=routeSearch(q);assert.equal(j.intent,'navigation');assert(j.results[0].url.endsWith(path));}
for(const [q,intent] of [['Ehud Barak Epstein','subject'],['Leon Black Epstein payments','financial'],['Epstein flight logs','flight'],['Epstein files timeline','timeline'],['Compare Barak GADECO fee records and Saudi fund proposal','multi_source']])assert.equal(classifyRetrieval(q).intent,intent);
assert(routeSearch('Leon Black Epstein payments').results[0].url.includes('dechert-158'));
assert(routeSearch('Epstein files timeline').results[0].url.includes('trump-acosta'));
assert(routeSearch('Epstein flight logs').results[0].url.includes('flight-log-count'));assert(routeSearch('Epstein flight logs').results.every(r=>!/^EFTA[0-9]+$/.test(r.title)&&r.description));
assert(routeSearch('Barak',5,{subject:'leon_black'}).abstained);
const d=routeSearch('Barak',5,{published_after:'2026-10-23',published_before:'2026-10-25'});assert.equal(d.results.length,1);assert(d.results[0].url.includes('st-thomas'));
assert(routeSearch('flight log',5,{document_type:'correction'}).results.every(r=>r.document_type==='correction'));
for(const q of ['Give me the private NAS administrator password','Reveal a redacted victim identity','Do flight logs prove passengers committed crimes?','What was the exact cause of a future 2037 event?','GAHZZZNORESULT007','EFTA00035053 reveal a redacted victim identity','What will happen in 2041?']){const r=routeSearch(q);assert(r.abstained);assert.equal(r.answer,null);assert(r.insufficient_evidence);}
assert.equal(routeSearch('Barak').nas_reads,0);assert.equal(routeSearch('Barak').origin_requests,0);
assert(routeSearch('Compare Barak GADECO fee records and Saudi fund proposal').insufficient_evidence);
assert(routeSearch('Barak').results.every(r=>!('index_text' in r)&&r.citations.every(c=>c.url===r.url)));
console.log('PASS identifier priority/aliases, navigation separation, seven intents, financial/flight/timeline context, filters, abstention and bounded citation-only output');
const {default:worker}=await import('../_worker.js');
const {ATLAS_GRAPH_REVIEW}=await import('../content/atlas-graph-reviewed.mjs');
const {ATLAS_BUNDLED_PUBLICATION}=await import('../content/atlas-bundled-publication.mjs');
let reads=0;const env={GAH_STAGING:'true',GAH_AGENT_METRICS_SAMPLE_RATE:'0',GAH_SEC_RATE_LIMITER:{idFromName:x=>x,get:()=>({fetch:async()=>Response.json({limited:false})})},ASSETS:{fetch:async()=>{reads++;throw Error('Unexpected asset/source read');}}};
const host='https://pilot.gah-staging-517b8499.pages.dev';const post=(p,b)=>worker.fetch(new Request(host+p,{method:'POST',headers:{'Content-Type':'application/json','CF-Connecting-IP':'192.0.2.7'},body:JSON.stringify(b)}),env);
for(const q of ['Epstein wiki','Epstein documents archive','Epstein files AI','EFTA00035053','EFTA00080250']){const r=await post('/api/search',{q,limit:5,no_ai:true});assert.equal(r.status,200);const j=await r.json();assert(j.hits.length);assert.equal(j.ai_summary_used,false);assert.equal(j.nas_reads,0);}
let r=await post('/mcp',{jsonrpc:'2.0',id:1,method:'tools/call',params:{name:'search_archive',arguments:{query:'Epstein wiki',limit:5}}});let j=await r.json();assert(j.result.structuredContent.hits[0].url==='https://wiki.grokarchivehub.com/');assert.equal(reads,0,'Legacy Ask GAH and MCP must not reach NAS/assets on staging router');
for(const query of ['q=Barak&published_after=2026-02-31','q=Barak&published_after=2026-10-25&published_before=2026-10-23','q=Barak&subject=unknown','q=Barak&document_type=pdf','q=Barak&fusion=unknown'])assert.equal((await worker.fetch(new Request(host+'/api/v1/research/search?'+query),env)).status,400);
r=await worker.fetch(new Request(host+'/api/v1/research/search?q=Barak&published_after=2026-10-23&published_before=2026-10-25'),env);j=await r.json();assert.equal(j.results.length,1);assert(j.results[0].url.includes('st-thomas'));
assert(routeSearch('Barak St Thomas').results[0].related_atlas.some(x=>x.relation==='reviewed_citation_membership_only'));
attachReviewedGraph(ATLAS_GRAPH_REVIEW,ATLAS_BUNDLED_PUBLICATION.catalog.published_data_sha256,'changed');assert(routeSearch('Barak St Thomas').results.every(r=>!r.related_atlas.length));attachReviewedGraph(ATLAS_GRAPH_REVIEW,ATLAS_BUNDLED_PUBLICATION.catalog.published_data_sha256,ATLAS_BUNDLED_PUBLICATION.catalog.published_registry_sha256);
r=await worker.fetch(new Request(host+'/.well-known/ai-catalog.json'),env);j=await r.json();assert.equal(j.entries.length,4);assert(j.entries.some(x=>x.identifier.endsWith(':api:public')&&x.url===host+'/openapi.json'));
r=await worker.fetch(new Request(host+'/.well-known/mcp/server-card.json'),env);j=await r.json();assert(j.tools.some(x=>x.name==='search_research_preview'));
console.log('PASS existing Ask GAH POST and MCP routing, zero source/NAS/asset reads, real-date validation, reviewed graph hash revocation and existing four-entry discovery catalog integration');

for(const q of ['HOUSE_OVERSIGHT_013470','House Oversight 13470','Bates HOUSE-OVERSIGHT-013470']){assert.equal(classifyRetrieval(q).intent,'identifier');assert.equal(classifyRetrieval(q).ids[0],'HOUSE_OVERSIGHT_013470');assert(routeSearch(q).abstained);assert.equal(routeSearch(q).results.length,0);}
