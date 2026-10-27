import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import worker from '../_worker.js';
const root=new URL('../',import.meta.url);
const registry=JSON.parse(await fs.readFile(new URL('content/identifier-dossiers.json',root),'utf8'));
const expected=registry.entries.filter(e=>e.indexable);
const env={ASSETS:{async fetch(request){const path=new URL(typeof request === "string" ? request : request.url).pathname;try{const body=await fs.readFile(new URL('.'+path,root));return new Response(request.method==='HEAD'?null:body,{headers:{'Content-Type':path.endsWith('.json')?'application/json':path.endsWith('.html')?'text/html':'application/octet-stream'}});}catch{return new Response('missing',{status:404});}}}};
for(const [path,dest] of [['/archive/efta00013764','/archive/EFTA00013764'],['/archive/EFTA13764','/archive/EFTA00013764'],['/archive/efta13764.html','/archive/EFTA00013764']]){
 const r=await worker.fetch(new Request('https://grokarchivehub.com'+path+'?utm_source=test'),env);assert.equal(r.status,301);assert.equal(r.headers.get('Location'),'https://grokarchivehub.com'+dest+'?utm_source=test');
}
for(const path of ['/wiki','/grok-command-v4']){const r=await worker.fetch(new Request('https://grokarchivehub.com'+path),env);assert.equal(r.status,301);assert.equal(r.headers.get('Location'),'https://wiki.grokarchivehub.com/');}
const a=await worker.fetch(new Request('https://grokarchivehub.com/sitemap-efta.xml'),env);assert.equal(a.status,200);const ax=await a.text();
assert.equal((ax.match(/<loc>/g)||[]).length,expected.length);
for(const e of registry.entries)assert.equal(ax.includes('/archive/'+e.id+'</loc>'),e.indexable,e.id+' sitemap gate');
const general=await(await worker.fetch(new Request('https://grokarchivehub.com/sitemap.xml'),env)).text();assert.doesNotMatch(general,/<loc>[^<]*\/archive\/EFTA\d{8}<\/loc>/);assert.match(general,/\/archive\/ids<\/loc>/);
const robots=await(await worker.fetch(new Request('https://grokarchivehub.com/robots.txt'),env)).text();assert.equal((robots.match(/User-agent: \*/g)||[]).length,1);assert.match(robots,/Sitemap: https:\/\/grokarchivehub.com\/sitemap-index.xml/);
for(const e of registry.entries){
 const r=await worker.fetch(new Request('https://grokarchivehub.com/archive/'+e.id),env);assert.equal(r.status,200,e.id);
 const h=await r.text();assert.match(h,new RegExp('<h1[^>]*>'+e.id+' — '));assert.match(h,/Receipt card for EFTA/);assert.match(h,/id="evidence-boundaries"/);assert.match(h,/identifier-cards\/EFTA\d{8}\.png/);
 assert.equal(/noindex/i.test(r.headers.get('X-Robots-Tag')||''),!e.indexable,e.id+' headers');
 assert.equal(/<meta name="robots" content="noindex/i.test(h),!e.indexable,e.id+' meta');
 if(e.indexable){assert.ok(e.source.startsWith('https://www.justice.gov/'));assert.ok(h.includes(e.source.replaceAll('&','&amp;')));assert.match(h,/id="receipt"/);}
 const ld=[...h.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map(m=>JSON.parse(m[1]));assert.ok(ld.some(x=>x.identifier===e.id&&x.isBasedOn===e.source&&x['@type']==='Article'));
 const img=await fs.readFile(new URL('assets/identifier-cards/'+e.id+'.png',root));assert.ok(img.length>1000);
}
// A stale proxy transcript is never republished by the locator renderer.
const source=await fs.readFile(new URL('_worker.js',root),'utf8');const {rewriteArchiveOcrSourceLink,enhanceHtmlText}=await import('data:text/javascript;base64,'+Buffer.from(source+'\nexport {rewriteArchiveOcrSourceLink,enhanceHtmlText};').toString('base64'));
const locator=await rewriteArchiveOcrSourceLink(new Response('<html><head></head><body>UNREVIEWED_PRIVATE_OCR <?xml plist</body></html>',{headers:{'Content-Type':'text/html'}}),new Request('https://grokarchivehub.com/archive/EFTA09999999'),'EFTA09999999');assert.equal(locator.status,200);assert.match(locator.headers.get('X-Robots-Tag'),/noindex/);assert.doesNotMatch(await locator.text(),/UNREVIEWED_PRIVATE_OCR|<\?xml|plist/);
for(const path of ['/latest','/dispatches','/investigations','/entities']){const h=enhanceHtmlText('<html><head><title>Hub</title></head><body><main><h2>Section</h2><h1>Hub</h1></main></body></html>','https://grokarchivehub.com'+path,{},{});assert.ok(h.indexOf('<h1')<h.indexOf('<h2'));}
console.log('PASS '+registry.entries.length+' dossier routes, '+expected.length+' sitemap entries, identifier redirects, cross-host navigation, no OCR locators, JSON-LD, per-ID images and H1 order');
