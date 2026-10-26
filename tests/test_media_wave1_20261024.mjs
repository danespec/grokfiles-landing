import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import worker from '../_worker.js';

const root=path.resolve(new URL('..',import.meta.url).pathname);
const manifest=JSON.parse(await readFile(path.join(root,'content/media-publication.json'),'utf8'));
const capture=JSON.parse(await readFile(path.join(root,'evidence-data/media-wave1/source-capture.json'),'utf8'));
const ready=manifest.media.filter(r=>r.status==='ready');
const packages=new Map(manifest.packages.map(p=>[p.id,p]));
const env=staging=>({ASSETS:{fetch:async input=>{
  const url=new URL(typeof input==='string'?input:input.url);
  let file=url.pathname==='/'?'index.html':url.pathname.slice(1);
  if(['latest','investigations','videos','reels','about','entities'].includes(file))file+='.html';
  try{return new Response(await readFile(path.join(root,file)),{headers:{'Content-Type':file.endsWith('.json')?'application/json':file.endsWith('.css')?'text/css':file.endsWith('.png')?'image/png':'text/html'}})}
  catch{return new Response('Missing asset',{status:404})}
}},X_TOKEN_STORE:{get:async()=>null},...(staging?{GAH_STAGING:'true'}:{})});
globalThis.fetch=async()=>{throw Error('Unexpected external fallback')};
const get=(p,staging=false)=>worker.fetch(new Request('https://grokarchivehub.com'+p),env(staging));
const jsonLd=html=>[...html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map(m=>JSON.parse(m[1]));

assert.equal(ready.length,29);
for(const r of ready){
  const response=await get(r.route);const html=await response.text();
  assert.equal(response.status,200,r.route);
  assert.equal(response.headers.get('X-Robots-Tag'),'index,follow');
  assert.equal(response.headers.get('X-GAH-Ad-Status'),'AD-EXCLUDE');
  assert.equal((html.match(/<h1\b/g)||[]).length,1);
  assert.equal((html.match(/<header class="site-header"/g)||[]).length,1);
  for(const section of ['summary','receipts','limits','questions','related'])assert.ok(html.includes('id="'+section+'"'),r.route+' '+section);
  for(const id of r.documents)assert.ok(html.includes('id="source-'+id+'"'),id);
  assert.ok(html.includes('href="https://grokarchivehub.com'+r.route+'"'),'canonical');
  assert.ok(html.includes('twitter:image'),'social card');
  assert.doesNotMatch(html,/<img\b/,'no real-person page image');
  assert.doesNotMatch(html,/\b(?:TODO|TBD|lorem ipsum|coming soon)\b/i);
  assert.ok(!html.includes('@hozspec'));
  const ld=jsonLd(html);
  const csp=response.headers.get('Content-Security-Policy');
  if(r.family==='video'){
    const video=ld.find(x=>x['@type']==='VideoObject');
    assert.ok(video);assert.ok(video.duration.startsWith('PT'));assert.ok(video.uploadDate===capture.videos.find(v=>v.id===r.youtubeId).publishDate);
    assert.ok(video.embedUrl.endsWith(r.youtubeId));
    assert.ok(html.includes('<iframe src="https://www.youtube-nocookie.com/embed/'+r.youtubeId+'"'));
    assert.match(csp,/frame-src[^;]*https:\/\/www.youtube-nocookie.com/);
    assert.match(csp,/frame-ancestors 'none'/);
    assert.ok(html.includes('narration is synthetic'));
    assert.ok(html.includes('a narration transcript is not available'));
  }else{
    assert.ok(ld.some(x=>x['@type']==='Article'));
    assert.ok(html.includes('id="original-caption"'));
    const c=capture.captions.find(c=>c.sourceUrl===r.sourceUrl);
    const unescape=s=>s.replace(/&quot;/g,'"').replace(/&#x27;/g,"'").replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>');
    assert.ok(unescape(html).includes(c.caption),'complete original caption retained');
    assert.ok(!csp.includes('youtube-nocookie.com'),'video frame exception does not leak to reel');
  }
  const staging=await get(r.route,true);assert.equal(staging.headers.get('X-Robots-Tag'),'noindex, nofollow, noarchive');
}
for(const hub of ['/videos','/reels']){
  const r=await get(hub);const h=await r.text();assert.equal(r.status,200);assert.equal(r.headers.get('X-Robots-Tag'),'index,follow');
  assert.ok(jsonLd(h).some(x=>x['@type']==='CollectionPage'));
  for(const row of ready.filter(x=>x.family===(hub==='/videos'?'video':'reel')))assert.ok(h.includes('href="'+row.route+'"'));
}
for(const incoming of ['/topics','/latest','/entities']){
  const r=await get(incoming);assert.equal(r.status,200);const h=await r.text();
  for(const row of ready)assert.ok(h.includes('href="'+row.route+'"'),incoming+' -> '+row.route);
}
for(const p of manifest.packages.filter(p=>!p.investigation.startsWith("/archive/") && !p.investigation.startsWith("https://"))){
  const r=await get(p.investigation);assert.equal(r.status,200);const h=await r.text();
  for(const row of ready.filter(x=>x.package===p.id))assert.ok(h.includes('href="'+row.route+'"'));
}
const home=await get('/');const h=await home.text();
const site=jsonLd(h).find(x=>x['@type']==='WebSite');assert.equal(site.name,'GrokArchiveHub');
const org=jsonLd(h).find(x=>x['@type']==='NewsMediaOrganization' && x['@id']==='https://grokarchivehub.com/#organization');
assert.ok(org.sameAs.includes('https://www.instagram.com/grokarchivehub/'));assert.ok(org.sameAs.includes('https://www.youtube.com/@GrokArchiveHub'));
assert.ok(!home.headers.get('Content-Security-Policy').includes('youtube-nocookie.com'),'homepage CSP unchanged');
const about=await (await get('/about')).text();assert.ok(about.includes('the official publication and its channels'));
const sitemap=await get('/sitemap.xml');const xml=await sitemap.text();
const locs=[...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map(m=>m[1]);assert.equal(new Set(locs).size,locs.length);
for(const route of [...ready.map(r=>r.route),'/videos','/reels'])assert.ok(locs.includes('https://grokarchivehub.com'+route),route);
assert.equal((xml.match(/<video:video>/g)||[]).length,8);assert.ok(!xml.includes('<video:content_loc></video:content_loc>'));
assert.ok(!xml.includes('no-evidence-is-not-no-records'),'draft pilot remains excluded');
assert.ok(xml.includes('https://grokarchivehub.com/archive/EFTA00013764'),'existing main-sitemap dossier preserved');
const missing=await get('/videos/not-a-published-video');assert.equal(missing.status,404);
const registry=JSON.parse(await readFile(path.join(root,'content/video-registry.json'),'utf8'));
assert.equal(registry.videos.filter(v=>v.status==='published').length,8);
assert.equal(registry.videos.find(v=>v.id==='gah-video-pilot-001-blanche-no-evidence').status,'draft');
console.log('PASS media catalog: 29 complete pages, 2 hubs, 3 investigations preserved, all discovery links, brand schema, original captions, exact-source video metadata, scoped iframe CSP, staging privacy, video sitemap and held/draft exclusions.');

for(const id of ['gates','musk','zuckerberg']){
 const p=packages.get(id), row=ready.find(r=>r.package===id);
 const entityHtml=await (await get('/entities')).text();
 assert.ok(entityHtml.includes('id="media-'+id+'"'));
 assert.ok(entityHtml.includes('href="'+row.route+'"'));
 const html=await(await get(row.route)).text();
 assert.ok(jsonLd(html).some(x=>x['@type']==='Article' && x.datePublished==='2026-10-25'));
 if(id==='gates')assert.ok(html.includes('not proof of an executed agreement'));
 if(id==='musk')assert.ok(html.includes('does not establish an island visit'));
 if(id==='zuckerberg')assert.ok(html.includes('does not independently certify an exhaustive search'));
}

for(const id of ["summers","hoffman","bannon"]){const row=ready.find(r=>r.package===id);const h=await(await get(row.route)).text();assert.ok(h.includes("not a")||h.includes("not prove"));const entity=await(await get("/entities")).text();assert.ok(entity.includes("id=\"media-"+id+"\""));}

for(const id of ["hawking","bezos","maxwell"]){const row=ready.find(r=>r.package===id);const h=await(await get(row.route)).text();assert.ok(h.includes("does not")||h.includes("not trial"));const entity=await(await get("/entities")).text();assert.ok(entity.includes("id=\"media-"+id+"\""));}

for(const id of ["brunel","dershowitz","richardson"]){const row=ready.find(r=>r.package===id);const h=await(await get(row.route)).text();assert.ok(h.includes("redacted payee")||h.includes("denial"));const entity=await(await get("/entities")).text();assert.ok(entity.includes("id=\"media-"+id+"\""));}

{const row=ready.find(r=>r.package==="wexner");const h=await(await get(row.route)).text();assert.ok(h.includes("December 19, 2019"));assert.ok(h.includes("pages 65–66"));assert.ok(h.includes("Counsel denied Wexner knew"));assert.ok(h.includes("not independently re-run"));const entity=await(await get("/entities")).text();assert.ok(entity.includes("id=\"media-wexner\""));}

for(const id of ["clinton-cgi","andrew-doj","indyke-kahn"]){const row=ready.find(r=>r.package===id);const h=await(await get(row.route)).text();assert.ok(h.includes("not")||h.includes("No matched"));const entity=await(await get("/entities")).text();assert.ok(entity.includes("id=\"media-"+id+"\""));}

for(const id of ["raskin","ryan-thiel"]){const row=ready.find(r=>r.package===id);const h=await(await get(row.route)).text();assert.ok(jsonLd(h).some(x=>x.datePublished==="2026-10-26"));if(id==="ryan-thiel"){assert.ok(h.includes("superseded"));assert.ok(h.includes("truthfulness"));assert.ok(h.includes("not adopted as current status"));}else assert.ok(h.includes("not specify a time zone"));}

for(const id of ["ryan-response-long","thiel-record-short","ryan-names-short","ryan-release-short"]){const row=ready.find(r=>r.id===id);const h=await(await get(row.route)).text();assert.ok(h.includes("not a verified narration transcript"));assert.ok(h.includes("RYAN-RESPONSE")||h.includes("source-28568"));}
