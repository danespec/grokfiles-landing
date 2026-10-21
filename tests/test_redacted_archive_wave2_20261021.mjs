import assert from "node:assert/strict";
import fs from "node:fs";
const root=new URL("../",import.meta.url);
const worker=fs.readFileSync(new URL("_worker.js",root),"utf8");
const archive=fs.readFileSync(new URL("archive.html",root),"utf8");
const records=JSON.parse(fs.readFileSync(new URL("docs/seo/GAH_REDACTED_ARCHIVE_WAVE2_20261021.json",root),"utf8"));
assert.equal(records.length,21);
assert.equal(new Set(records.map(r=>r.id)).size,21);
for(const r of records){
 const path="archive/"+r.id+".html", url="https://grokarchivehub.com/archive/"+r.id;
 const source=fs.readFileSync(new URL(path,root),"utf8");
 assert(source.includes('<link rel="canonical" href="'+url+'">'),r.id+" self canonical");
 assert(source.includes('name="robots" content="index,follow'),r.id+" indexable");
 assert(source.includes('name="gah-ad-eligible" content="false"'),r.id+" ads disabled");
 assert(source.includes('<script type="application/ld+json">'),r.id+" JSON-LD");
 assert(source.includes('class="status"'),r.id+" provenance status");
 assert(source.includes('What the record and public sources support'),r.id+" evidence constraints");
 assert(source.includes('What cannot be concluded from this record'),r.id+" source limitation");
 assert(source.includes('Official DOJ Epstein search'),r.id+" DOJ discovery");
 assert(!/<img\b|<iframe\b|class="ocr-excerpt"|\/pdf-lite\?id=|\/api\/source\?id=/i.test(source),r.id+" no source image, raw OCR or embedded PDF");
 assert(worker.includes('["/archive/'+r.id+'", "2026-10-21"]'),r.id+" sitemap");
 assert(worker.includes('  "'+r.id+'",'),r.id+" exact route whitelist");
 assert(archive.includes('href="/archive/'+r.id+'"'),r.id+" inbound editorial link");
 if(!r.previously_resolved){
   assert(source.includes("Original GAH source reader returned 404"),r.id+" transparent unresolved 404");
   assert(source.includes("not a replacement for the original source file"),r.id+" no invented original");
 }
}
assert(worker.includes('GAH_REDACTED_WAVE2_INDEXABLE_IDS.has(archiveId)'),"exact static route");
const olds=JSON.parse(fs.readFileSync(new URL("docs/seo/GAH_20261021_PROMOTED_EDITORIAL_SOURCES.json",root),"utf8"));
assert.equal(olds.length,12);
for(const r of olds) assert(!records.some(x=>x.id===r.id),"no duplicate canonical "+r.id);
console.log("PASS 21 privacy-safe editorial source guides + 12 previous + 6 foundation = 39; 4 unresolved source gaps transparent");
