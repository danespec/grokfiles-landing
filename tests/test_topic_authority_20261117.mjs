import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import worker,{gahResearchIndexablePublication} from '../_worker.js';
import {READER_EDITORIAL_METADATA as meta} from '../content/reader-editorial-metadata.mjs';
import {HeadHtmlRewriterFixture as Rewriter} from './fixtures/html-rewriter-head.mjs';
globalThis.HTMLRewriter=Rewriter;
const root=new URL('../',import.meta.url),base='https://grokarchivehub.com';
const data=JSON.parse(await fs.readFile(new URL('tests/fixtures/topic-authority-20261117.json',root),'utf8'));
const atlas=JSON.parse(await fs.readFile(new URL('atlas/data.json',root),'utf8'));
const priv=new Set(atlas.privacy_minimized_document_ids);
const env={ASSETS:{async fetch(req){const u=new URL(typeof req==='string'?req:req.url);for(const p of [u.pathname,u.pathname+'.html',u.pathname.replace(/\/$/,'')+'/index.html']){try{return new Response(await fs.readFile(new URL('.'+p,root)),{headers:{'Content-Type':p.endsWith('.json')?'application/json':'text/html'}})}catch{}}return new Response('missing',{status:404})}}};
const get=(p,method='GET')=>worker.fetch(new Request(new URL(p,base),{method}),env);
const sm=await(await get('/sitemap.xml')).text(),efta=await(await get('/sitemap-efta.xml')).text(),llms=await(await get('/llms.txt')).text();
assert.equal((sm.match(/<loc>/g)||[]).length+(efta.match(/<loc>/g)||[]).length,175);
assert.equal(data.routes.length,7);assert.equal(Object.keys(data.backlinks).length,31);
for(const p of ['/','/guides','/topics']){const r=await get(p);assert.equal(r.status,200,p);const h=await r.text();for(const path of data.routes)assert.ok(h.includes(base+path),p+' '+path);}
const hub=await get('/topics');assert.equal(hub.headers.get('x-robots-tag'),'noindex,follow');
const atlasHtml=await(await get('/atlas/')).text();
for(const p of data.routes){
 const u=base+p,r=await get(p),h=await r.text();assert.equal(r.status,200,p);assert.equal(r.headers.get('x-robots-tag'),'index,follow',p);assert.equal(r.headers.get('x-gah-ad-eligible'),'false',p);assert.equal((h.match(/<h1\b/g)||[]).length,1,p);
 assert.ok(h.includes('rel="canonical" href="'+u+'"'),p);assert.ok(meta[u].title.length<=51&&meta[u].description.length<=155,p);
 assert.ok(sm.includes('<loc>'+u+'</loc>')&&llms.includes(u),p);assert.ok(!gahResearchIndexablePublication(u),p);
 assert.equal((await get(p,'HEAD')).headers.get('x-robots-tag'),'index,follow',p);
 const raw=await fs.readFile(new URL('.'+p+'.html',root),'utf8');
 const main=raw.split('<main')[1].split('</main>')[0];
 assert.ok(main.replace(/<[^>]*>/g,' ').match(/\b\w+\b/g).length>=300,p);
 for(const id of main.match(/\bEFTA\d{8}\b/g)||[])assert.ok(!priv.has(id),id);
 for(const m of main.matchAll(/href="([^"]+)"/g)){
  const x=new URL(m[1],base);if(x.origin!==base)continue;
  if(x.pathname==='/atlas/'&&x.hash){assert.ok(atlasHtml.includes('id="'+x.hash.slice(1)+'"'),x.href);continue;}
  assert.equal((await get(x.pathname)).status,200,p+' -> '+x.href);
 }
 for(const [inv,targets] of Object.entries(data.backlinks))if(targets.some(t=>t.path===p))assert.ok(h.includes(base+inv),p+' reciprocal '+inv);
}
for(const [p,targets] of Object.entries(data.backlinks)){const h=await(await get(p)).text();const b=h.match(/<section id="gah-topic-pathway"[^>]*>([\s\S]*?)<\/section>/)?.[1];assert.ok(b,p);for(const t of targets)assert.ok(b.includes(base+t.path),p+' '+t.path);}
console.log('PASS seven authoritative topic guides, all source links, Atlas anchors, 31 investigation backlinks, unchanged noindex directory and corpus boundaries');
