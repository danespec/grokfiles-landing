// Real browser, real Google loader, intercepted GA4 requests: never emit live test measurements.
// --candidate substitutes only the checked-in browser runtime for the deployed one.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const {chromium}=await import(process.env.GAH_TEST_PLAYWRIGHT_MODULE||'playwright');
const candidate=process.argv.includes('--candidate');
const source=await readFile(new URL('../frontdoor/analytics.js',import.meta.url),'utf8');
const browser=await chromium.launch({channel:process.env.GAH_TEST_BROWSER_CHANNEL||'chrome',headless:true});
try{
 for(const url of ['https://grokarchivehub.com/search?gah_debug=1','https://wiki.grokarchivehub.com/?gah_debug=1']){
  const context=await browser.newContext({userAgent:'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36'});
  const page=await context.newPage();
  const views=[];
  // Capture every GA4 collection request, including batched POST payloads, locally.
  await context.route(/(?:google-analytics\.com\/g\/[a-z/]*collect|\/zrth\/ga\/g\/c)/,async route=>{
   const req=route.request(),u=new URL(req.url()),data=req.postData()||'';
   if(u.searchParams.get('en')==='page_view'||/(^|[&\n])en=page_view(?:&|$)/.test(data))views.push({tid:u.searchParams.get('tid'),url:u.searchParams.get('dl')});
   await route.fulfill({status:204,body:''});
  });
  if(candidate)await page.route(/\/(?:frontdoor|__gah-analytics)\/analytics\.js(?:\?|$)/,route=>route.fulfill({contentType:'application/javascript',body:source}));
  await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});
  await page.waitForTimeout(1200);
  assert.equal(views.length,0,url+': no pageview before explicit consent');
  const allow=page.getByRole('button',{name:'Allow analytics',exact:true});
  await allow.first().click({timeout:10000});
  await page.waitForFunction(()=>!!window.google_tag_manager,{},{timeout:15000});
  for(let i=0;i<40&&views.length<1;i++)await page.waitForTimeout(250);
  await page.waitForTimeout(1500);
  assert.equal(views.length,1,url+': exactly one consented pageview');
  assert.equal(views[0].tid,'G-XHE84C8D1V');
  await page.evaluate(()=>window.GAHAnalytics.applyConsent({analytics_storage:'granted'}));
  await page.waitForTimeout(800);
  assert.equal(views.length,1,url+': repeated consent must not duplicate pageview');
  console.log('PASS '+url+' — no pre-consent view, one grant view, no duplicate');
  await context.close();
 }
}finally{await browser.close();}
