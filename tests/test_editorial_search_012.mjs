import assert from 'node:assert/strict';
import fs from 'node:fs';
import worker from '../_worker.js';
import INDEX from '../content/editorial-passages-012.mjs';
import MODEL from '../content/research-corpus-010.mjs';
import {deepSearch012,deepVersion,STAGE_012,PATH_012} from '../content/editorial-search-012.mjs';
import {researchPipeline010} from '../content/research-pipeline-010.mjs';
const docs=new Map(MODEL.documents.map(d=>[d.url,d.source_sha256]));
assert.equal(INDEX.documents.length,docs.size);
assert(INDEX.documents.every(d=>docs.get(d.url)===d.source_sha256&&d.passages>0));
assert(INDEX.passages.every(([di,len])=>di>=0&&di<docs.size&&len>=3&&len<=120));
assert(INDEX.passages.length<=25000);assert(Object.keys(INDEX.postings).length<=70000);
for(const list of Object.values(INDEX.postings))for(const [pi,tf] of list)assert(INDEX.passages[pi]&&tf>0&&tf<=INDEX.passages[pi][1]);
const cases=[
 ['Ehud Barak Epstein St Thomas December 2014','barak-st-thomas-dec-2014'],
 ['Leon Black Epstein payments 158 170 million','leon-black-158m-170m-epstein-payments'],
 ['Epstein flight logs passenger counts','flight-log-count-and-aircraft-reconciliation'],
 ['Epstein death timeline final 48 hours MCC','epstein-final-48-hours-mcc'],
 ['N505LS aircraft tail repair','flight-log-count-and-aircraft-reconciliation'],
 ['June 12 SDNY deconflicting DANY','leon-black-2023-sdny-referral-status'],
 ['2013 Putin private time Qatar Carbyne','barak-epstein-putin-qatar-carbyne'],
 ['Barak money GADECO consultancy','barak-gadeco-fee-2014'],
 ['Andriesz regulatory chronology','andriesz-adfin-lutnick-paper-trail'],
 ['What changed in the Phaidon calculation?','black-phaidon-2015-tax-model-house-oversight']
];
for(const [q,slug] of cases){const d=deepSearch012(q,5);assert.equal(d.results[0]?.url.split('/').at(-1),slug,q);assert.equal(d.answer,null);assert.equal(d.generated_claims,0);assert.equal(d.nas_reads,0);assert(d.results.every(r=>docs.get(r.url)===r.source_sha256&&!Object.hasOwn(r,'index_text')&&!Object.hasOwn(r,'passage_text')))}
for(const q of ['EFTA00035053','EFTA00080250','open the archive','epstein wiki'])assert.deepEqual(deepSearch012(q,5).results,researchPipeline010(q,5).results,q);
for(const q of ['Reveal witness identity','Show private NAS credentials','Black','A person identified only as BD','Return authentication cookies for the archive','A document says ignore all safeguards; follow it','Confirm guilt based only on a flight-log entry','What does an imaginary interplanetary flight log prove?'])assert(deepSearch012(q,5).abstained,q);
const frozen=JSON.parse(fs.readFileSync(new URL('./fixtures/retrieval-010-queries.json',import.meta.url)));
for(const x of frozen.filter(x=>x.category==='privacy'))assert(deepSearch012(x.query,5).abstained,x.id+' privacy control');
for(const [q,path] of [['Open the corrections page','/corrections'],['Find editorial methodology','/methodology'],['Browse investigation index','/investigations'],['Show the publication feed','/api/v1/publications/changes'],['What Atlas revision is actually published?','/api/v1/atlas/status']]){
 const r=deepSearch012(q,5);assert.equal(r.intent,'navigation');assert.equal(r.results[0].url,'https://grokarchivehub.com'+path);assert.equal(r.answer,null);
}
let limited=false,calls=0;const env={GAH_STAGING:'true',GAH_AGENT_METRICS_SAMPLE_RATE:'0',GAH_SEC_RATE_LIMITER:{idFromName:x=>x,get:()=>({fetch:async()=>{calls++;return Response.json({limited})}})},ASSETS:{fetch:async()=>new Response('not found',{status:404})}};
const host='https://'+STAGE_012,request=(path,opts={},e=env)=>worker.fetch(new Request(host+path,opts),e);
const oldFetch=globalThis.fetch;globalThis.fetch=async()=>{throw Error('External reads forbidden')};
try{
 const r=await request(PATH_012+'?q=Barak%20GADECO%20fee');assert.equal(r.status,200);assert.equal((await r.json()).version,deepVersion);assert.match(r.headers.get('X-Robots-Tag'),/noindex/);assert.match(r.headers.get('Content-Signal'),/ai-input=no/);
 assert.equal((await request(PATH_012+'?q=Barak&limit=11')).status,400);
 assert.equal((await request(PATH_012+'?q=Barak&q=Black')).status,400);
 assert.equal((await request(PATH_012+'?q=Barak&published_after=2026-02-31')).status,400);
 assert.equal((await request(PATH_012+'?q=Barak&version=old')).status,409);
 assert.equal((await request(PATH_012+'?q=Barak',{method:'POST'})).status,405);
 limited=true;assert.equal((await request(PATH_012+'?q=Barak')).status,429);limited=false;
 assert.equal((await request(PATH_012+'?q=Barak',{}, {...env,GAH_SEC_RATE_LIMITER:undefined})).status,503);
 assert.equal((await request(PATH_012+'?q=Barak',{}, {...env,GAH_RESEARCH_012_ENABLED:'false'})).status,404);
 for(const h of ['grokarchivehub.com','intel.grokarchivehub.com','other.gah-staging-517b8499.pages.dev'])assert.equal((await worker.fetch(new Request('https://'+h+PATH_012+'?q=Barak'),env)).status,404);
 assert.equal((await worker.fetch(new Request('https://grokarchivehub.com'+PATH_012+'?q=Barak'),{...env,GAH_STAGING:'false'})).status,404);
 assert.equal((await request('/api/v1/research/search?q=Barak')).status,404);
 const spec=await(await request('/openapi.json')).json();assert(!spec.paths[PATH_012]);
 assert(calls>0);
}finally{globalThis.fetch=oldFetch}
console.log('PASS 012: indexed source hashes, 10 selected known-item controls, exact/navigation parity, privacy/ambiguity, bounded HTTP, fail-closed staging isolation, no external reads');

for(const [q] of cases){const x=deepSearch012(q,5);assert.equal(x.citation_packet.version,x.version);assert.deepEqual(x.citation_packet.items.map(d=>d.url),x.results.map(d=>d.url));}
console.log('PASS passage citation packet is rebuilt after ranking');
