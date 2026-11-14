import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import worker from '../_worker.js';
const catalog=JSON.parse(await fs.readFile(new URL('../atlas/agent-catalog.json',import.meta.url)));
let reads=0,calls=0,payload;
const base={GAH_STAGING:'true',GAH_AGENT_METRICS_SAMPLE_RATE:'0',ASSETS:{fetch:async()=>{reads++;return Response.json(catalog);}}};
const get=(path='/api/v1/stories',env=base,opts={},host='grokarchivehub.com')=>worker.fetch(new Request('https://'+host+path,{...opts,headers:{'CF-Connecting-IP':'192.0.2.1',...opts.headers}}),env);
for(const limiter of [undefined,{idFromName:x=>x,get:()=>({fetch:async()=>{throw Error('unavailable');}})},
 {idFromName:x=>x,get:()=>({fetch:async()=>Response.json({})})}]){
 const response=await get('/api/v1/stories',{...base,GAH_SEC_RATE_LIMITER:limiter});
 assert.equal(response.status,503);assert.equal(response.headers.get('Cache-Control'),'no-store');
 assert.equal(response.headers.get('Retry-After'),'60');assert.equal(reads,0);
}
const limiter=limited=>({idFromName:x=>x,get:()=>({fetch:async(url,init)=>{calls++;payload=JSON.parse(init.body);return Response.json({limited});}})});
const blocked=await get('/api/v1/atlas/graph',{...base,GAH_SEC_RATE_LIMITER:limiter(true)});
assert.equal(blocked.status,429);assert.equal(blocked.headers.get('Retry-After'),'60');assert.equal(reads,0);
assert.deepEqual(payload,{op:'check',scope:'atlas-public',key:'192.0.2.1',max:60,windowMs:60000});
const success=await get('/api/v1/stories',{...base,GAH_SEC_RATE_LIMITER:limiter(false)});assert.equal(success.status,200);assert.equal(reads,1);
const env={...base,GAH_SEC_RATE_LIMITER:limiter(false)};const previous=calls;
assert.equal((await get('/api/v1/stories',env,{},'intel.grokarchivehub.com')).status,404);
assert.equal((await get('/api/v1/stories',env,{method:'POST'})).status,405);
assert.equal(calls,previous);
assert.equal((await get('/api/v1/stories?cursor=0&cursor=1',env)).status,400);assert.equal(calls,previous);
console.log('PASS atomic Atlas throttle: denial before assets, outage fail closed, no KV fallback, host/method guards and scoped client key');
