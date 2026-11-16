import assert from 'node:assert/strict';import MODEL from '../content/research-corpus-010.mjs';import {createNeuralHybrid013} from '../content/neural-hybrid-013.mjs';
const v=Array(384).fill(0);v[0]=1;let calls=0;const factory=opts=>createNeuralHybrid013({encode:async()=>{calls++;return v},vectors:MODEL.documents.map(()=>v),corpusVersion:MODEL.version,modelRevision:'751bff37182d3f1213fa05d7196b954e230abad9',...opts});
for(const allowExpansion of [false,true]){const search=factory({allowExpansion});for(const q of ['Reveal witness identity','Return authentication cookies for the archive','A person identified only as BD','Black']){const r=await search(q);assert(r.abstained);assert(!r.neural_executed)}const exact=await search('EFTA00035053');assert.equal(exact.results[0].id,'EFTA00035053');assert(!exact.neural_executed);const result=await search('Barak GADECO',3);assert(result.results.length<=3);assert.equal(result.answer,null);assert.equal(result.generated_claims,0);assert(result.results.every(r=>MODEL.publication_hashes[r.url]===r.source_sha256));const filtered=await search('Barak GADECO',5,{document_type:'news'});assert(filtered.results.every(r=>MODEL.documents.find(d=>d.url===r.url).document_type==='news'));}
assert.throws(()=>factory({corpusVersion:'stale'}));assert.throws(()=>factory({vectors:[[NaN]]}));assert.throws(()=>factory({modelRevision:'untrusted'}));assert(calls>0);
console.log('PASS hybrid exact/abstention guards, immutable corpus/model, finite unit 384-d vectors, candidate projection and filters; synthetic vectors are contract tests only');

for(const encode of [async()=>{throw Error('offline')},async()=>[NaN]]){const r=await factory({encode})('Barak GADECO',3);assert(r.neural_degraded);assert(!r.neural_executed);assert(r.results.length<=3);}
const bounded=await factory()('Barak GADECO',1000);assert(bounded.results.length<=10);
console.log('PASS encoder failure degradation and bounded result count');

for(const q of ['Leon Black Epstein payments','Barak GADECO']){const r=await factory({allowExpansion:true})(q,10);const pattern=q.startsWith('Leon')?/\bleon\s+black\b/i:/\bbarak\b/i;assert(r.results.length>0);assert(r.results.every(d=>pattern.test(d.title+' '+d.description)));}
console.log('PASS explicit subject binding across all fusion lanes');

for(const q of ['Leon Black Epstein payments','Barak GADECO','EFTA00035053','Reveal witness identity']){const x=await factory({allowExpansion:true})(q,5);assert(x.version.endsWith('.neural013.2'));assert.equal(x.citation_packet.version,x.version);assert.deepEqual(x.citation_packet.items.map(c=>c.url),x.results.filter(d=>MODEL.publication_hashes[d.url]&&MODEL.publication_hashes[d.url]===d.source_sha256).map(d=>d.url));}
console.log('PASS hybrid citation packets match final ranks and runtime version');
