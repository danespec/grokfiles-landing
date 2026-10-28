import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import worker from '../_worker.js';
import {READER_EDITORIAL_METADATA as metadata} from '../content/reader-editorial-metadata.mjs';
const root=new URL('../',import.meta.url);
const routes=JSON.parse(await fs.readFile(new URL('_routes.json',root),'utf8'));
assert.ok(!routes.exclude.some(x=>x.startsWith('/evidence-data/')),'All evidence requests must execute strict validation and the book gate');
const home='<!doctype html><html><head><title>Homepage</title><link rel="canonical" href="https://grokarchivehub.com/"></head><body>Home</body></html>';
const env={ASSETS:{fetch:async(input)=>{
 const u=new URL(typeof input==='string'?input:input.url);let data;
 for(const path of [u.pathname,u.pathname+'.html']){try{data=await fs.readFile(new URL(path.slice(1),root));break;}catch{}}
 if(!data)return new Response(home,{headers:{'Content-Type':'text/html'}});
 const type=/\.pdf$/.test(u.pathname)?'application/pdf':/\.json$/.test(u.pathname)?'application/json':/source\/html/.test(u.pathname)?'text/html':'text/plain';
 return new Response(data,{headers:{'Content-Type':type}});
}}};
for(const method of ['GET','HEAD'])for(const path of ['/evidence-data/zzz/nope.html','/evidence-data/zzz/nope.png','/evidence-data/zzz/nope.txt','/evidence-data/zzz/nope.json','/evidence-data/zzz/nope.tsv','/evidence-data/zzz/nope.csv','/evidence-data/zzz/nope.pdf','/evidence-data/zzz/nope','/evidence-data/new-mexico-doj/source/html/zzz-nope','/book-of-black/source/nope.html','/book-of-black/source/nope.png','/book-of-black/source/nope.txt']){
 const r=await worker.fetch(new Request('https://grokarchivehub.com'+path,{method}),env);assert.equal(r.status,404,path);
}
const restored=JSON.parse(await fs.readFile(new URL('docs/reaudit-20261027/tenth-restored-assets.json',root),'utf8'));
for(const row of restored){const data=await fs.readFile(new URL(row.file,root));assert.equal(crypto.createHash('sha256').update(data).digest('hex'),row.sha256,row.path);if(row.path.includes('/source/html/')){
 const r=await worker.fetch(new Request('https://grokarchivehub.com'+row.path),env);assert.equal(r.status,200,row.path);const text=await r.text();assert.doesNotMatch(text,/canonical[^>]+href=["']https:\/\/grokarchivehub\.com\/["']/i);assert.doesNotMatch(text,/<meta\b[^>]*name="robots"[^>]*content="index,follow"/i);
}}
const pdf='https://grokarchivehub.com/book-of-black/source/Book_of_Black_V6HHT.pdf';
assert.equal((await worker.fetch(new Request(pdf),env)).status,403);
let r=await worker.fetch(new Request(pdf,{headers:{Cookie:'gah_bob_ack=1',Range:'bytes=0-7'}}),env);assert.equal(r.status,206);assert.equal((await r.text()).slice(0,5),'%PDF-');assert.match(r.headers.get('Content-Range'),/\/17775835$/);
for(const path of ['/api/book-of-black/status','/api/book-of-black/page/1','/api/book-of-black/page/2','/api/book-of-black/page/100','/api/book-of-black/search?q=black','/api/book-of-black/ledger']){
 const r=await worker.fetch(new Request('https://grokarchivehub.com'+path,{headers:{Cookie:'gah_bob_ack=1'}}),env);assert.equal(r.status,200,path);assert.match(r.headers.get('Content-Type'),/application\/json/);await r.json();
}
for(const k of ['title','description']){const seen=new Set();for(const [url,m] of Object.entries(metadata)){assert.ok(!seen.has(m[k]),'Duplicate '+k+': '+url);seen.add(m[k]);}}
console.log('PASS all restored asset hashes and source bodies, GET/HEAD missing assets, route coverage, gated manuscript bytes/range and all reader JSON APIs, unique reviewed metadata');

// Reproduce registered-but-missing files and misleading PDF MIME types, not just unknown URLs.
for(const path of ["/evidence-data/new-mexico-doj/source/html/uscode-foia-552","/evidence-data/doj-oip-epstein-review-2026-10-09/source-manifest.json","/book-of-black/source/Book_of_Black_V6HHT.pdf"]){const broken={ASSETS:{fetch:async()=>new Response(home,{headers:{"Content-Type":path.endsWith(".pdf")?"application/pdf":"text/html"}})}};const r=await worker.fetch(new Request("https://grokarchivehub.com"+path,{headers:{Cookie:"gah_bob_ack=1"}}),broken);assert.equal(r.status,404,path);}
console.log("PASS known asset fallback and falsely labelled manuscript regression cases");

for(const host of ["grokarchivehub.com"]){const r=await worker.fetch(new Request("https://"+host+"/pdf-lite?id=ZZZ"),env);assert.equal(r.status,404);}

const replacements=JSON.parse(await fs.readFile(new URL("docs/reaudit-20261027/tenth-source-replacements.json",root),"utf8"));const sourcePage=await fs.readFile(new URL("investigations/new-mexico-doj-epstein-records.html",root),"utf8");for(const [path,url] of Object.entries(replacements)){assert.ok(!sourcePage.includes('href="'+path+'"'));assert.ok(sourcePage.includes('href="'+url+'"'));const r=await worker.fetch(new Request("https://grokarchivehub.com"+path),env);assert.equal(r.status,404);}
