import { RESEARCH_ROUTES } from '../content/research-route-policy.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import worker from '../_worker.js';
import {qualityHtml,readerQualityResponse,normalizeReaderTitle} from '../reader-quality.mjs';
import {PAGE_CARDS} from '../content/reader-page-cards.mjs';
const root=new URL('../',import.meta.url),reg=JSON.parse(await fs.readFile(new URL('content/identifier-dossiers.json',root),'utf8'));
const env={ASSETS:{async fetch(req){const u=new URL(typeof req==='string'?req:req.url);for(const path of [u.pathname,u.pathname+'.html',u.pathname.replace(/\/$/,'')+'/index.html']){try{return new Response(await fs.readFile(new URL('.'+path,root)),{headers:{'Content-Type':path.endsWith('.json')?'application/json':'text/html'}})}catch{}}return new Response('not found',{status:404});}}};
const order=['Receipt card','Document context','What the record supports','Source access and verification','Limits and open questions','Where this ID appears','Related published records'];
const decode=s=>s.replace(/&amp;/g,'&').replace(/&#39;|&#x27;/g,"'").replace(/&quot;/g,'"');
for(const e of reg.entries){
 const r=await worker.fetch(new Request('https://grokarchivehub.com/archive/'+e.id),env);assert.equal(r.status,200);
 const h=await r.text(),main=h.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)[1];
 const headings=[...main.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/g)].map(m=>decode(m[1].replace(/<[^>]+>/g,'')));
 assert.deepEqual(headings,order,e.id);assert.match(main,/id="where-cited"/);
 assert.doesNotMatch(main,/on this indexable page|ASCEND evidence context|Read the source review/);
 for(const m of main.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>Read the related source notes/g))assert.ok(!m[1].includes('/archive/'+e.id)&&!m[1].includes('rollcall.com'));
 if(e.sourceSha256)assert.ok(h.includes(e.sourceSha256),e.id+' source fingerprint retained');
}
const held=await(await worker.fetch(new Request('https://grokarchivehub.com/archive/EFTA00013764'),env)).text();
const section=id=>held.match(new RegExp('<section id="'+id+'">([\\s\\S]*?)</section>'))?.[1]||'';
assert.match(section('record-support'),/2-minute-23-second/,'Hold-letter observation belongs under record support');
assert.match(section('source-access'),/5e4075e08ec2a1248eea0ecdb530cfa0c6751ed57ebe8ef3049fbbf64cab0117/,'Source hash belongs with provenance');
assert.match(section('evidence-boundaries'),/does <strong>not<\/strong> identify|does not identify/,'Document limits belong under limits');
const archive=await(await worker.fetch(new Request('https://grokarchivehub.com/archive'),env)).text();
assert.doesNotMatch(archive,/Source locators awaiting verification|excluded from search indexing and the editorial sitemap/);
assert.ok(archive.indexOf('Start with these six records')<archive.indexOf('All 69 published dossiers'));
const all=archive.match(/<section[^>]*id="all-published-dossiers"[^>]*>([\s\S]*?)<\/section>/)[1];assert.equal((all.match(/<li>/g)||[]).length,69);
const topics=await(await worker.fetch(new Request('https://grokarchivehub.com/topics'),env)).text();
assert.doesNotMatch(topics,/strongest indexable|noindex,follow|A topic remains indexable|href="\/wiki"/);assert.match(topics,/href="https:\/\/wiki.grokarchivehub.com\/"/);
const alias=await worker.fetch(new Request('https://grokarchivehub.com/sitemap-archive.xml'),env);assert.equal(alias.status,301);assert.equal(alias.headers.get('Location'),'https://grokarchivehub.com/sitemap-efta.xml');
const blackBookAlias=await worker.fetch(new Request('https://grokarchivehub.com/research/evidence/black-book-epstein'),env);assert.equal(blackBookAlias.status,301);assert.equal(blackBookAlias.headers.get('Location'),'https://wiki.grokarchivehub.com/research/evidence/black-book-epstein');
const sample='<html><head><title>GrokArchiveHub Videos: Watch | Grok Archive Hub</title></head><body><main><a href="/story">Read EFTA00013764</a><code>EFTA02730996</code><script>const untouched="EFTA02338119";</script></main></body></html>';
const h=qualityHtml(sample,'https://grokarchivehub.com/videos',reg.entries);
assert.match(h,/<title>Videos: Watch \| Grok Archive Hub<\/title>/);assert.match(h,/archive\/EFTA00013764/);assert.match(h,/<code><a[^>]+>EFTA02730996<\/a><\/code>/);assert.ok(h.includes('<script>const untouched="EFTA02338119";</script>'));assert.doesNotMatch(h,/<a[^>]*>[^]*?<a[^>]*>Read EFTA00013764/);
for(const [url,c] of Object.entries(PAGE_CARDS)){assert.ok(url.startsWith('https://'));const p=new URL(c.image).pathname;const b=await fs.readFile(new URL('.'+p,root));assert.ok(b.length>1000,url);}
assert.equal(normalizeReaderTitle('GrokArchiveHub Reels: Source notes | Grok Archive Hub'),'Reels: Source notes');
const err=await readerQualityResponse(new Response('<html><head><title>Semantic AI wiki search</title></head><body>Page Not Found</body></html>',{status:404,headers:{'Content-Type':'text/html','Content-Security-Policy':"default-src 'self'"}}),new Request('https://grokarchivehub.com/archive/foo'),reg.entries);
assert.equal(err.status,404);assert.equal(err.headers.get('X-Robots-Tag'),'noindex,follow');assert.equal(err.headers.get('Content-Security-Policy'),"default-src 'self'");assert.doesNotMatch(await err.text(),/Semantic AI/);
const api=new Response('private contract',{status:401,headers:{'Content-Type':'text/html'}});assert.equal(await readerQualityResponse(api,new Request('https://grokarchivehub.com/api/search'),reg.entries),api);
for(const id of ['EFTA00035147','EFTA00039025','EFTA00039356','EFTA00039416','EFTA00039660']){
 const page=await fs.readFile(new URL('archive/'+id+'.html',root),'utf8');assert.match(page,/class="identifier-dossier shell"/);assert.doesNotMatch(page,/id="ask-gah-panel"|STAY INFORMED/);assert.doesNotMatch(page.match(/<main[\s\S]*?<\/main>/)[0],/<footer/);
}
for(const path of ['/investigations/gratitude-america-money-trail-2015-2019','/guides/how-to-search-epstein-files']){
 const page=await(await worker.fetch(new Request('https://grokarchivehub.com'+path),env)).text();
 for(const id of path.includes('gratitude')?['EFTA00153570','EFTA00153571']:['EFTA00646811','EFTA01410768'])assert.match(page,new RegExp('href="(?:https://grokarchivehub.com)?/archive/'+id+'"'));
}
for(const name of ['card-pinboard.jpg','hero-desk.jpg'])assert.ok(!qualityHtml('<html><head><title>Topics</title><meta property="og:image" content="https://grokarchivehub.com/assets/'+name+'"></head><body><main></main></body></html>','https://grokarchivehub.com/topics',reg.entries).includes(name));
const provenance=JSON.parse(await fs.readFile(new URL('tests/legacy-dossier-provenance-20261027.json',root),'utf8'));
for(const [id,hashes] of Object.entries(provenance)){
 const page=await fs.readFile(new URL('archive/'+id+'.html',root),'utf8');assert.doesNotMatch(page,/evidence-dossier\.css|class="[^"\n]*(?:hero|matrix|fact-grid|status-row)/);
 for(const hash of hashes){const at=page.indexOf(hash,page.indexOf('id="source-access"'));assert.ok(at>0&&at<page.indexOf('id="evidence-boundaries"'),id+' source hash retained with verification');}
}
for(const path of ['/research/epstein-final-48-hours-mcc','/latest','/document-autopsies/doug-band-transcript','/document-autopsies/leon-black-transcript','/evidence-briefs/todd-blanche-no-evidence','/investigations/the-motherlode/phone-cdr']){
 const response=await worker.fetch(new Request('https://grokarchivehub.com'+path),env);assert.equal(response.status,200,path);const page=await response.text();const body=(page.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i)||[])[1]||'';
 const text=body.replace(/<!--[\s\S]*?-->|<(?:script|style)\b[^>]*>[\s\S]*?<\/(?:script|style)>/gi,'').replace(/<[^>]+>/g,' ');
 assert.doesNotMatch(text,/GAH-SEO-STORY|DOMINANCE-001|Build: GAH-|AD-EXCLUDE|noindex by route policy|GROK-037B3|094 closeout|Non-Competing/,path);
}
console.log('PASS full dossier section order, complete archive register, topic links, sitemap alias, safe ID linking, '+Object.keys(PAGE_CARDS).length+' share-card assets, branded 404 and API isolation');

