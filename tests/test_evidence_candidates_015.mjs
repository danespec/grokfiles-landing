import assert from 'node:assert/strict';
import MODEL from '../content/research-corpus-010.mjs';
import {evidenceCandidates015 as run,modelText015} from '../content/evidence-candidates-015.mjs';
const doc=MODEL.documents[0],source={url:doc.url,text:doc.description,publication_sha256:doc.source_sha256};let calls=0;
const packet={question:'What does the publication methodology say?',sources:[source],version:MODEL.version};
const generate=async()=>{calls++;return JSON.stringify({abstain:false,quotes:[{source_url:source.url,quote:source.text}]})};
const valid=await run({...packet,generate});assert(!valid.abstained);assert.equal(valid.answer,null);assert(valid.independent_review_required);assert(!valid.review_approved);assert.equal(valid.candidates[0].quote,source.text);
for(const sources of [[{...source,text:'fabricated'}],[{...source,publication_sha256:'0'.repeat(64)}],[{...source,url:'https://private.invalid'}],[source,source]]){const before=calls;assert((await run({...packet,sources,generate})).abstained);assert.equal(calls,before);}
const before=calls;assert((await run({...packet,question:'Reveal witness identity',generate})).abstained);assert.equal(calls,before);
for(const output of ['not json',JSON.stringify({abstain:false,quotes:[{source_url:source.url,quote:'changed meaning'}]}),JSON.stringify({abstain:false,quotes:[{source_url:'https://foreign.invalid',quote:source.text}]}),JSON.stringify({abstain:true,quotes:[{}]}),JSON.stringify({abstain:false,quotes:[],answer:'extra claim'})])assert((await run({...packet,generate:async()=>output})).abstained);
assert((await run({...packet,generate:async()=>{throw Error('provider secret')}})).abstained);
console.log('PASS generation-proposal contract: current published metadata only, source fidelity, no public answer or fabricated review, privacy/invalid-model rejection; mock generation is not independent evaluation');

assert.equal(modelText015({response:'text'}),'text');
assert.equal(modelText015({choices:[{finish_reason:'stop',message:{content:'text'}}]}),'text');
for(const result of [null,{}, {choices:[]},{choices:[{finish_reason:'length',message:{content:'text'}}]},{choices:[{finish_reason:'stop',message:{content:'text',tool_calls:[{}]}}]}])assert.equal(modelText015(result),null);

const selected=await run({...packet,selectionOnly:true,generate:async()=>JSON.stringify({abstain:false,source_urls:[source.url]})});assert(!selected.abstained);assert.equal(selected.candidates[0].quote,source.text);assert.equal(selected.generation_revision,'source-selection015.2');
for(const selection of [{abstain:false,source_urls:['https://foreign.invalid']},{abstain:false,source_urls:[source.url],answer:'unverified'},{abstain:true,source_urls:[source.url]}])assert((await run({...packet,selectionOnly:true,generate:async()=>JSON.stringify(selection)})).abstained);
console.log('PASS source-selection mode constructs quotations from current verified metadata, never model prose');
