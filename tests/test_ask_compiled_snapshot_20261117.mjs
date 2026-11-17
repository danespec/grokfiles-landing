// Run against the advanced server-only Worker bundle, outside checkout.
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
const worker=(await import(pathToFileURL(path.resolve(process.argv[2])))).default;
const base='https://grokarchivehub.com';
let reads=0;
const env={ASSETS:{fetch:async()=>{reads++;throw Error('asset route unavailable')}},GAH_SEC_RATE_LIMITER:{idFromName:x=>x,get:()=>({fetch:async()=>new Response('{"limited":false}')})}};
async function post(q,e=env){
 const r=await worker.fetch(new Request(base+'/api/ai/query',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question:q,query:q,intent:'auto',limit:8})}),e);
 assert.equal(r.status,200);assert.equal(r.headers.get('x-gah-ask-bridge'),'GAH_ASK_EDITORIAL_V3');return r.json();
}
for(const [q,ids] of [
 ['What does the Dechert report say Leon Black paid Epstein?',['EFTA02730996','EFTA02731023']],
 ['Did Ehud Barak go to St. Thomas in December 2014?',['EFTA00356456','leak id 18414','leak id 18310','leak id 19004']],
 ['What happened in the last two days at MCC?',['EFTA00039025']],
 ['Black Family Partners 18 million 5.5 million repricing',[]]
]){
 const a=await post(q);assert.equal(a.answer_abstained,false,q);
 assert(a.answer_claims.every(c=>c.publication_sha256&&c.limitation&&c.citations.length));
 for(const id of ids)assert(a.citations.some(c=>c.id===id),id);
 console.log('BUNDLE PASS',q,a.answer_claims.length);
}
for(const q of ['Black family versus unrelated namesakes','Reveal victim identities in EFTA00013764','JPMorgan nine SARs 1.3 billion'])assert((await post(q)).answer_abstained,q);
const q='What does the Dechert report say Leon Black paid Epstein?';
const withdrawn=await post(q,{...env,GAH_ASK_WITHDRAWN_PUBLICATIONS:JSON.stringify(['https://grokarchivehub.com/reels/leon-black-dechert-158-million-efta02730996','https://grokarchivehub.com/evidence-briefs/leon-black-158m-170m-epstein-payments','https://grokarchivehub.com/investigations/leon-black-2023-sdny-referral-status'])});
assert(withdrawn.answer_abstained);
assert((await post(q,{...env,GAH_ASK_WITHDRAWN_SOURCES:'not json'})).answer_abstained);
assert.equal(reads,0,'No dependency on mutable asset routing');
console.log('PASS compiled snapshot, no asset reads, withdrawal and privacy');
