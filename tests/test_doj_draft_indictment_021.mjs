import assert from "node:assert/strict";
import fs from "node:fs";

const read=(p)=>fs.readFileSync(new URL("../"+p,import.meta.url),"utf8");
const slug="epstein-2007-draft-federal-indictment";
const canonical="https://grokarchivehub.com/guides/"+slug;
const page=read("guides/"+slug+".html");
const guides=read("guides/index.html");
const npa=read("guides/epstein-2007-npa-chronology.html");
const worker=read("_worker.js");
const requirements=[
 '<html lang="en">',
 '<meta name="robots" content="index,follow">',
 '<link rel="canonical" href="'+canonical+'">',
 '<main class="shell" id="main">',
 '<h1>',
 'EFTA01703108',
 '56-page',
 '53-page',
 '60-count',
 '82-page',
 'not independently established',
 'not the same as filing',
 'https://www.justice.gov/epstein/files/DataSet%2010/EFTA01703108.pdf',
 'https://www.justice.gov/epstein/doj-disclosures/data-set-10-files',
 'https://commons.wikimedia.org/wiki/File:Jeffrey_Epstein_federal_draft_indictment_2007.pdf',
 'https://www.justice.gov/opa/press-release/file/1336416/dl?inline=',
 'https://www.justice.gov/osg/media/1185486/dl?inline=',
 'e31d4a34caaef4ac4e1feed526ee2b5cb6bab65164d91ea58fb2b7a3170668b0',
 'href="/corrections"',
 'href="/guides/epstein-2007-npa-chronology"'
];
for(const value of requirements){
 if(value==="not the same as filing"){
   assert.ok(page.includes('not the same as filing an indictment'),value);
 } else assert.ok(page.includes(value),"Missing essential documented element: "+value);
}
assert.ok(guides.includes('href="/guides/'+slug+'"'));
assert.ok(guides.includes('"url":"'+canonical+'"'));
assert.ok(guides.includes('"position":8'));
assert.ok(npa.includes('href="/guides/'+slug+'"'));
assert.ok(worker.includes('["/guides/'+slug+'", "/guides/'+slug+'.html"]'));
assert.ok(worker.includes('["'+canonical+'", "2026-10-13"]'));
assert.ok(!page.includes('all 56 pages independently certified'));
assert.ok(!page.includes('indicted in 2007 and convicted'));
console.log("PASS DOJ-linked 2007 draft indictment locator, version caveats, eight-guide hub, canonical/sitemap and crosslink");
