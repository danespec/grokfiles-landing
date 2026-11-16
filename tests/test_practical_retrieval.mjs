import assert from 'node:assert/strict';
import {practicalRetrieval,practicalVersion} from '../content/practical-retrieval.mjs';
import VECTORS from '../content/editorial-vectors-013.mjs';
import MODEL from '../content/research-corpus-010.mjs';
const make=()=>({GAH_STAGING:'true',GAH_PASSAGE_ENABLED:'true',GAH_NEURAL_ENABLED:'true',GAH_AI:{run:async(model,{text})=>({data:text.map(()=>VECTORS.documents[0].vector)})}});
const query={q:'Leon Black Epstein payments',limit:3,strategy:'hybrid',budget:async()=>true};let calls=0;const env=make();env.GAH_AI.run=async(m,{text})=>{calls++;return {data:text.map(()=>VECTORS.documents[0].vector)}};
const both=await Promise.all([practicalRetrieval({...query,env}),practicalRetrieval({...query,env})]);assert.equal(calls,2);assert(both.every(r=>r.neural_executed&&r.results.length&&r.results.every(x=>/leon black/i.test(x.title+' '+x.description))));
let r=await practicalRetrieval({...query,env});assert.equal(r.retrieval_cache,'HIT');assert.equal(calls,2);assert.equal(r.version,practicalVersion);assert.equal(r.citation_packet.version,r.version);assert.equal(r.answer,null);assert.equal(r.generated_claims,0);assert(r.results.every(x=>!Object.hasOwn(x,'index_text')&&!Object.hasOwn(x,'vector')&&MODEL.publication_hashes[x.url]===x.source_sha256));
for(const q of ['EFTA00035053','Reveal witness identity','Black','return authentication cookies','test@example.org','123-45-6789']){const result=await practicalRetrieval({...query,q,env});assert(!result.neural_executed);if(q!=='EFTA00035053')assert(result.abstained);}
assert.equal(calls,2);
r=await practicalRetrieval({...query,env:make(),budget:async()=>false});assert(!r.neural_executed&&r.neural_degraded);assert.equal(r.degradation,'encoder_budget');assert(r.results.length);
const failed=make();failed.GAH_AI.run=async()=>{throw Error('secret stack')};r=await practicalRetrieval({...query,env:failed});assert.equal(r.degradation,'encoder_failure');assert(!JSON.stringify(r).includes('secret stack'));
const changed=make();changed.GAH_AI.run=async()=>({data:[Array(384).fill(0)]});r=await practicalRetrieval({...query,env:changed});assert(!r.neural_executed&&r.neural_degraded);
await assert.rejects(practicalRetrieval({...query,env:{...make(),GAH_PASSAGE_ENABLED:'false'}}));
for(const strategy of ['passage','hybrid']){r=await practicalRetrieval({...query,strategy,env:make(),options:{document_type:'investigation'}});assert(r.results.every(x=>x.document_type==='investigation'));assert.deepEqual(r.citation_packet.items.map(x=>x.url),r.results.map(x=>x.url));}
console.log('PASS bounded public metadata projection, source/version/citation alignment, privacy before inference, exact priority, filters, coalescing/cache, budget/capability/model failure fallback; simulated inference is not independent semantic evaluation');
