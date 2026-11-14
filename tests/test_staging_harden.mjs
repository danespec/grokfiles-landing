// Exercise actual Worker exports, not regex-extracted functions or outdated analytics defaults.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {workerTestSource} from './worker-test-source.mjs';
const source=await fs.readFile(new URL('../_worker.js',import.meta.url),'utf8');
const {default:worker,isStagingEnv,applyStagingPrivacyHeaders,googleTagEnabled,consentBootTag,ensureConsentScript,xReadRouteHtml}=await import('data:text/javascript;base64,'+Buffer.from(workerTestSource(source)+'\nexport {isStagingEnv,applyStagingPrivacyHeaders,googleTagEnabled,consentBootTag,ensureConsentScript,xReadRouteHtml};').toString('base64'));
const stage={GAH_STAGING:'true',GA4_MEASUREMENT_ID:'G-TEST',GAH_GOOGLE_TAG_ENABLED:'true'};
for(const e of [stage,{GAH_STAGING:'TRUE'}])assert(isStagingEnv(e));
for(const e of [{},{GAH_STAGING:'false'},undefined])assert(!isStagingEnv(e));
const r=new Response('hello',{status:200,headers:{'Content-Type':'text/html'}});
const staged=applyStagingPrivacyHeaders(r,stage);
assert.equal(staged.headers.get('X-Robots-Tag'),'noindex, nofollow, noarchive');
assert.equal(staged.status,200);assert.equal(staged.headers.get('Content-Type'),'text/html');
const prod=new Response('hello');assert.equal(applyStagingPrivacyHeaders(prod,{}),prod);
assert.equal(applyStagingPrivacyHeaders(null,stage),null);
assert(!googleTagEnabled(stage));assert(googleTagEnabled({GA4_MEASUREMENT_ID:'G-TEST'}));
assert(googleTagEnabled({}));assert(!googleTagEnabled({GAH_GOOGLE_TAG_ENABLED:'false'}));
const body='<html><head><script>window.GAH_CONSENT_BOOT={"schema":"gah.consent.v2","googleTagEnabled":true,"ga4MeasurementId":"G-OLD"};</script></head><body></body></html>';
const s=ensureConsentScript(body,stage);assert(!s.includes('G-OLD'));assert(s.includes('"googleTagEnabled":false'));assert(s.includes('"ga4MeasurementId":""'));
const p=ensureConsentScript(body,{GA4_MEASUREMENT_ID:'G-TEST'});assert(p.includes('"ga4MeasurementId":"G-TEST"'));assert(!p.includes('G-OLD'));
assert(!consentBootTag(stage).includes('G-TEST'));
const actual=await worker.fetch(new Request('https://grokarchivehub.com/robots.txt'),stage);
assert.equal(actual.status,200);assert.equal(actual.headers.get('X-Robots-Tag'),'noindex, nofollow, noarchive');
const normal=await worker.fetch(new Request('https://grokarchivehub.com/robots.txt'),{});
assert.notEqual(normal.headers.get('X-Robots-Tag'),'noindex, nofollow, noarchive');
const original=globalThis.fetch;let network=0;
globalThis.fetch=async()=>{network++;throw Error('external fetch forbidden')};
try{
 const result=await xReadRouteHtml(new Request('https://grokarchivehub.com/'),{...stage,ASSETS:{fetch:async()=>new Response(null,{status:404})}},'/investigations');
 assert.equal(result.status,404);assert.equal(network,0);
}finally{globalThis.fetch=original;}
console.log('PASS actual Worker staging privacy, production analytics configuration, consent sanitation and zero production fallback network calls');
