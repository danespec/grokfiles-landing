import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import worker from '../_worker.js';
import {READER_EDITORIAL_METADATA} from '../content/reader-editorial-metadata.mjs';
const BASE='https://grokarchivehub.com',root=new URL('../',import.meta.url);
const env={ASSETS:{async fetch(req){
  const u=new URL(typeof req==='string'?req:req.url);
  for(const p of [u.pathname,u.pathname+'.html',u.pathname.replace(/\/$/,'')+'/index.html']){
    try{return new Response(await fs.readFile(new URL('.'+p,root)),{headers:{'Content-Type':p.endsWith('.json')?'application/json':p.endsWith('.csv')?'text/csv':'text/html'}})}catch{}
  }
  return new Response('missing',{status:404});
}}};
const get=(p,m='GET')=>worker.fetch(new Request(BASE+p,{method:m}),env);
const text=async p=>(await get(p)).text();
const sitemap=await text('/sitemap.xml'),efta=await text('/sitemap-efta.xml');
const targets=[
  '/entities/jpmorgan-chase-epstein-bank-records',
  '/entities/deutsche-bank-epstein-records',
  '/entities/gratitude-america-financial-records',
  '/research-data'
];
assert.equal((sitemap.match(/<loc>/g)||[]).length+(efta.match(/<loc>/g)||[]).length,182,'original 175 + four reviewed research pages + two verified court publications + one Norway news report');
assert.equal((efta.match(/<loc>/g)||[]).length,19,'no newly indexed EFTA dossiers');
for(const p of targets){
  const r=await get(p),h=await r.text();
  assert.equal(r.status,200,p);
  assert.doesNotMatch(r.headers.get('x-robots-tag')||'',/noindex/i,p);
  assert(h.includes('<link rel="canonical" href="'+BASE+p+'">'),p+' canonical');
  assert.equal((h.match(/<h1\b/g)||[]).length,1,p+' h1');
  assert(sitemap.includes('<loc>'+BASE+p+'</loc>'),p+' sitemap');
  assert(READER_EDITORIAL_METADATA[BASE+p]?.description,p+' public metadata');
}
const directories=await Promise.all(['/entities','/entities/epstein-financial-organization-records','/archive/ids'].map(text));
for(const p of targets.slice(0,3)){
  assert(directories[0].includes(p),p+' entity index');
  assert(directories[1].includes(p),p+' organization directory');
  const h=await text(p);
  assert(h.includes('What these records do not establish'),p+' limits');
  assert(h.includes('Documentary timeline and source trail'),p+' provenance');
}
assert(directories[2].includes('/research-data'),'EFTA register export navigation');
const publicIndex=JSON.parse(await fs.readFile(new URL('research-data/efta-reviewed-index.json',root),'utf8'));
const minimized=new Set(JSON.parse(await fs.readFile(new URL('atlas/data.json',root),'utf8')).privacy_minimized_document_ids);
assert.equal(publicIndex.record_count,19);
for(const r of publicIndex.records){
  assert(!minimized.has(r.id),'privacy-minimized export');
  assert(efta.includes('<loc>'+r.canonical_url+'</loc>'),r.id+' authoritative sitemap');
  assert(/^https:\/\/www\.justice\.gov\//.test(r.document_source_url),r.id+' primary DOJ');
  assert(/^[a-f0-9]{64}$/.test(r.published_dossier_html_sha256),r.id+' HTML digest');
}
const paths=['/research-data/efta-reviewed-index.json','/research-data/efta-reviewed-index.csv','/research-data/entity-index-reviewed.csv'];
for(const p of paths){
  const r=await get(p),payload=await r.text();
  const local=await fs.readFile(new URL('.'+p,root),'utf8');
  assert.equal(r.status,200,p);
  assert.equal(payload,local,p+' exact static bytes');
  assert.match(r.headers.get('content-disposition')||'',/attachment/);
  assert.match(r.headers.get('x-robots-tag')||'',/noindex/i);
  const head=await get(p,'HEAD');
  assert.equal(head.status,200,p+' HEAD'); assert.equal(await head.text(),'');
}
assert.equal((await get('/research-data/private.txt')).status,404,'unknown data export blocked');
assert.equal((await text('/research-data/efta-reviewed-index.csv')).trim().split('\n').length,20,'19 EFTA CSV rows');
assert.equal((await text('/research-data/entity-index-reviewed.csv')).trim().split('\n').length,21,'20 public entity rows');
console.log('PASS 4 new indexable research pages, 19 EFTA & 20 entity exports, source boundaries, canonical links, HEAD, privacy and no unapproved routes');
