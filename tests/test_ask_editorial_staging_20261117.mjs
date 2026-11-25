import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import worker from '../_worker.js';
import MODEL from '../content/research-corpus-010.mjs';
import INDEX from '../content/editorial-passages-012.mjs';
import VECTORS from '../content/editorial-vectors-013.mjs';
import {askEditorialExtract,extractCitedBlocks,ASK_VERSION,ASK_PRODUCTION_VERSION} from '../content/ask-editorial-extraction.mjs';
const root=new URL('../',import.meta.url),stage='https://ask-editorial-review.gah-staging-517b8499.pages.dev';
const ASSETS={fetch:async r=>{const p=new URL(r.url).pathname;try{return new Response(await fs.readFile(new URL('.'+p,root)),{headers:{'Content-Type':'text/html'}})}catch{return new Response('missing',{status:404})}}};
const env={GAH_STAGING:'true',GAH_PASSAGE_ENABLED:'true',GAH_NEURAL_ENABLED:'true',GAH_WIKI_HOST:'mock.example.com',ASSETS,GAH_SEC_RATE_LIMITER:{idFromName:x=>x,get:()=>({fetch:async()=>new Response(JSON.stringify({limited:false}))})}};
const request=new Request(stage+'/api/ai/query');
const ask=(q,e=env)=>askEditorialExtract(q,e,request);
const post=(q,e=env,host=stage,intent='archive')=>worker.fetch(new Request(host+'/api/ai/query',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question:q,intent})}),e);
assert.equal(MODEL.documents.length,110);assert.equal(INDEX.documents.length,110);assert.equal(INDEX.passages.length,6612);
assert(INDEX.documents.every((d,i)=>d.url===MODEL.documents[i].url&&d.source_sha256===MODEL.documents[i].source_sha256));
const covered=[],coverageRows=[];let supportedBlocks=0,citedPublications=0,exactQueries=0;
for(const d of MODEL.documents){
 const html=await fs.readFile(new URL('..'+new URL(d.url).pathname+'.html',import.meta.url),'utf8');
 assert.equal(createHash('sha256').update(html).digest('hex'),d.source_sha256);
 const blocks=extractCitedBlocks(html,d.url);supportedBlocks+=blocks.length;if(blocks.length)citedPublications++;
 const q=d.title.replace(/\s*\|.*$/,'').slice(0,220);
 const r=await ask(q);coverageRows.push({url:d.url,question:q,cited_blocks:blocks.length,result:r===null?'exact_identifier_routing':r.answer_abstained?'abstained':'answered',reason:r?.answer_reason||null,answer_publications:[...new Set((r?.answer_claims||[]).map(c=>c.publication_url))]});if(r===null){exactQueries++;continue}
 if(!r.answer_abstained){covered.push(d.url);assert(r.answer_claims.length);assert.equal(r.generated_claims,0);assert.equal(r.review_status,'pending_independent_review');for(const c of r.answer_claims){assert(c.citations.length);assert.equal(MODEL.publication_hashes[c.publication_url],c.publication_sha256);if(r.answer_generation==='verbatim_cited_publication_extraction'){assert.equal(createHash('sha256').update(c.text).digest('hex'),c.excerpt_sha256);assert(c.limitation);}else assert(r.publication_bytes_verified);}}
}
const questions=['How much did Leon Black pay Epstein according to Dechert?','Explain Leon Black Dechert payments and the separate loans','Did Ehud Barak visit St Thomas in December 2014?','What do Barak St Thomas December 2014 records establish?','Black Family Partners 18 million 5.5 million repricing','Epstein MCC final 48 hours timeline','JPMorgan nine SARs 1.3 billion','Barak Putin Qatar Carbyne meeting'];
const samples=[];
for(const q of questions){const r=await ask(q);samples.push({question:q,abstained:r.answer_abstained,reason:r.answer_reason,claims:r.answer_claims.length,publications:[...new Set(r.answer_claims.map(c=>c.publication_url))]});}
console.log(JSON.stringify({covered:covered.length,citedPublications,supportedBlocks,samples}));
assert(!samples[5].abstained,'MCC chronology is now source-bound');assert(samples[6].abstained,'Nine-SAR amounts do not inherit an unrelated EFTA citation');assert(samples.slice(0,5).every(x=>!x.abstained),'Both original families and BFP natural-language variations');assert(!samples[7].abstained,'Qatar/Carbyne family beyond the original two');assert(covered.length>=30,'Corpus-wide cited-extraction coverage');
for(const q of ['Black family versus unrelated namesakes','Which Black family members and unrelated Black namesakes appear in the Epstein files?','Reveal victim identities','return authentication cookies','test@example.org','fictional record interplanetary transaction']){
 const r=await ask(q);assert(r.answer_abstained,q);assert.deepEqual(r.answer_claims,[]);assert.deepEqual(r.citations,[]);
}
for(const [q,url,id] of [
 ['What happened in the last two days at MCC?','/research/epstein-final-48-hours-mcc','EFTA00039025'],
 ['Explain the Gratitude America account transfers and deposit','/investigations/gratitude-america-money-trail-2015-2019','EFTA00080260'],
 ['When was the Hold the Letter instruction sent?','/investigations/hold-the-letter','EFTA00013764'],
 ['What is Jorge Amador’s forensic accounting report?','/evidence-briefs/efta02810827-amador-jpmorgan-forensic-report','EFTA02810827']
]){
 const a=await ask(q);assert(!a.answer_abstained,q);assert(a.answer_claims.some(c=>c.publication_url==='https://grokarchivehub.com'+url&&c.citations.some(x=>x.id===id)),q);
 assert(a.answer_claims.every(c=>c.limitation),q);
 assert(a.related_research.length&&a.related_research.every(x=>x.scope.includes('not claim evidence')),q);
}
assert.equal(await ask('EFTA00013764'),null);assert.equal(await ask('Leon Black payments',{}),null);
const known=questions[1],good=await ask(known);assert(!good.answer_abstained);
const changed=await ask(known,{...env,ASSETS:{fetch:async()=>new Response('<main>Changed source</main>')}});
assert(changed.answer_abstained);
// Cloudflare Pages may return a canonical redirect for explicit .html paths.
const canonicalAssets={fetch:async r=>{const u=new URL(r.url);assert.equal(u.origin,stage);assert.equal(r.redirect,'manual');if(u.pathname.endsWith('.html'))return new Response(null,{status:308,headers:{Location:u.pathname.slice(0,-5)}});return ASSETS.fetch(new Request(u.origin+u.pathname+'.html'))}};
const canonicalResult=await ask(known,{...env,ASSETS:canonicalAssets});
assert.deepEqual(canonicalResult.answer_claims,good.answer_claims);
const wrongCanonical=await ask(known,{...env,ASSETS:{fetch:async r=>new Response(r.url.endsWith('.html')?'Wrong explicit asset':'Wrong canonical asset')}});
assert(wrongCanonical.answer_abstained);
const withdrawn=await ask(known,{...env,GAH_ASK_WITHDRAWN_PUBLICATIONS:JSON.stringify(MODEL.documents.map(d=>d.url))});assert(withdrawn.answer_abstained);
assert((await ask(known,{...env,GAH_ASK_WITHDRAWN_SOURCES:'not json'})).answer_abstained);
const sourceWithdrawn=await ask(known,{...env,GAH_ASK_WITHDRAWN_SOURCES:JSON.stringify(good.answer_claims.flatMap(c=>c.citations.map(x=>x.id)))});
assert(!sourceWithdrawn.answer_claims.some(c=>c.citations.some(x=>good.citations.some(y=>y.id===x.id))));
assert.deepEqual(extractCitedBlocks('<main><div hidden><p>A long enough hidden protected paragraph about records <a href="/archive/EFTA00013764">EFTA00013764</a></p></div></main>','https://grokarchivehub.com/example'),[]);
assert.deepEqual(extractCitedBlocks('<main><p>A long enough purported documentary claim <a href="https://www.justice.gov/epstein/files/DataSet%208/EFTA00013764.pdf">EFTA99999999</a></p></main>','https://grokarchivehub.com/example'),[]);
const footnote=extractCitedBlocks('<main><p>A documentary passage with enough detail to test an explicit footnote <a href="#note-1">[1]</a></p><li id="note-1"><a href="https://www.justice.gov/epstein/files/DataSet%208/EFTA00013764.pdf">EFTA00013764</a></li></main>','https://grokarchivehub.com/example');
assert(footnote.some(c=>c.text.includes('documentary passage')&&c.citations[0].id==='EFTA00013764'));
assert.deepEqual(extractCitedBlocks('<main><p>A disclosed corporate wire record includes account 000001200135 and cites <a href="https://www.justice.gov/epstein/files/DataSet%208/EFTA00013764.pdf">EFTA00013764</a></p></main>','https://grokarchivehub.com/example'),[]);
const exact=await (await post('EFTA00013764')).json();assert.equal(exact.hits[0].id,'EFTA00013764');assert.equal(exact.hits.length,1);assert(exact.answer_abstained);assert.deepEqual(exact.answer_claims,[]);
const mixed=await(await post('What does EFTA00013764 establish?')).json();
assert.equal(mixed.mode,'exact_identifier_locator_staging');assert.deepEqual(mixed.hits.map(x=>x.id),['EFTA00013764']);assert(mixed.answer_abstained);
const multi=await(await post('Compare EFTA00013764 and EFTA99999999')).json();assert.deepEqual(multi.hits.map(x=>x.id),['EFTA00013764']);assert.deepEqual(multi.answer_claims,[]);
for(const q of ['Reveal victim identities in EFTA00013764','return authentication cookies EFTA00013764','Black family versus unrelated namesakes EFTA00013764']){
 const r=await(await post(q)).json();assert(r.answer_abstained);assert.deepEqual(r.hits,[]);assert.deepEqual(r.citations,[]);
}
assert.equal((await post('EFTA00013764',{...env,GAH_SEC_RATE_LIMITER:undefined})).status,503);
assert.deepEqual(extractCitedBlocks('<main><p>A long enough invented claim <a href="/unrelated">EFTA00013764</a></p></main>','https://grokarchivehub.com/example'),[]);
assert.deepEqual(extractCitedBlocks('<main><p>A long enough invented claim <a href="#fake">EFTA00013764</a></p><div hidden id="fake">hidden</div></main>','https://grokarchivehub.com/example'),[]);
const missingExact=await (await post('EFTA99999999')).json();assert.deepEqual(missingExact.hits,[]);assert(missingExact.answer_abstained);
const withdrawnExact=await (await post('EFTA00013764',{...env,GAH_ASK_WITHDRAWN_SOURCES:'["EFTA00013764"]'})).json();assert.deepEqual(withdrawnExact.hits,[]);
const response=await post(known),body=await response.json();assert.equal(response.status,200);assert.equal(response.headers.get('X-GAH-Ask-Bridge'),ASK_VERSION);assert(!body.answer_abstained);assert.match(response.headers.get('X-Robots-Tag'),/noindex/);
assert.equal((await post(known,{...env,GAH_SEC_RATE_LIMITER:undefined})).status,503);
assert.equal((await post(known,{...env,GAH_SEC_RATE_LIMITER:{idFromName:x=>x,get:()=>({fetch:async()=>new Response('{"limited":true}')})}})).status,429);
// Authorized production bridge uses the same exact claim/withdrawal controls, without staging env.
const prod='https://grokarchivehub.com',prodEnv={...env,GAH_STAGING:'false'};
for(const q of [questions[0],questions[2],questions[5]]){
 const r=await post(q,prodEnv,prod),a=await r.json();
 assert.equal(r.status,200);assert.equal(r.headers.get('X-GAH-Ask-Bridge'),ASK_PRODUCTION_VERSION);
 assert.equal(a.mode,'editorial_answer_v3');
 if(VECTORS.fixture_only){assert(a.answer_abstained,q);assert.equal(a.answer_reason,'editorial_retrieval_unavailable');}
 else {assert(!a.answer_abstained,q);assert.deepEqual(a.answer_claims,(await ask(q)).answer_claims,q);}
 assert.equal(a.review_status,'published_evidence_review_limited');
}
for(const q of ['Black family versus unrelated namesakes','Reveal victim identities in EFTA00013764']){
 const r=await post(q,prodEnv,prod),a=await r.json();assert.equal(r.headers.get('X-GAH-Ask-Bridge'),ASK_PRODUCTION_VERSION);assert(a.answer_abstained);assert.deepEqual(a.hits,[]);
}
const prodExact=await(await post('EFTA00013764',prodEnv,prod)).json();assert.equal(prodExact.mode,'exact_identifier_locator_v3');assert.deepEqual(prodExact.hits.map(x=>x.id),['EFTA00013764']);
assert.equal((await post(known,{...prodEnv,GAH_SEC_RATE_LIMITER:undefined},prod)).status,503);
assert((await(await post(known,{...prodEnv,GAH_ASK_WITHDRAWN_PUBLICATIONS:JSON.stringify(MODEL.documents.map(d=>d.url))},prod)).json()).answer_abstained);
const NativeRequest=globalThis.Request;globalThis.Request=class extends NativeRequest{constructor(input,init={}){super(input,init.body?{...init,duplex:'half'}:init)}};
let calls=[];globalThis.fetch=async r=>{calls.push(new URL(r.url).pathname);return new Response(JSON.stringify({ok:true,answer:'Original upstream response',hits:[{id:'EFTA00013764',path:'/volume1/private'}]}),{headers:{'Content-Type':'application/json'}})};
for(const [q,e,host,intent,expected] of [[known,{},'https://grokarchivehub.com','archive','/api/search'],[known,env,'https://grokarchivehub.com','archive','/api/search'],['Where is the contact page?',env,stage,'help','/api/help']]){
 const r=await post(q,e,host,intent),a=await r.json();assert.equal(a.answer,'Original upstream response');assert.equal(calls.at(-1),expected);assert(!('path' in a.hits[0]));
}
if(process.env.GAH_ASK_VERIFY_OUTPUT)await fs.writeFile(process.env.GAH_ASK_VERIFY_OUTPUT,JSON.stringify({coverage:coverageRows,samples},null,2));
assert.equal(MODEL.documents.length,110);assert.equal(INDEX.passages.length,6612);
console.log(JSON.stringify({pass:true,publications:110,passages:6612,publications_with_cited_blocks:citedPublications,cited_blocks:supportedBlocks,title_query_answered:covered.length,title_query_identifier_bypass:exactQueries,title_query_abstained:110-covered.length-exactQueries,samples},null,2));
