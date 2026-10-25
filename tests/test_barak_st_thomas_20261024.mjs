import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import worker from '../_worker.js';

const root=path.resolve(new URL('..',import.meta.url).pathname);
const route='/investigations/barak-st-thomas-dec-2014';
const expected=['story','sequence','anomalies','readings','photos','questions','sources','companions'];
const mock=async r=>{
  const u=new URL(typeof r==='string'?r:r.url);
  let f=u.pathname.slice(1)||'index.html';
  if(['investigations','latest'].includes(f))f+='.html';
  try{return new Response(await readFile(path.join(root,f)),{headers:{'Content-Type':f.endsWith('.json')?'application/json':f.endsWith('.css')?'text/css':f.endsWith('.png')?'image/png':'text/html'}})}
  catch{return new Response('missing',{status:404})}
};
const env=staging=>({ASSETS:{fetch:mock},X_TOKEN_STORE:{get:async()=>null},...(staging?{GAH_STAGING:'true'}:{})});
globalThis.fetch=async()=>{throw Error('Unexpected external fallback')};
const res=await worker.fetch(new Request('https://grokarchivehub.com'+route),env(false));
const html=await res.text();
assert.equal(res.status,200);
assert.equal(res.headers.get('X-Robots-Tag'),'index,follow');
assert.equal(res.headers.get('X-GAH-Ad-Status'),'AD-EXCLUDE');
const sectionIds=[...html.matchAll(/<section class="st-section" id="([^"]+)"/g)].map(m=>m[1]);
assert.deepEqual(sectionIds,expected);
assert.equal((html.match(/<h1\b/g)||[]).length,1);
assert.equal((html.match(/<header class="site-header"/g)||[]).length,1);
assert.match(html,/Thomas’s hypothesis/);
assert.match(html,/Reading B · Alternative explanation/);
assert.match(html,/Neither reading is established as fact/);
assert.match(html,/return as unused or changed, without a record/);
assert.match(html,/31,718/);
assert.match(html,/40,976/);
assert.match(html,/scoped search results/);
assert.doesNotMatch(html,/<img\b/,'article uses no photographic image');
assert.doesNotMatch(html,/(?:src|content)="[^"<>]*(?:bahamas|catamaran|nassau)[^"<>]*"/i);
assert.doesNotMatch(html,/\b(?:TODO|TBD|lorem ipsum|coming soon)\b/i);
const ld=[...html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map(m=>JSON.parse(m[1]));
const article=ld.find(j=>j['@type']==='Article');
assert.ok(article);
assert.equal(article.author.name,'GrokArchiveHub');
assert.equal(article.datePublished,'2026-10-24');
assert.equal(article.citation.length,13);
for(const term of ['Ehud Barak St. Thomas 2014','Ronen Cohen','Barak Epstein island flight','PNR 7HLSOQ'])assert.ok(html.includes(term),term);
assert.match(html,/<meta name="twitter:image" content="https:\/\/grokarchivehub.com\/assets\/barak-st-thomas-document-card.png">/);
const ids=new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]));
for(const m of html.matchAll(/href="#([^"]+)"/g))assert.ok(ids.has(m[1]),'anchor '+m[1]);
for(const id of ['18414','18189','18310','18018','18243','19004','15729','14998','25238','EFTA00356456','EFTA02596796','EFTA02346686','EFTA02300238'])assert.ok(ids.has('source-'+id),id);
assert.equal((html.match(/<li><h3>/g)||[]).length,17,'nine timeline events and eight anomaly entries');
for(const link of ['/barak/entities','/topics','/latest','/investigations/barak-epstein-putin-qatar-carbyne','/investigations/barak-14-leads-evidence-index','/investigations']){
  const r=await worker.fetch(new Request('https://grokarchivehub.com'+link),env(false));
  assert.equal(r.status,200,link);
  assert.ok((await r.text()).includes('href="'+route+'"'),'inbound discovery '+link);
}
const sitemap=await worker.fetch(new Request('https://grokarchivehub.com/sitemap.xml'),env(false));
const xml=await sitemap.text();
assert.ok(xml.includes('<loc>https://grokarchivehub.com'+route+'</loc>'));
assert.equal((xml.match(new RegExp(route,'g'))||[]).length,1);
const staging=await worker.fetch(new Request('https://grokarchivehub.com'+route),env(true));
assert.equal(staging.headers.get('X-Robots-Tag'),'noindex, nofollow, noarchive');
console.log('PASS: eight ordered sections; source anchors; both labeled readings; no photos; Article JSON-LD; search metadata; six discovery routes; unique sitemap entry; production indexability and staging privacy.');
