import { workerTestSource } from './worker-test-source.mjs';
import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
const root=new URL('../',import.meta.url);
const read=p=>readFile(new URL(p,root),'utf8');
const home=await read('index.html');
const before=execFileSync('git',['show','edc663ea11ac931f8e6c1fb82618a1d7f6e31a39:index.html'],{encoding:'utf8'});
const hrefs=s=>new Set([...s.matchAll(/\bhref="([^"]+)"/g)].map(m=>m[1]).filter(h=>!h.startsWith('#')&&!h.includes('.css')));
for(const href of hrefs(before))assert(hrefs(home).has(href),'Retained original article/source/navigation link: '+href);
assert.match(home,/<main id="main" tabindex="-1">\s*<section class="hero"/);
assert(home.indexOf('<section class="hero"')<home.indexOf('id="trump-records-2015"'));
assert.equal((home.match(/<h1\b/g)||[]).length,1);
assert.equal((home.match(/class="story"/g)||[]).length,6);
assert.match(home,/<summary>Browse 31 more reports<\/summary>/);
assert.match(home,/<form action="\/search" method="get"/);
assert.match(home,/<label for="home-query">/);
for(const id of ['search-archive','research-guides','epstein-evidence-directory-heading'])assert(home.includes('id="'+id+'"'));
const ids=[...home.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
assert.equal(ids.length,new Set(ids).size,'Unique IDs');
for(const m of home.matchAll(/<img\b([^>]*)>/g)){
  assert.match(m[1],/\balt=/);assert.match(m[1],/\bwidth=/);assert.match(m[1],/\bheight=/);
  if(!m[1].includes('hero-desk')&&!m[1].includes('doc-'))assert.match(m[1],/loading="lazy"/);
}
const assets=['assets/home-hero-064.avif','assets/home-pinboard-064.avif','assets/images/barak-archive-card-064.avif'];
for(const file of assets){const bytes=await readFile(new URL(file,root));assert(bytes.subarray(4,32).includes(Buffer.from('avif')));assert((await stat(new URL(file,root))).size<100000);}
const source=await read('_worker.js');
const {default:worker}=await import('data:text/javascript;base64,'+Buffer.from(workerTestSource(source)).toString('base64'));
const response=await worker.fetch(new Request('https://grokarchivehub.com/'),{ASSETS:{fetch:async()=>new Response(home,{headers:{'Content-Type':'text/html'}})}});
assert.equal(response.status,200);assert.match(response.headers.get('X-Robots-Tag'),/index,follow/);
const rendered=await response.text();assert.doesNotMatch(rendered,/pagead\/js\/adsbygoogle\.js/);
assert.match(rendered,/href="\/assets\/home-064.css"/);
assert.match(response.headers.get('Content-Security-Policy'),/frame-ancestors 'none'/);
console.log('PASS featured lead, retained article/source links, six compact cards, native search, responsive image markup and payload limits, metadata and disabled ad loader');
