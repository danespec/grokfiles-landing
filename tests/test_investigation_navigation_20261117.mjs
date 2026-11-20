import {HeadHtmlRewriterFixture as Rewriter} from "./fixtures/html-rewriter-head.mjs";
globalThis.HTMLRewriter=Rewriter;
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import worker from '../_worker.js';
import {GAH_INVESTIGATION_NAV as nav,GAH_DOSSIER_NAV as back} from '../content/investigation-navigation.mjs';
const root=new URL('../',import.meta.url),base='https://grokarchivehub.com';
const env={ASSETS:{async fetch(req){const u=new URL(typeof req==='string'?req:req.url);for(const p of [u.pathname,u.pathname+'.html',u.pathname.replace(/\/$/,'')+'/index.html']){try{return new Response(await fs.readFile(new URL('.'+p,root)),{headers:{'Content-Type':p.endsWith('.json')?'application/json':'text/html'}})}catch{}}return new Response('missing',{status:404})}}};
const get=p=>worker.fetch(new Request(new URL(p,base)),env);
const sitemap=await(await get('/sitemap.xml')).text();
const paths=[...sitemap.matchAll(/<loc>https:\/\/grokarchivehub.com(\/investigations\/[^<]+)<\/loc>/g)].map(m=>m[1]).sort();
assert.deepEqual(Object.keys(nav).sort(),paths,'Every sitemap investigation must have reviewed navigation');
const atlas=await fs.readFile(new URL('atlas/prepared-reader.html',root),'utf8');
const data=JSON.parse(await fs.readFile(new URL('atlas/data.json',root),'utf8')),catalog=JSON.parse(await fs.readFile(new URL('atlas/agent-catalog.json',root),'utf8')),allowed=new Set(catalog.stories.map(s=>s.id));
const excluded=new Set(data.privacy_minimized_document_ids);
const cache=new Map();
async function page(p){if(!cache.has(p)){const r=await get(p);assert.equal(r.status,200,p);cache.set(p,{body:await r.text(),robots:r.headers.get('x-robots-tag')});}return cache.get(p);}
for(const [p,row] of Object.entries(nav)){
 const {body,robots}=await page(p);assert.doesNotMatch(robots||'',/noindex/i,p);
 const block=body.match(/<section id="gah-investigation-navigation"[^>]*>([\s\S]*?)<\/section>/);
 assert.ok(block,p);assert.equal((body.match(/id="gah-investigation-navigation"/g)||[]).length,1,p);
 const b=block[1];assert.match(b,/Follow the evidence/);assert.match(b,/not findings of a connection/);assert.ok(b.includes('href="'+base+'/atlas/'));
 assert.ok(row.related.length>=1,p);
 for(const q of row.related){assert.notEqual(q.path,p);assert.ok(paths.includes(q.path));assert.ok(b.includes('href="'+base+q.path+'"'),q.path);assert.doesNotMatch((await page(q.path)).robots||'',/noindex/i);}
 for(const id of row.evidence){assert.ok(!excluded.has(id));assert.ok(b.includes('href="'+base+'/archive/'+id+'"'),id);assert.ok(back[id].some(x=>x.path===p));assert.ok((await page('/archive/'+id)).body.includes('href="'+base+p+'"'),id+' reciprocal link');}
 if(!row.evidence.length)assert.match(b,/No curated EFTA dossier is mapped/);
 for(const s of row.stories){assert.ok(allowed.has(s.id));assert.ok(atlas.includes('id="story-'+s.id.toLowerCase()+'"'),s.id+' anchor');assert.ok(b.includes('href="'+base+'/atlas/#story-'+s.id.toLowerCase()+'"'),p+' story link');for(const id of s.shared){assert.ok(row.evidence.includes(id));assert.ok(!excluded.has(id));assert.ok(data.stories.find(x=>x.id===s.id).anchors.some(a=>a.includes(id)));}}
 if(!row.stories.length)assert.match(b,/No specific published Atlas story is mapped/);
}
let dossiersWithStories=0;
for(const [id,investigations] of Object.entries(back)){
 const expected=new Set(investigations.flatMap(({path})=>nav[path].stories)
  .filter(story=>story.shared.includes(id)).map(story=>story.id.toLowerCase()));
 const {body}=await page('/archive/'+id);
 const block=body.match(/<div id="gah-dossier-atlas-links">([\s\S]*?)<\/div>/);
 const actual=[...(block?.[1]||'').matchAll(/href="[^"]*\/atlas\/#story-([^"]+)"/g)].map(match=>match[1]);
 assert.deepEqual(actual.sort(),[...expected].sort(),id+' exact Atlas references');
 if(expected.size)dossiersWithStories++;
}
assert.ok(dossiersWithStories>0);
console.log('PASS direct Atlas references on '+dossiersWithStories+' dossiers');
for(const p of ['/archive/ids','/guides/doj-epstein-data-sets','/atlas/'])await page(p);
console.log('PASS all '+paths.length+' published investigations, related reading, safe reciprocal EFTA links and exact published Atlas anchors');
