import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import worker from '../_worker.js';

const root=path.resolve(new URL('..',import.meta.url).pathname);
const manifest=JSON.parse(await readFile(path.join(root,'evidence-data/trump-campaign-records-20261022/source-manifest.json'),'utf8'));
const routes=manifest.articles.map(p=>p.route);
const assets=[];
const mock=async r=>{
  const url=new URL(typeof r==='string'?r:r.url);
  assets.push(url.pathname);
  let file=url.pathname==='/'?'index.html':url.pathname.slice(1);
  if (['latest','investigations'].includes(file)) file+='.html';
  try{return new Response(await readFile(path.join(root,file)),{headers:{'Content-Type':file.endsWith('.json')?'application/json':'text/html'}})}
  catch{return new Response('missing',{status:404})}
};
const env=staging=>({ASSETS:{fetch:mock},X_TOKEN_STORE:{get:async()=>null},...(staging?{GAH_STAGING:'true'}:{})});
globalThis.fetch=async()=>{throw Error('Unexpected external fallback during static-route check')};
for(const article of manifest.articles){
  const response=await worker.fetch(new Request('https://grokarchivehub.com'+article.route),env(false));
  const html=await response.text();
  assert.equal(response.status,200,article.route);
  assert.ok(assets.includes(article.route+'.html'),'exact local asset routed');
  assert.match(response.headers.get('X-Robots-Tag'),/^index,follow$/);
  assert.equal(response.headers.get('X-GAH-Ad-Status'),'AD-EXCLUDE');
  assert.ok(html.includes('href="https://grokarchivehub.com'+article.route+'"'),'canonical');
  assert.equal((html.match(/<h1\b/g)||[]).length,1,'one headline');
  assert.equal((html.match(/<header\b/g)||[]).length,1,'one shared header');
  assert.ok(html.includes('AI-assisted historical source analysis'));
  assert.ok(!html.includes('pagead/js/adsbygoogle.js'),'ad loader absent');
  const json=[...html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map(m=>JSON.parse(m[1]));
  const schema=json.find(j=>j['@type']==='Article');
  assert.equal(schema.headline,article.title);
  assert.equal(schema.datePublished,'2026-10-22');
  assert.equal(schema.author.name,'Grok Archive Hub Editorial Desk');
  assert.ok(schema.citation.length>=4,'source references retained');
  const staging=await worker.fetch(new Request('https://grokarchivehub.com'+article.route),env(true));
  assert.equal(staging.headers.get('X-Robots-Tag'),'noindex, nofollow, noarchive');
  console.log('PASS publication, exact route, metadata, sources, privacy and staging '+article.route);
}
for(const route of ['/','/latest','/investigations']){
  const r=await worker.fetch(new Request('https://grokarchivehub.com'+route),env(false));
  const html=await r.text();
  assert.equal(r.status,200);
  assert.ok(routes.every(p=>html.includes('href="'+p+'"')),'discovery links '+route);
}
const sitemap=await worker.fetch(new Request('https://grokarchivehub.com/sitemap.xml'),env(false));
const xml=await sitemap.text();
assert.ok(routes.every(p=>xml.includes('https://grokarchivehub.com'+p)),'all new articles in sitemap');
const urls=[...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map(m=>m[1]);
assert.equal(new Set(urls).size,urls.length,'no duplicate sitemap URLs');
assert.ok(!xml.includes('https://grokarchivehub.com/investigations/trump-in-the-epstein-files<'),'old noindex allegation review remains excluded');
console.log('PASS discovery links, sitemap uniqueness and existing allegation-review exclusion');
