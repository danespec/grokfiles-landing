import assert from 'node:assert/strict';
import {normalizeAnalyticsHtml,instrumentHtmlResponse} from '../workers/lib/analytics-html.mjs';
import {readFile} from 'node:fs/promises';
import {workerTestSource} from './worker-test-source.mjs';
const source=await readFile(new URL('../_worker.js',import.meta.url),'utf8');
const {default:worker,googleTagEnabled,consentScriptTag}=await import('data:text/javascript;base64,'+Buffer.from(workerTestSource(source)+'\nexport {googleTagEnabled,consentScriptTag};').toString('base64'));
const html='<html><head><title>Source</title><script>window.GAH_CONSENT_BOOT={"ga4MeasurementId":"G-OLD"};</script><script src="/frontdoor/consent.js?v=old" defer></script></head><body><main>Public evidence content</main></body></html>';
const scripts=consentScriptTag({GAH_GOOGLE_TAG_ENABLED:'true',GA4_MEASUREMENT_ID:'G-XHE84C8D1V'});
const out=normalizeAnalyticsHtml(html,scripts);assert.equal((out.match(/window.GAH_CONSENT_BOOT=/g)||[]).length,1);assert.equal((out.match(/src="\/frontdoor\/analytics.js/g)||[]).length,1);assert.equal((out.match(/src="\/frontdoor\/consent.js/g)||[]).length,1);assert(!out.includes('G-OLD'));assert(out.includes('<main>Public evidence content</main>'));
assert.equal(googleTagEnabled({GAH_GOOGLE_TAG_ENABLED:'false'}),false);assert.equal(googleTagEnabled({GAH_GOOGLE_TAG_ENABLED:'true'}),true);assert.equal(googleTagEnabled({GAH_STAGING:'true',GAH_GOOGLE_TAG_ENABLED:'true'}),false);
assert(!consentScriptTag({GAH_STAGING:'true'}).includes('G-XHE84C8D1V'));
for(const [url,status,type,expected] of [['https://grokarchivehub.com/',200,'text/html',true],['https://grokarchivehub.com/missing',404,'text/html',false],['https://grokarchivehub.com/api/private',200,'text/html',false],['https://intel.grokarchivehub.com/',200,'text/html',false],['https://grokarchivehub.com/file.pdf',200,'application/pdf',false]]){
 const r=await instrumentHtmlResponse(new Response(html,{status,headers:{'Content-Type':type,'X-Robots-Tag':'noindex,follow','Content-Security-Policy':"default-src 'self'"}}),new Request(url),scripts);
 assert.equal(r.headers.get('X-GAH-Analytics-Instrumentation')!==null,expected);assert.equal(r.headers.get('X-Robots-Tag'),'noindex,follow');assert.equal(r.headers.get('Content-Security-Policy'),"default-src 'self'");
}
console.log('PASS response normalization, shared configuration, consent flag, staging isolation, private-route exclusions and preserved security/indexing policy');
