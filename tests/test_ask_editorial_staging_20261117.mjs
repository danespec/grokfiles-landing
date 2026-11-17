import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import worker from '../_worker.js';
import MODEL from '../content/research-corpus-010.mjs';
import INDEX from '../content/editorial-passages-012.mjs';
import {askEditorialExtract,extractCitedBlocks,ASK_VERSION} from '../content/ask-editorial-extraction.mjs';
const root=new URL('../',import.meta.url),stage='https://ask-editorial-review.gah-staging-517b8499.pages.dev';
const ASSETS={fetch:async r=>{const p=new URL(r.url).pathname;try{return new Response(await fs.readFile(new URL('.'+p,root)),{headers:{'Content-Type':'text/html'}})}catch{return new Response('missing',{status:404})}}};
const env={GAH_STAGING:'true',GAH_PASSAGE_ENABLED:'true',GAH_NEURAL_ENABLED:'true',GAH_WIKI_HOST:'mock.example.com',ASSETS,GAH_SEC_RATE_LIMITER:{idFromName:x=>x,get:()=>({fetch:async()=>new Response(JSON.stringify({limited:false}))})}};
const request=new Request(stage+'/api/ai/query');
const ask=(q,e=env)=>askEditorialExtract(q,e,request);
const post=(q,e=env,host=stage,intent='archive')=>worker.fetch(new Request(host+'/api/ai/query',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question:q,intent})}),e);
assert.equal(MODEL.documents.length,105);assert.equal(INDEX.documents.length,105);assert.equal(INDEX.passages.length,6411);
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
assert(samples.filter(x=>!x.abstained).length>=4,'Beyond two question families');
for(const q of ['Black family versus unrelated namesakes','Which Black family members and unrelated Black namesakes appear in the Epstein files?','Reveal victim identities','return authentication cookies','test@example.org','fictional record interplanetary transaction']){
 const r=await ask(q);assert(r.answer_abstained,q);assert.deepEqual(r.answer_claims,[]);assert.deepEqual(r.citations,[]);
}
assert.equal(await ask('EFTA00013764'),null);assert.equal(await ask('Leon Black payments',{}),null);
const known=questions[1],good=await ask(known);assert(!good.answer_abstained);
const changed=await ask(known,{...env,ASSETS:{fetch:async()=>new Response('<main>Changed source</main>')}});
assert(changed.answer_abstained);
const withdrawn=await ask(known,{...env,GAH_ASK_WITHDRAWN_PUBLICATIONS:JSON.stringify(MODEL.documents.map(d=>d.url))});assert(withdrawn.answer_abstained);
assert((await ask(known,{...env,GAH_ASK_WITHDRAWN_SOURCES:'not json'})).answer_abstained);
const sourceWithdrawn=await ask(known,{...env,GAH_ASK_WITHDRAWN_SOURCES:JSON.stringify(good.answer_claims.flatMap(c=>c.citations.map(x=>x.id)))});
assert(!sourceWithdrawn.answer_claims.some(c=>c.citations.some(x=>good.citations.some(y=>y.id===x.id))));
assert.deepEqual(extractCitedBlocks('<main><div hidden><p>A long enough hidden protected paragraph about records <a href="/archive/EFTA00013764">EFTA00013764</a></p></div></main>','https://grokarchivehub.com/example'),[]);
const response=await post(known),body=await response.json();assert.equal(response.status,200);assert.equal(response.headers.get('X-GAH-Ask-Bridge'),ASK_VERSION);assert(!body.answer_abstained);assert.match(response.headers.get('X-Robots-Tag'),/noindex/);
assert.equal((await post(known,{...env,GAH_SEC_RATE_LIMITER:undefined})).status,503);
assert.equal((await post(known,{...env,GAH_SEC_RATE_LIMITER:{idFromName:x=>x,get:()=>({fetch:async()=>new Response('{"limited":true}')})}})).status,429);
const NativeRequest=globalThis.Request;globalThis.Request=class extends NativeRequest{constructor(input,init={}){super(input,init.body?{...init,duplex:'half'}:init)}};
let calls=[];globalThis.fetch=async r=>{calls.push(new URL(r.url).pathname);return new Response(JSON.stringify({ok:true,answer:'Original upstream response',hits:[{id:'EFTA00013764',path:'/volume1/private'}]}),{headers:{'Content-Type':'application/json'}})};
for(const [q,e,host,intent,expected] of [[known,{},'https://grokarchivehub.com','archive','/api/search'],[known,env,'https://grokarchivehub.com','archive','/api/search'],['Where is the contact page?',env,stage,'help','/api/help'],['EFTA00013764',env,stage,'archive','/api/search']]){
 const r=await post(q,e,host,intent),a=await r.json();assert.equal(a.answer,'Original upstream response');assert.equal(calls.at(-1),expected);assert(!('path' in a.hits[0]));
}
if(process.env.GAH_ASK_VERIFY_OUTPUT)await fs.writeFile(process.env.GAH_ASK_VERIFY_OUTPUT,JSON.stringify({coverage:coverageRows,samples},null,2));
assert.equal(MODEL.documents.length,105);assert.equal(INDEX.passages.length,6411);
console.log(JSON.stringify({pass:true,publications:105,passages:6411,publications_with_cited_blocks:citedPublications,cited_blocks:supportedBlocks,title_query_answered:covered.length,title_query_identifier_bypass:exactQueries,title_query_abstained:105-covered.length-exactQueries,samples},null,2));
