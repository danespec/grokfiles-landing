import {HeadHtmlRewriterFixture} from './fixtures/html-rewriter-head.mjs';
globalThis.HTMLRewriter ??= HeadHtmlRewriterFixture;
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import worker from '../_worker.js';
const html=await fs.readFile(new URL('../atlas.html',import.meta.url),'utf8');
const data=JSON.parse(await fs.readFile(new URL('../atlas/data.json',import.meta.url),'utf8'));
const env={ASSETS:{async fetch(input){const path=new URL(typeof input==='string'?input:input.url).pathname;try{const text=await fs.readFile(new URL('..'+path,import.meta.url),'utf8');return new Response(text,{headers:{'Content-Type':path.endsWith('.json')?'application/json':path.endsWith('.txt')?'text/plain':'text/html'}});}catch{return new Response('missing',{status:404});}}}};
for(const path of ['/atlas/','/atlas']){
 const r=await worker.fetch(new Request('https://grokarchivehub.com'+path),env);
 assert.equal(r.status,200,path); const text=await r.text();
 assert(text.includes('href="https://grokarchivehub.com/atlas/"'));
 assert(!/noindex/i.test(r.headers.get('X-Robots-Tag')||''));
 assert.equal((text.match(/class="story-entry"/g)||[]).length,85);
}
const d=await worker.fetch(new Request('https://grokarchivehub.com/atlas/data.json'),env);
assert.equal(d.status,200);assert.equal(d.headers.get('Content-Type'),'application/json; charset=utf-8');
assert.deepEqual(await d.json(),data);assert.equal(data.internal_only,false);
const head=await worker.fetch(new Request('https://grokarchivehub.com/atlas/data.json',{method:'HEAD'}),env);assert.equal(await head.text(),'');
const sitemap=await worker.fetch(new Request('https://grokarchivehub.com/sitemap.xml'),env);
assert.equal(sitemap.status,200);assert((await sitemap.text()).includes('<loc>https://grokarchivehub.com/atlas/</loc>'));
assert.equal(data.stories.filter(x=>x.tier==='confirmed').length,30);
assert.equal(data.stories.filter(x=>x.tier==='probable').length,55);
assert.equal(data.fragments,150);
assert(html.includes('id="story-2"'));assert(html.includes('id="story-p2"'));
assert(html.includes('Florida supervision'));assert(html.includes('Declared NPA breach, June 12, 2009'));
for(const s of data.stories) assert(html.includes('id="story-'+s.id.toLowerCase()+'"'));
console.log('PASS atlas routes, canonical, indexability, sitemap, exact JSON, HEAD, 85 unique story targets, P2 separation');

assert.equal(data.version,'v3.88');
assert.equal(data.stories.reduce((n,s)=>n+s.anchors.length,0),3459);
assert.equal(data.counts.total_entries,235);
assert.equal(data.counts.merged_delivery_references,3095);
assert(html.includes('V3.88') && html.includes('2,900 listing entries processed'));
const prior=JSON.parse(await fs.readFile(new URL('../content/story-atlas-v3122.json',import.meta.url),'utf8'));
for(const before of prior.stories){
 const now=data.stories.find(s=>s.id===before.id);assert(now);
 for(const a of before.anchors)assert(now.anchors.includes(a),before.id+': lost '+a);
 for(const line of before.entry_markdown.trim().split('\n')){if(!/\d{9,}|account[ #:(]*[0-9-]{9,}|\b[VW]-\d+/.test(line))assert(now.entry_markdown.includes(line),before.id+': lost published narrative line');}
}
for(const id of ['P52','P53','P54'])assert(data.stories.some(s=>s.id===id&&s.tier==='probable'));
for(let i=1;i<=11;i++)assert(html.includes('F-40-'+i+'.'));
assert.match(data.stories.find(s=>s.id==='P26').stopping_point,/2021-06-25/);
assert(data.stories.find(s=>s.id==='P26').anchors.some(a=>a.includes('EFTA00040664')));
assert.match(data.stories.find(s=>s.id==='P34').stopping_point,/2018-10-02/);
assert.match(data.stories.find(s=>s.id==='P49').stopping_point,/2020-02-20/);
assert.match(data.stories.find(s=>s.id==='P19').stopping_point,/2019-01-18/);
assert.match(data.stories.find(s=>s.id==='P24').stopping_point,/2020-01-31/);
assert.equal(data.coverage_current.is_ds8_fully_read,false);
assert.equal(data.coverage_current.partial_queue_total,3899+82+4+55+127);
assert.equal(data.coverage_current.partial_image_overlap_ids,86);
assert.equal(data.coverage_current.ds9_current.listing_entries_processed,2900);
assert(html.includes('No current DS8 unopened total has been established'));
assert(!html.includes('Gary Bloxsome (Interlochen'));
assert(html.includes('withdrawn pending source review'));
for(const phrase of ['Elle mag','half Asian','Huge breasts','her husband, mother and three minor children','V-27','W-11'])assert(!html.includes(phrase),phrase);
assert(!/account \d{9,}/i.test(html));
assert(html.includes('[account identifier withheld]'));
assert(html.includes('atlas-v386.css') && html.includes('atlas-v386.js'));
assert(html.includes('citation-only') && html.includes('not independent proofs'));
console.log('PASS all published references and narratives retained; restored stories/fragments, later endpoints, privacy, evidence roles and honest coverage');

const merged=JSON.parse(await fs.readFile(new URL("../content/story-atlas-v386.json",import.meta.url),"utf8"));
for(const before of merged.stories){const now=data.stories.find(s=>s.id===before.id);for(const key of ["title","tier","endpoint","stopping_point","span"])if(!(before.id==="P34"&&["endpoint","stopping_point","span"].includes(key)))assert.deepEqual(now[key],before[key]);for(const a of before.anchors)assert(now.anchors.includes(a));if(before.id!=="P34")assert(now.entry_markdown.startsWith(before.entry_markdown));}
assert.equal(data.counts.v3130_added_public_references,15);
console.log("PASS cut 48 adds 15 references without changing any prior endpoint, classification or narrative");

const cut48=JSON.parse(await fs.readFile(new URL("../content/story-atlas-v387.json",import.meta.url),"utf8"));for(const before of cut48.stories){const now=data.stories.find(s=>s.id===before.id);assert(now);for(const a of before.anchors)assert(now.anchors.includes(a));if(before.id!=="P34"){assert.equal(now.stopping_point,before.stopping_point);assert(now.entry_markdown.startsWith(before.entry_markdown));}}
assert.equal(data.counts.v3131_added_public_references,168);assert.equal(data.counts.v3131_already_cited_references,3);assert(html.includes("threshold check FAILED"));assert(!html.includes("no new lines imply new evidence"));console.log("PASS cut 49 additions, no recounting, preserved corrections and explicit failed threshold check");
