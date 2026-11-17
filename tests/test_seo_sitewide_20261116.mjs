import {HeadHtmlRewriterFixture as Rewriter} from "./fixtures/html-rewriter-head.mjs";
globalThis.HTMLRewriter=Rewriter;
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import worker from '../_worker.js';
import {READER_EDITORIAL_METADATA as meta} from '../content/reader-editorial-metadata.mjs';
import {escapeHtml,publicationRule} from '../reader-quality.mjs';
const apex='https://grokarchivehub.com',root=new URL('../',import.meta.url);
const env={ASSETS:{async fetch(req){const u=new URL(typeof req==='string'?req:req.url);for(const path of [u.pathname,u.pathname+'.html',u.pathname.replace(/\/$/,'')+'/index.html']){try{return new Response(await fs.readFile(new URL('.'+path,root)),{headers:{'Content-Type':path.endsWith('.json')?'application/json':'text/html'}})}catch{}}return new Response('not found',{status:404})}}};
const sitemap=await(await worker.fetch(new Request(apex+'/sitemap.xml'),env)).text();

const efta=await(await worker.fetch(new Request(apex+"/sitemap-efta.xml"),env)).text();
const urls=[...sitemap.matchAll(/<loc>(.*?)<\/loc>/g),...efta.matchAll(/<loc>(.*?)<\/loc>/g)].map(m=>m[1]);
assert.equal(new Set(urls).size,urls.length);assert.ok(urls.length>=122);
const eligible=new Set(urls.map(u=>new URL(u).pathname.replace(/\/$/,"")||"/"));
const titles=new Set();let related=0;
for(const u of urls){const p=new URL(u).pathname.replace(/\/$/,"")||"/",d=meta[apex+p];assert.ok(d,u);assert.ok(d.title.length<=51&&d.description.length<=155,u);assert.ok(!titles.has(d.title),u+" duplicate title");titles.add(d.title);
 const r=await worker.fetch(new Request(u),env),h=await r.text();assert.equal(r.status,200,u);assert.ok(!/noindex/i.test(r.headers.get("X-Robots-Tag")||""),u);assert.ok(h.includes("<title>"+escapeHtml(d.title)+" | Grok Archive Hub</title>"),u+" title");assert.ok(h.includes("content=\""+escapeHtml(d.description)+"\""),u+" description");
 const links=[...h.matchAll(/<section id="gah-search-reading"[^>]*>([\s\S]*?)<\/section>/g)];assert.ok(links.length<=1,u);if(links.length){related++;for(const m of links[0][1].matchAll(/href="([^"]+)"/g)){const v=new URL(m[1],apex);assert.ok(eligible.has(v.pathname),u+" -> "+v.pathname);assert.notEqual(v.pathname,p);}}
}
for(const p of ["/","/investigations","/evidence-briefs"]){const h=await(await worker.fetch(new Request(apex+p),env)).text();assert.match(h,/stephen-hawking-email-request-efta00695049/);}
const hawking=await(await worker.fetch(new Request(apex+"/reels/stephen-hawking-email-request-efta00695049"),env)).text();assert.equal((hawking.match(/id="hawking-source-chronology"/g)||[]).length,1);assert.match(hawking,/do not establish sexual misconduct/);
const guide=await worker.fetch(new Request(apex+"/guides/doj-epstein-data-sets"),env);assert.doesNotMatch(guide.headers.get("X-Robots-Tag")||"",/noindex/i);assert(sitemap.includes("<loc>"+apex+"/guides/doj-epstein-data-sets</loc>"));assert.match(await guide.text(),/id="data-set-9-pdf-guide"/);
console.log(`PASS ${urls.length} sitemap pages; ${related} contextual reading blocks; source-linked Hawking chronology; reviewed guide indexed`);
