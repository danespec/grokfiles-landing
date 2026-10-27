import { workerTestSource } from './worker-test-source.mjs';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
const root=path.resolve(new URL('..',import.meta.url).pathname);
const source=await readFile(path.join(root,'_worker.js'),'utf8');
const mod=await import('data:text/javascript;base64,'+Buffer.from(workerTestSource(source)+'\nexport { improvePhotosDiscoveryHtml };').toString('base64'));
const worker=mod.default;
const registry=JSON.parse(await readFile(path.join(root,'content/identifier-dossiers.json'),'utf8'));
const records=new Map(registry.entries.map(e=>[e.id,e]));
const ids=['EFTA00035206','EFTA00035715','EFTA00035828','EFTA00579174','EFTA00579182','EFTA00643676'];
const env={ASSETS:{fetch:async request=>{
  const u=new URL(typeof request==='string'?request:request.url);
  try{return new Response(await readFile(path.join(root,u.pathname.slice(1))),{headers:{'Content-Type':'text/html'}})}
  catch{return new Response('missing',{status:404})}
}},X_TOKEN_STORE:{get:async()=>null}};
globalThis.fetch=async()=>{throw Error('Unexpected upstream request for a local source locator')};
for(const id of ids){
  for(const method of ['GET','HEAD']){
    const response=await worker.fetch(new Request('https://grokarchivehub.com/archive/'+id,{method}),env);
    assert.equal(response.status,200,id);
    assert.equal(/^noindex/i.test(response.headers.get('X-Robots-Tag')||''),!records.get(id).indexable,id+' reviewed source policy');
    assert.equal(response.headers.get('X-GAH-Ad-Status'),'AD-EXCLUDE');
    const body=await response.text();
    if(method==='HEAD')assert.equal(body,'');
    else{
      assert.equal(/<meta name="robots" content="noindex,follow/.test(body),!records.get(id).indexable);
      assert.match(body,/Source access and verification/);
      if(records.get(id).indexable)assert.match(body,/"@type"\s*:\s*"Article"/);
      assert(body.includes('href="https://grokarchivehub.com/archive/'+id+'"'));
      assert.equal((body.match(/<h1\b/g)||[]).length,1);
    }
  }
}
const alias=await worker.fetch(new Request('https://grokarchivehub.com/sitemap-archive.xml'),env);assert.equal(alias.status,301);assert.equal(alias.headers.get('Location'),'https://grokarchivehub.com/sitemap-efta.xml');
const xml=await(await worker.fetch(new Request(alias.headers.get('Location')),env)).text();
assert.equal((xml.match(/<loc>/g)||[]).length,registry.entries.filter(e=>e.indexable).length);
for(const id of ids)assert.equal(xml.includes('/archive/'+id),records.get(id).indexable);
for(const id of ['EFTA00013764','EFTA00035147','EFTA00153569','EFTA02858481'])assert(xml.includes('/archive/'+id));
const gallery=`<!doctype html><html><head><title>Incoming Visual Evidence</title></head><body><div class="wrap"><section class="hero"><h1>Incoming Visual Evidence</h1><p>Filtered photos and screenshots extracted from an old count.</p></section><div class="controls"><input id="q"><select id="pageSelect"></select></div><div id="stats" class="stats">Loading…</div><div id="grid" class="grid"></div></div><script>function card(x){return \`<img loading="lazy" src="\${esc(x.thumb_url)}">\`;} function loadPage(n){} function doSearch(){}</script></body></html>`;
const rendered=mod.improvePhotosDiscoveryHtml(gallery);
assert.equal((rendered.match(/<main\b/g)||[]).length,1);
assert.equal((rendered.match(/<\/main>/g)||[]).length,1);
assert.match(rendered,/<main id="main"/);
assert.match(rendered,/data-gah-photo-guide/);
assert.match(rendered,/aria-label="Search images/);
assert.match(rendered,/aria-label="Image results page"/);
assert.match(rendered,/aria-live="polite"/);
assert.match(rendered,/source-renders\/EFTA00035147-page15-footer-EFTA00035161.png/);
assert.match(rendered,/<noscript>/);
assert.match(rendered,/alt="\$\{esc/);
assert.doesNotMatch(rendered,/old count/);
assert.equal(mod.improvePhotosDiscoveryHtml(rendered),rendered,'gallery transform is idempotent');
for(const script of rendered.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g))new vm.Script(script[1]);
for(const slug of ['source-map-methodology','redaction-breadcrumbs','how-not-to-overread-flight-logs','confidence-labels-open-slots']){
  const body=await readFile(path.join(root,'methodology',slug+'.html'),'utf8');
  assert.match(body,/data-gah-practical-guide/);
  assert.equal((body.match(/<h1\b/g)||[]).length,1);
  assert.match(body,/href="\/archive|href="\/search/);
}
console.log('PASS register-based GET/HEAD policy, canonical source sitemap, reviewed sources retained, gallery accessibility/script syntax/idempotence and practical guides');
