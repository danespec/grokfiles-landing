import test from 'node:test';
import assert from 'node:assert/strict';
import {readReconciliation} from '../src/reconciliation.mjs';
import {createHandler} from '../src/worker.mjs';
test('reconciliation reports missing and stale data without manufacturing a zero',async()=>{
 const missing=await readReconciliation({});assert.equal(missing.status,'unavailable');assert.deepEqual(missing.metrics,[]);
 const now=Date.now();const snapshot={schema:'gah_reconciliation_v1',generated_at:new Date(now).toISOString(),metrics:[{label:'GA4',value:null,status:'unavailable'}]};
 const env={RECONCILIATION:{get:async()=>snapshot}};
 assert.equal((await readReconciliation(env,now)).metrics[0].value,null);
 assert.equal((await readReconciliation(env,now+7200001)).status,'stale');
 assert.equal((await readReconciliation({RECONCILIATION:{get:async()=>({})}})).status,'unavailable');
});
test('reconciliation shares Access enforcement and cannot accept public writes',async()=>{
 const url='https://intel.grokarchivehub.com/api/reconciliation';
 assert.equal((await createHandler(async()=>false)(new Request(url),{})).status,403);
 const handler=createHandler(async()=>true);
 assert.equal((await handler(new Request(url,{method:'POST'}),{})).status,405);
 const r=await handler(new Request(url),{});assert.equal(r.headers.get('Cache-Control'),'private, no-store, max-age=0');assert.equal((await r.json()).status,'unavailable');
});
