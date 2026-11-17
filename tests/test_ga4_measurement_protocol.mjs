import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {workerTestSource} from './worker-test-source.mjs';
const src=await readFile(new URL('../_worker.js',import.meta.url),'utf8');
const {ga4Config,ga4SearchClient,ga4SearchObservation,handleGa4Event}=await import('data:text/javascript;base64,'+Buffer.from(workerTestSource(src)+'\nexport {ga4Config,ga4SearchClient,ga4SearchObservation,handleGa4Event};').toString('base64'));
const env={GA4_MEASUREMENT_ID:'G-TEST1234',GA4_API_SECRET:'fake-secret',GA4_MP_ENABLED:'true',GAH_GOOGLE_TAG_ENABLED:'true',GAH_SEC_RATE_LIMITER:{idFromName:n=>n,get:()=>({fetch:async()=>Response.json({ok:true,limited:false})})}};
const cookie='gah_consent_shared_v1='+encodeURIComponent(JSON.stringify({version:1,choice:'accept',consent:{analytics_storage:'granted'},updated_at:new Date().toISOString()}))+'; _ga=GA1.1.12345.67890';
const request=(headers={},url='https://grokarchivehub.com/api/search')=>new Request(url,{method:'POST',headers:{'Origin':'https://grokarchivehub.com','Sec-Fetch-Site':'same-origin','X-GAH-Analytics-Consent':'granted','Cookie':cookie,'User-Agent':'Mozilla/5.0',...headers}});
assert.equal(ga4SearchClient(request(),env),'12345.67890');
for(const h of [{'X-GAH-Analytics-Consent':'denied'},{'Sec-GPC':'1'},{DNT:'1'},{Cookie:''},{'User-Agent':'Googlebot'},{Origin:'https://evil.example'},{'Sec-Fetch-Site':'cross-site'}])assert.equal(ga4SearchClient(request(h),env),'');
assert.equal(ga4SearchClient(request(),{...env,GAH_STAGING:'true'}),'');
assert.equal(ga4SearchClient(request(),{...env,GA4_MP_ENABLED:'false'}),'');
assert.equal(ga4SearchClient(request(),{...env,GA4_MP_DRY_RUN:'true'}),'');
assert.equal(ga4SearchClient(request({},'https://grokarchivehub.com/api/private'),env),'');
assert.equal((await handleGa4Event(request({},'https://grokarchivehub.com/api/analytics/event'),env)).status,405);
const status=await (await handleGa4Event(new Request('https://grokarchivehub.com/api/analytics/event'),env)).json();assert.equal(status.mode,'live');assert.equal(status.public_event_submission,false);
let sent=[];
const originalFetch=globalThis.fetch;
globalThis.fetch=async (url,init)=>{sent.push({url,body:JSON.parse(init.body)});return new Response(null,{status:204});};
try{
 for(const count of [7,0])await ga4SearchObservation(request(),Response.json({ok:true,hit_count:count,query:'private@example.com',hits:[{text:'private document'}]}),env,'12345.67890');
 assert.equal(sent.length,2);assert.equal(sent[0].body.events[0].name,'archive_search');assert.equal(sent[1].body.events[0].name,'archive_search_zero_results');
 assert.equal(sent[0].body.events[0].params.result_count,7);assert(!JSON.stringify(sent).includes('private'));assert(!JSON.stringify(sent[0].body).includes('fake-secret'));assert.equal(sent[0].body.consent.ad_user_data,'DENIED');
 await ga4SearchObservation(request(),Response.json({ok:true,hit_count:1}),{...env,GAH_SEC_RATE_LIMITER:undefined},'12345.67890');
 await ga4SearchObservation(request(),Response.json({ok:false,hit_count:1}),env,'12345.67890');
 assert.equal(sent.length,2);
}finally{globalThis.fetch=originalFetch;}
console.log('PASS MP consent, staging isolation, privacy, no public relay, fail-closed rate limiter, positive and zero-result events');
