import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import worker from '../_worker.js';
import {qualityHtml} from '../reader-quality.mjs';
import {READER_EDITORIAL_METADATA} from '../content/reader-editorial-metadata.mjs';
import {UNAVAILABLE_SOURCE_PDFS} from '../content/source-pdf-status.mjs';
const routes=JSON.parse(await fs.readFile(new URL('../_routes.json',import.meta.url),'utf8'));assert.ok(!routes.exclude.includes('/evidence-data/*.pdf'),'PDF guard must execute in production');
const html='<html><head><title>Source</title><meta name="description" content="Source"></head><body><main><h1>Source</h1></main></body></html>';
const fallback={ASSETS:{fetch:async()=>new Response(html,{headers:{'Content-Type':'text/html'}})}};
for(const method of ['GET','HEAD']){const r=await worker.fetch(new Request('https://grokarchivehub.com/evidence-data/zzz/nope.pdf',{method}),fallback);assert.equal(r.status,404);}
const inventory=JSON.parse(await fs.readFile(new URL('../docs/reaudit-20261027/ninth-pdf-inventory.json',import.meta.url),'utf8'));
for(const row of inventory.verified){const b=await fs.readFile(new URL('..'+row.path,import.meta.url));assert.equal(b.subarray(0,5).toString(),'%PDF-');assert.equal(crypto.createHash('sha256').update(b).digest('hex'),row.sha256);}
for(const [url,m] of Object.entries(READER_EDITORIAL_METADATA)){assert.ok(m.title.length+19<=70,url);assert.ok(m.description.length<=155,url);assert.doesNotMatch(m.title+m.description,/…/);}
for(const path of UNAVAILABLE_SOURCE_PDFS){const out=qualityHtml(html.replace('</main>','<a href="'+path+'">Source PDF</a></main>'),'https://grokarchivehub.com/example');assert.ok(!out.includes('href="'+path+'"'));assert.match(out,/PDF unavailable/);}
const normalized=qualityHtml(html.replace('</main>','<a href="/evidence-data/doug-band/source/html/test.html">Archive</a><a href="/api/pdf?id=EFTA00000468">Viewer</a></main>'),'https://grokarchivehub.com/example');assert.match(normalized,/source\/html\/test"/);assert.match(normalized,/pdf-lite\?id=EFTA00000468/);
console.log('PASS verified PDF bytes/hashes, missing-PDF GET/HEAD 404, worker route coverage, unavailable link removal, complete editorial metadata and direct viewer/source links');
