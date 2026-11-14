import assert from 'node:assert/strict';
import {readerQualityResponse} from '../reader-quality.mjs';
import {instrumentHtmlResponse,canInstrumentHtmlResponse,normalizeAnalyticsHtml} from '../workers/lib/analytics-html.mjs';
const html='<html><head><title>Evidence</title><script>window.GAH_CONSENT_BOOT={"old":true};</script></head><body><main>Source context.</main></body></html>';
const scripts='<script>window.GAH_CONSENT_BOOT={"unifiedConsent":true};</script><script src="/frontdoor/analytics.js?v=new"></script><script src="/frontdoor/consent.js?v=new"></script>';
const originalText=Response.prototype.text;
let reads=0;
Response.prototype.text=function(...args){reads++;return originalText.apply(this,args);};
try{
 for(const [path,status] of [['/',200],['/news',200],['/api/private',200],['/assets/example.html',200],['/missing',404]]){
  const request=new Request('https://grokarchivehub.com'+path);
  const make=()=>new Response(html,{status,headers:{'Content-Type':'text/html','Content-Security-Policy':"default-src 'self'",'X-Robots-Tag':'noindex,follow'}});
  const old=await instrumentHtmlResponse(await readerQualityResponse(make(),request),request,scripts);
  const expected=await originalText.call(old);
  reads=0;const source=make();let normalized=false;
  const quality=await readerQualityResponse(source,request,[],canInstrumentHtmlResponse(source,request)?(body,headers)=>{normalized=true;headers.set('X-GAH-Analytics-Instrumentation','GAH-ANALYTICS-PARITY-001');return normalizeAnalyticsHtml(body,scripts);}:undefined);
  const result=normalized?quality:await instrumentHtmlResponse(quality,request,scripts);
  const bodyReads=reads;
  assert.equal(await originalText.call(result),expected,path);
  assert.deepEqual([...result.headers],[...old.headers],path);
  if(path==='/'||path==='/news')assert.equal(bodyReads,1,'public HTML buffers once');
 }
 const canonical=normalizeAnalyticsHtml(html,scripts);
 assert.equal(normalizeAnalyticsHtml(canonical,scripts),canonical);
 const duplicate=canonical.replace('</head>','<script>window.GAH_CONSENT_BOOT={"old":true};</script></head>');
 assert.equal((normalizeAnalyticsHtml(duplicate,scripts).match(/window.GAH_CONSENT_BOOT=/g)||[]).length,1);
}finally{Response.prototype.text=originalText;}
console.log('PASS single buffering pass, unchanged HTML/headers/exclusions, idempotent normalization and duplicate removal');
