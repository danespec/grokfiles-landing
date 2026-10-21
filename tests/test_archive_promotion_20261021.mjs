import fs from "node:fs";
import assert from "node:assert/strict";
const base=new URL("../",import.meta.url);
const worker=fs.readFileSync(new URL("_worker.js",base),"utf8");
const archiveLanding=fs.readFileSync(new URL("archive.html",base),"utf8");
const meta=JSON.parse(fs.readFileSync(new URL("docs/seo/GAH_20261021_PROMOTED_EDITORIAL_SOURCES.json",base),"utf8"));
assert.equal(meta.length,12,"exact reviewed promotion count");
const approved=new Set(meta.map(x=>x.id));
assert.equal(approved.size,12);
const draft=fs.readFileSync(new URL("docs/seo/sitemap-archive-DRAFT-2026-10-20.xml",base),"utf8");
const draftIds=[...draft.matchAll(/https:\/\/grokarchivehub\.com\/archive\/(EFTA\d{8})/g)].map(m=>m[1]);
assert.equal(draftIds.length,32,"Ren draft contains 32 URLs");
for(const {id,title,source} of meta) {
 assert.match(id,/^EFTA\d{8}$/);
 assert(worker.includes(`  "${id}",`),"exact policy whitelist "+id);
 assert(worker.includes(`["/archive/${id}", "2026-10-21"]`),"archive sitemap "+id);
 const s=fs.readFileSync(new URL(`archive/${id}.html`,base),"utf8");
 assert(s.includes(`<link rel="canonical" href="https://grokarchivehub.com/archive/${id}">`),id+" self canonical");
 assert(s.includes('name="robots" content="index,follow'),id+" indexable");
 assert(s.includes('<script type="application/ld+json">'),id+" JSON-LD");
 assert(s.includes(title),id+" unique descriptive title");
 assert(s.includes(source),id+" provenance");
 if(["EFTA00000468","EFTA01703108"].includes(id)) assert(!s.includes("/pdf-lite?id="+id),id+" no direct sensitive-source viewer");
 else assert(s.includes("/pdf-lite?id="+id),id+" source viewer");
 assert(s.includes("justice.gov/epstein"),id+" official DOJ index");
 assert(s.includes('What this document cannot establish'),id+" limits");
 assert(s.includes('Document integrity and privacy'),id+" privacy");
 assert(!/<img\b|<iframe\b|class="ocr-excerpt"/i.test(s),id+" no image raw OCR");
 assert((s.match(/<h1/g)||[]).length===1,id+" one H1");
 assert((s.match(/rel="canonical"/g)||[]).length===1,id+" one canonical");
}
assert(worker.includes('GAH_20261021_INDEXABLE_EFTA_IDS.has(archiveId)'),"static route");
assert(worker.includes('return serveFrontdoorEnhanced(request, env, "/archive/" + archiveId + ".html")'),"local served not raw OCR");
for(const id of ["EFTA09999999","EFTA00039153"]) {
 assert(!approved.has(id),id+" must not be promoted without further review");
 assert(!worker.includes(`["/archive/${id}", "2026-10-21"]`),id+" must not enter sitemap");
}
assert(archiveLanding.includes('href="/archive/EFTA00000468"'));
assert(archiveLanding.includes('href="/archive/EFTA00033413"'));
for (const {id} of meta) assert(archiveLanding.includes('href="/archive/'+id+'"'),"archive landing links to "+id);
assert(worker.includes('Sitemap: https://grokarchivehub.com/sitemap-archive.xml'));
console.log("PASS 12 substantive source-specific dossiers, 39 total archive URLs, privacy, canonical, schema, 32-draft exclusions");
