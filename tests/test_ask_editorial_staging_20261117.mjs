import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import worker from '../_worker.js';
import {ASK_EDITORIAL_PACKETS as packets,askEditorialCandidate,askEditorialLocators} from '../content/ask-editorial-staging.mjs';
const stage='https://ask-editorial-review.gah-staging-517b8499.pages.dev',env={GAH_STAGING:'true',GAH_WIKI_HOST:'mock.example.com'};
const post=(q,e=env,host=stage,intent='auto')=>worker.fetch(new Request(host+'/api/ai/query',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question:q,intent})}),e);
for(const p of packets){
 const file=new URL('..'+new URL(p.url).pathname+'.html',import.meta.url);const html=await fs.readFile(file,'utf8');
 assert.equal(createHash('sha256').update(html).digest('hex'),p.sha);
 for(const citation of p.receipts){const u=new URL(citation.url);if(u.hash)assert(html.includes('id="'+u.hash.slice(1)+'"'),citation.id);else assert(html.includes(citation.url),citation.id);}
 for(const q of p.questions){
 const r=await post(q),a=await r.json();assert.equal(r.status,200);assert.equal(r.headers.get('X-GAH-Ask-Bridge'),'GAH_ASK_EDITORIAL_STAGING_V1');assert.equal(a.answer_abstained,false);assert.equal(a.review_status,'pending_independent_review');assert.equal(a.hits[0].url,p.url);assert(a.answer_claims.every(c=>c.citations.length&&c.publication_sha256===p.sha));assert(a.editorial_candidates.some(c=>c.url===p.url));assert(!a.answer.includes('undefined'));console.log(q+' => '+a.answer);
 }
}
for(const q of ['Black family versus unrelated namesakes','Which Black family members and unrelated Black namesakes appear in the Epstein files?','Reveal victim identities']){
 const r=await post(q),a=await r.json();assert(a.answer_abstained);assert.deepEqual(a.citations,[]);assert.deepEqual(a.hits,[]);console.log('ABSTAIN: '+q);
}
assert.equal(askEditorialCandidate(packets[0].questions[0],{}),null);
assert.equal(askEditorialCandidate('EFTA02730996',env),null);
assert.deepEqual(askEditorialLocators('EFTA02730996',env),[]);
assert(askEditorialLocators('Epstein final 48 hours MCC',env).length);
const NativeRequest=globalThis.Request;globalThis.Request=class extends NativeRequest{constructor(input,init={}){super(input,init.body?{...init,duplex:"half"}:init)}};
let calls=[];globalThis.fetch=async r=>{calls.push(new URL(r.url).pathname);return new Response(JSON.stringify({ok:true,answer:'Original upstream refusal',hits:[{id:'EFTA00013764',path:'/volume1/private'}]}),{headers:{'Content-Type':'application/json'}})};
for(const [q,e,h,intent,expected] of [[packets[0].questions[0],{},'https://grokarchivehub.com','auto','/api/search'],[packets[0].questions[0],env,'https://grokarchivehub.com','auto','/api/search'],['Where is the contact page?',env,stage,'help','/api/help'],['EFTA00013764',env,stage,'archive','/api/search'],['Epstein final 48 hours MCC',env,stage,'archive','/api/search']]){
 const r=await post(q,e,h,intent),a=await r.json();assert.equal(a.answer,'Original upstream refusal');assert.equal(calls.at(-1),expected);assert(!('path' in a.hits[0]));if(q.startsWith('Epstein final'))assert(a.editorial_candidates.length);else assert(!a.editorial_candidates);
}
console.log('PASS staging-only answers, source hashes/anchors, ranked locators, abstention, exact IDs, navigation, privacy, production bypass');
