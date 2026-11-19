import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import worker,{gahResearchIndexablePublication} from '../_worker.js';
import {READER_EDITORIAL_METADATA as meta} from '../content/reader-editorial-metadata.mjs';
import {HeadHtmlRewriterFixture as Rewriter} from './fixtures/html-rewriter-head.mjs';
globalThis.HTMLRewriter=Rewriter;
const root=new URL('../',import.meta.url),base='https://grokarchivehub.com';
const data=JSON.parse(await fs.readFile(new URL('tests/fixtures/timelines-directories-20261117.json',root),'utf8'));
const atlas=JSON.parse(await fs.readFile(new URL('atlas/data.json',root),'utf8'));
const priv=new Set(atlas.privacy_minimized_document_ids);
const env={ASSETS:{async fetch(req){const u=new URL(typeof req==='string'?req:req.url);for(const p of [u.pathname,u.pathname+'.html',u.pathname.replace(/\/$/,'')+'/index.html']){try{return new Response(await fs.readFile(new URL('.'+p,root)),{headers:{'Content-Type':p.endsWith('.json')?'application/json':'text/html'}})}catch{}}return new Response('missing',{status:404})}}};
const get=(p,method='GET')=>worker.fetch(new Request(new URL(p,base),{method}),env);
const cache=new Map();
async function page(p){if(!cache.has(p)){const r=await get(p);assert.equal(r.status,200,p);cache.set(p,{h:await r.text(),r});}return cache.get(p);}
const sm=(await page('/sitemap.xml')).h,efta=(await page('/sitemap-efta.xml')).h,llms=(await page('/llms.txt')).h;
assert.equal((sm.match(/<loc>/g)||[]).length+(efta.match(/<loc>/g)||[]).length,175);
assert.equal(data.routes.length,6);assert.equal(Object.values(data.row_counts).reduce((a,b)=>a+b,0),59);
const atlasHtml=(await page('/atlas/')).h;
for(const p of data.routes){
 const u=base+p,{r,h}=await page(p);
 assert.equal(r.headers.get('x-robots-tag'),'index,follow',p);assert.equal(r.headers.get('x-gah-ad-eligible'),'false',p);
 assert.equal((h.match(/<h1\b/g)||[]).length,1,p);assert.ok(h.includes('rel="canonical" href="'+u+'"'),p);
 assert.ok(meta[u].title.length<=51&&meta[u].description.length<=155,p);
 assert.ok(sm.includes('<loc>'+u+'</loc>')&&llms.includes(u),p);assert.ok(!gahResearchIndexablePublication(u),p);
 assert.equal((await get(p,'HEAD')).headers.get('x-robots-tag'),'index,follow',p);
 const raw=await fs.readFile(new URL('.'+p+'.html',root),'utf8');
 const rows=raw.match(/<ol class="record-grid">([\s\S]*?)<\/ol>/)?.[1];assert.ok(rows,p);
 const items=[...rows.matchAll(/<li>([\s\S]*?)<\/li>/g)];assert.equal(items.length,data.row_counts[p],p);
 for(const row of items){assert.match(row[1],/<h3>/);assert.match(row[1],/<a href="/);assert.match(row[1],/<strong>Source and limit[s]?:|<strong>Source path and boundary:|<strong>Start with these sources and limits:/);}
 for(const id of raw.match(/\bEFTA\d{8}\b/g)||[])assert.ok(!priv.has(id),id);
 for(const m of raw.matchAll(/href="([^"]+)"/g)){const x=new URL(m[1],base);if(x.origin!==base)continue;if(x.pathname==='/atlas/'&&x.hash){assert.ok(atlasHtml.includes('id="'+x.hash.slice(1)+'"'),x.href);continue;}await page(x.pathname);}
}
for(const [p,targets] of Object.entries(data.backlinks)){
 const {h}=await page(p);const block=h.match(/<section id="gah-timeline-directory"[^>]*>([\s\S]*?)<\/section>/)?.[1];assert.ok(block,p);
 assert.equal((h.match(/id="gah-timeline-directory"/g)||[]).length,1,p);
 for(const t of targets)assert.ok(block.includes('href="'+base+t.path+'"'),p+' -> '+t.path);
}
for(const p of ['/entities','/timeline-reconstructions','/topics'])assert.equal((await page(p)).r.headers.get('x-robots-tag'),'noindex,follow',p);
assert.equal((await page('/research/epstein-final-48-hours-mcc')).r.headers.get('x-robots-tag'),'index,follow');
console.log('PASS six source-linked timelines/directories, 59 rows, 30 backlink origins, internal destinations, published Atlas anchors, privacy and unchanged canonical policy');
