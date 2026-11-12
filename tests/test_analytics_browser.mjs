// Isolated browser contract test: every HTTP request is fulfilled locally.
// No production requests, Google measurements, cookies or browser profiles are reused.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const { chromium } = await import(process.env.GAH_TEST_PLAYWRIGHT_MODULE || 'playwright');
const root = new URL('../', import.meta.url);
const browser = await chromium.launch({channel:process.env.GAH_TEST_BROWSER_CHANNEL || 'chrome',headless:true});
let checks=0;
function check(name,fn){fn();checks++;console.log('PASS '+name);}
async function fixture(options={}) {
 const context=await browser.newContext({userAgent:options.userAgent||'GAH browser fixture',viewport:{width:390,height:844}});
 let tagRequests=0;
 await context.route('**/*',async route=>{
  const url=new URL(route.request().url());
  if(url.hostname==='www.googletagmanager.com') {tagRequests++;return route.fulfill({status:200,contentType:'application/javascript',body:'window.__tag_fixture_loaded = true;'});}
  if(url.pathname.startsWith('/frontdoor/')) {
   const name=url.pathname.slice('/frontdoor/'.length);
   if(!['analytics.js','consent.js','consent.css'].includes(name))return route.abort();
   return route.fulfill({contentType:name.endsWith('.css')?'text/css':'application/javascript',body:await readFile(new URL('frontdoor/'+name,root),'utf8')});
  }
  const boot={schema:'gah.consent.v2',googleTagEnabled:options.enabled!==false,ga4MeasurementId:'G-XHE84C8D1V',unifiedConsent:true,googleCmpAnalyticsEnabled:!!options.cmpPresent};
  return route.fulfill({contentType:'text/html',body:`<!doctype html><html><head><title>Public evidence fixture</title><script>window.GAH_CONSENT_BOOT=${JSON.stringify(boot)};window.dataLayer=[];window.gtag=function(){dataLayer.push(arguments)};gtag('consent','default',{analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});</script><link rel="stylesheet" href="/frontdoor/consent.css"><script src="/frontdoor/analytics.js"></script><script defer src="/frontdoor/consent.js"></script></head><body><h1>Public evidence fixture</h1><a href="https://www.justice.gov/source.pdf">Original PDF</a><a href="https://wiki.grokarchivehub.com/receipts/EFTA00035613">Receipt</a></body></html>`});
 });
 const page=await context.newPage();
 const start=options.url||'https://grokarchivehub.com/archive/EFTA00035613?token=SECRET&email=person%40example.com&utm_source=facebook';
 if(options.cmpPresent) {
  await context.addCookies([{name:'gah_consent_shared_v1',value:encodeURIComponent(JSON.stringify({version:1,choice:'accept',consent:{analytics_storage:'granted'},updated_at:new Date().toISOString()})),domain:'.grokarchivehub.com',path:'/',secure:true,sameSite:'Lax'}]);
  await page.addInitScript(()=>{window.__tcfapi=function(){};});
 }
 await page.goto(start,options.referrer?{referer:options.referrer}:{});await page.waitForSelector('[data-gah-consent-ready]');
 const commands=()=>page.evaluate(()=>Array.from(dataLayer,a=>Array.from(a)));
 const events=async name=>(await commands()).filter(a=>a[0]==='event'&&a[1]===name);
 return {context,page,commands,events,tags:()=>tagRequests};
}
try {
 let f=await fixture();
 check('no Google load before a decision',()=>assert.equal(f.tags(),0));
 await f.page.getByRole('button',{name:'Reject nonessential',exact:true}).click();
 check('reject loads no Google tag',()=>assert.equal(f.tags(),0));
 check('reject queues no pageview',()=>{});assert.equal((await f.events('page_view')).length,0);
 await f.page.getByRole('button',{name:'Privacy choices',exact:true}).click();
 await f.page.getByRole('checkbox',{name:'Analytics storage',exact:true}).check();
 await f.page.getByRole('button',{name:'Save',exact:true}).click();
 await f.page.waitForFunction(()=>document.documentElement.dataset.gahAnalytics==='pageview-queued');
 check('accept loads one Google tag',()=>assert.equal(f.tags(),1));
 let pv=await f.events('page_view');check('accept queues exactly one pageview',()=>assert.equal(pv.length,1));
 check('direct navigation does not invent a referrer',()=>assert.equal(pv[0][2].page_referrer,''));
 check('one correct stream and manual pageview configuration',()=>assert.deepEqual((pv[0][2].send_to),'G-XHE84C8D1V'));
 const config=(await f.commands()).filter(a=>a[0]==='config');check('automatic config pageview suppressed',()=>assert.equal(config[0][2].send_page_view,false));
 check('ordinary traffic has no debug parameter',()=>assert.equal(Object.hasOwn(config[0][2],'debug_mode'),false));
 check('secret and personal query values omitted; campaign retained',()=>{assert(!pv[0][2].page_location.includes('SECRET'));assert(!pv[0][2].page_location.includes('person'));assert(pv[0][2].page_location.includes('utm_source=facebook'));});
 await f.page.evaluate(()=>GAHAnalytics.applyConsent({analytics_storage:'granted'}));
 check('repeated consent produces no duplicate',()=>{});assert.equal((await f.events('page_view')).length,1);
 await f.page.evaluate(()=>history.pushState({},'', '/archive/EFTA00035053'));
 pv=await f.events('page_view');check('one pageview for a changed history route',()=>assert.equal(pv.length,2));
 check('history pageview carries previous internal referrer',()=>assert(pv[1][2].page_referrer.includes('/archive/EFTA00035613')));
 await f.page.evaluate(()=>history.replaceState({},'',location.href+'#section'));
 check('hash-only changes do not duplicate views',()=>{});assert.equal((await f.events('page_view')).length,2);
 await f.page.getByRole('button',{name:'Privacy choices',exact:true}).click();await f.page.getByRole('checkbox',{name:'Analytics storage',exact:true}).uncheck();await f.page.getByRole('button',{name:'Save',exact:true}).click();
 await f.page.evaluate(()=>{GAHAnalytics.event('evidence_engagement',{});history.pushState({},'','/search');});
 check('withdrawal prevents subsequent events',()=>{});assert.equal((await f.events('page_view')).length,2);assert.equal((await f.events('evidence_engagement')).length,0);
 check('consent cookie has no visitor identifier',()=>{});let cookie=(await f.context.cookies()).find(x=>x.name==='gah_consent_shared_v1');assert(cookie?.secure&&cookie.domain.endsWith('grokarchivehub.com'));assert(!decodeURIComponent(cookie.value).includes('client_id'));
 await f.context.close();
 f=await fixture({url:'https://grokarchivehub.com/pdf-lite?id=EFTA00035613'});await f.page.getByRole('button',{name:'Accept all',exact:true}).click();await f.page.waitForFunction(()=>document.documentElement.dataset.gahAnalytics==='pageview-queued');
 check('PDF view separate from its single pageview',()=>{});assert.equal((await f.events('page_view')).length,1);assert.equal((await f.events('pdf_view')).length,1);assert.equal((await f.events('pdf_view'))[0][2].document_id,'EFTA00035613');
 await f.page.goto('https://wiki.grokarchivehub.com/receipts/EFTA00035613');await f.page.waitForFunction(()=>document.documentElement.dataset.gahAnalytics==='pageview-queued');
 check('explicit consent continues across apex and wiki',()=>{});assert.equal((await f.events('page_view')).length,1);assert.equal(await f.page.locator('[data-gah-consent-ui="banner"]').count(),0);
 check('mobile consent UI has no horizontal overflow',()=>{});assert.equal(await f.page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await f.context.close();
 for(const opt of [{url:'https://preview.grokfiles-landing.pages.dev/'},{url:'https://v3-preview.grokarchivehub.com/'},{url:'https://intel.grokarchivehub.com/'},{url:'https://grokarchivehub.com/admin/'},{userAgent:'GAH-Monitor/1.0'},{userAgent:'HeadlessChrome'},{enabled:false}]){
  f=await fixture(opt);await f.page.getByRole('button',{name:'Accept all',exact:true}).click();check('exclusion '+JSON.stringify(opt),()=>assert.equal(f.tags(),0));await f.context.close();
 }
 f=await fixture({cmpPresent:true});check('live CMP pending state overrides an old first-party grant',()=>assert.equal(f.tags(),0));
 await f.page.evaluate(()=>{googlefc.ConsentModePurposeStatusEnum={CONSENT_MODE_PURPOSE_STATUS_GRANTED:1,CONSENT_MODE_PURPOSE_STATUS_DENIED:2};googlefc.getGoogleConsentModeValues=()=>({analyticsStoragePurposeConsentStatus:2});googlefc.callbackQueue[0].CONSENT_MODE_DATA_READY();});check('CMP rejection preserves zero Google loads',()=>assert.equal(f.tags(),0));await f.context.close();
 f=await fixture({referrer:'https://m.facebook.com/some-shared-record?private=do-not-send'});await f.page.getByRole('button',{name:'Accept all',exact:true}).click();await f.page.waitForFunction(()=>document.documentElement.dataset.gahAnalytics==='pageview-queued');pv=await f.events('page_view');check('external referral retained without private query',()=>assert.equal(pv[0][2].page_referrer,'https://m.facebook.com/some-shared-record'));await f.context.close();
 f=await fixture({url:'https://grokarchivehub.com/?gah_debug=1'});await f.page.getByRole('button',{name:'Accept all',exact:true}).click();await f.page.waitForFunction(()=>document.documentElement.dataset.gahAnalytics==='pageview-queued');pv=await f.events('page_view');check('debug navigation is labeled operations traffic',()=>{assert.equal(pv[0][2].traffic_type,'gah_operations');assert.equal(pv[0][2].debug_mode,true);});await f.context.close();
 f=await fixture();await f.page.evaluate(()=>{googlefc.ConsentModePurposeStatusEnum={CONSENT_MODE_PURPOSE_STATUS_GRANTED:1,CONSENT_MODE_PURPOSE_STATUS_DENIED:2};googlefc.getGoogleConsentModeValues=()=>({analyticsStoragePurposeConsentStatus:0});googlefc.callbackQueue[0].CONSENT_MODE_DATA_READY();});check('unknown CMP signal never grants consent',()=>assert.equal(f.tags(),0));
 await f.page.evaluate(()=>{googlefc.getGoogleConsentModeValues=()=>({analyticsStoragePurposeConsentStatus:1});googlefc.callbackQueue[0].CONSENT_MODE_DATA_READY();});await f.page.waitForFunction(()=>document.documentElement.dataset.gahAnalytics==='pageview-queued');check('explicit Google CMP grant releases one view',()=>{});assert.equal((await f.events('page_view')).length,1);
 await f.context.close();
 console.log('PASS '+checks+' isolated browser checks; zero live measurements');
} finally {await browser.close();}
