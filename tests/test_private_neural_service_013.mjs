import assert from 'node:assert/strict';
import {privateNeuralServer013} from '../scripts/private_neural_service_013.mjs';
let calls=0,fail=false,unblock;const wait=new Promise(r=>unblock=r);
const search=async q=>{calls++;if(q==='wait')await wait;if(fail)throw Error('private exception');return {version:'fixture',results:[],abstained:false,neural_executed:true};};
const service=privateNeuralServer013(search,{maxConcurrency:1});const address=await service.listen(),base='http://127.0.0.1:'+address.port;
const post=(data,headers={})=>fetch(base+'/search',{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(data)});
try{
 assert.equal((await fetch(base+'/health')).status,200);
 assert.equal((await fetch(base+'/search')).status,405);
 assert.equal((await post({q:'question'},{Origin:'https://foreign.invalid'})).status,403);
 assert.equal((await post({q:'question',limit:11})).status,400);
 assert.equal((await post({q:'question',document_type:null})).status,400);
 assert.equal((await post({q:'question',published_after:'2026-02-31'})).status,400);
 assert.equal((await post({q:'x'.repeat(3000)})).status,413);
 const a=await(await post({q:'question'})).json();assert(!a.cache_hit);const b=await(await post({q:'question'})).json();assert(b.cache_hit);assert.equal(calls,1);assert(!('q' in b));
 const pending=post({q:'wait'});while(calls<2)await new Promise(r=>setTimeout(r,5));assert.equal((await post({q:'another'})).status,503);unblock();assert.equal((await pending).status,200);
 fail=true;const error=await post({q:'fail'});assert.equal(error.status,503);assert(!(await error.text()).includes('private exception'));
}finally{unblock();await service.close();}
const rate=privateNeuralServer013(search,{maxRequests:1});const endpoint=await rate.listen();
try{const req=()=>fetch('http://127.0.0.1:'+endpoint.port+'/search',{method:'POST',headers:{'Content-Type':'application/json'},body:'{"q":"question"}'});await req();const r=await req();assert.equal(r.status,429);assert.equal(r.headers.get('Retry-After'),'60');}finally{await rate.close();}
console.log('PASS synthetic transport controls: loopback/origin, request bounds, cache, bounded concurrency, limiter and exception privacy; not relevance validation');
