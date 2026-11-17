import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import worker,{gahResearchIndexablePublication} from '../_worker.js';
import {PUBLICATION_POLICY as policy} from '../content/publication-policy.mjs';
const root=new URL('../',import.meta.url),base='https://grokarchivehub.com';
const report=JSON.parse(await fs.readFile(new URL('tests/fixtures/dossier-recovery-20261117.json',root),'utf8'));
assert.equal(report.records.length,64);
assert.equal(new Set(report.records.map(r=>r.id)).size,64);
assert.deepEqual(Object.fromEntries(['promote','retain-canonical','retain-noindex'].map(k=>[k,report.records.filter(x=>x.decision===k).length])),{'promote':10,'retain-canonical':50,'retain-noindex':4});
const env={ASSETS:{async fetch(req){const u=new URL(typeof req==='string'?req:req.url);for(const p of [u.pathname,u.pathname+'.html',u.pathname.replace(/\/$/,'')+'/index.html']){try{return new Response(await fs.readFile(new URL('.'+p,root)),{headers:{'Content-Type':p.endsWith('.json')?'application/json':'text/html'}})}catch{}}return new Response('missing',{status:404})}}};
const get=(p,method='GET')=>worker.fetch(new Request(new URL(p,base),{method}),env);
const sm=await(await get('/sitemap-efta.xml')).text();assert.equal((sm.match(/<loc>/g)||[]).length,15);
const ds8=await(await get('/guides/epstein-files-data-set-8')).text();
for(const r of report.records){
 const p='/archive/'+r.id,u=base+p,res=await get(p),body=await res.text();
 assert.equal(res.status,200,r.id);assert.equal(res.headers.get('X-GAH-Ad-Eligible'),'false',r.id);
 assert.equal((body.match(/<h1\b/g)||[]).length,1,r.id);
 const canonical=r.decision==='retain-canonical'?r.canonical:u;
 assert(body.includes('rel="canonical" href="'+canonical+'"'),r.id);
 const robots=r.decision==='promote'?'index,follow':'noindex,follow';
 assert.equal(res.headers.get('X-Robots-Tag'),robots,r.id);
 assert.equal((await get(p,'HEAD')).headers.get('X-Robots-Tag'),robots,r.id);
 assert.equal(sm.includes('<loc>'+u+'</loc>'),r.decision==='promote',r.id);
 if(r.decision==='promote'){
   const raw=await fs.readFile(new URL('archive/'+r.id+'.html',root));assert.equal(createHash('sha256').update(raw).digest('hex'),r.sha256);
   assert.equal((body.match(/id="dossier-comparative-review"/g)||[]).length,1,r.id);
   assert(body.includes('not a fresh byte comparison'),r.id);assert(ds8.includes(u),r.id);
   assert(sm.includes('<loc>'+u+'</loc><lastmod>2026-11-17</lastmod>'),r.id);
   assert.equal(gahResearchIndexablePublication(u),false,r.id);
 }else if(r.decision==='retain-canonical'){
   const t=await get(r.canonical),h=await t.text();assert.equal(t.status,200,r.id);
   assert(!/noindex/i.test(t.headers.get('X-Robots-Tag')||''),r.id+' target indexability');
   assert(h.includes(u),r.id+' target link');assert(h.includes(r.id),r.id+' target identifier');
 }else assert.equal(policy[u].noindex,true,r.id);
}
console.log('PASS all 64 dossier dispositions, 15 indexed records, source fingerprints, 50 live-style canonical destinations, 4 holds, GET/HEAD, privacy and corpus boundaries');