for(const route of RESEARCH_ROUTES.filter(r=>r.owner==='wiki')){
 for(const method of ['GET','HEAD']){
  const r=await worker.fetch(new Request('https://grokarchivehub.com'+route.path+'?source=nav',{method}),env);
  assert.equal(r.status,301,route.path+' '+method);assert.equal(r.headers.get('Location'),'https://wiki.grokarchivehub.com'+route.path+'?source=nav');
 }
}
for(const path of ['/book-of-black/index','/book-of-black/index.html']){const r=await worker.fetch(new Request('https://grokarchivehub.com'+path),env);assert.equal(r.status,301);assert.equal(r.headers.get('Location'),'https://grokarchivehub.com/book-of-black');}
const mainMap=await(await worker.fetch(new Request('https://grokarchivehub.com/sitemap.xml'),env)).text();
for(const path of ['/archive/ids','/dispatches/doe-v-black-october-2026-dismissal','/dispatches/phang-ecf59-oct16-2026','/news/epstein-wall-street-records-act-2026','/news/state-attorneys-general-efta-ii-2026'])assert.ok(mainMap.includes('<loc>https://grokarchivehub.com'+path+'</loc>'),path+' sitemap coverage');
assert.equal((mainMap.match(/<loc>/g)||[]).length,195,'Editorial sitemap inventory');
console.log('PASS research aliases preserve one owning host; book landing alias and 195-page main sitemap coverage');
