import assert from "node:assert/strict";
import fs from "node:fs";
const read=(name)=>fs.readFileSync(name,"utf8");
const home=read("index.html");
const exact=read("archive/EFTA00013764.html");
const searchGuide=read("guides/how-to-search-epstein-files.html");
const datasetGuide=read("guides/doj-epstein-data-sets.html");
const worker=read("_worker.js");
const pages=[home,exact,searchGuide,datasetGuide];
const target="/archive/EFTA00013764";
assert(home.includes("<title>Epstein Files & Document Investigations | Grok Archive Hub</title>"));
assert(home.includes('name="description" content="Explore Grok Archive Hub\'s source-verified Epstein investigations:'));
assert(home.includes('rel="canonical" href="https://grokarchivehub.com/"'));
assert(home.includes('id="epstein-evidence-directory-heading"'));
assert(home.includes('GrokArchiveHub)'));
assert(home.includes('href="'+target+'"'));
assert(home.includes('href="/investigations/jpmorgan-nine-sars-epstein"'));
assert(home.includes('href="/guides/how-to-search-epstein-files"'));
assert(home.includes('rel="noopener noreferrer"') || home.includes('Grok Archive Hub'));
assert(exact.includes('<h1>EFTA00013764: December 7, 2007 “Hold the Letter” Email</h1>'));
assert(exact.includes('href="https://www.justice.gov/epstein/files/DataSet%208/EFTA00013764.pdf"'));
assert(exact.includes('not a claim that the PDF is mirrored locally'));
assert(exact.includes('rel="canonical" href="https://grokarchivehub.com'+target+'"'));
assert(exact.includes('href="/guides/how-to-search-epstein-files"'));
assert(searchGuide.includes('href="'+target+'"'));
assert(datasetGuide.includes('href="'+target+'"'));
assert(searchGuide.includes('href="/investigations/jpmorgan-nine-sars-epstein"'));
assert(datasetGuide.includes('href="/investigations/black-family-partners-source-of-funds-gap"'));
assert(datasetGuide.includes('does not identify any unnamed official or motive'));
for(const [name,content] of [["home",home],["EFTA dossier",exact],["search guide",searchGuide],["dataset guide",datasetGuide]]) {
 const titles=content.match(/<title>/g)||[],canonicals=content.match(/rel="canonical"/g)||[];
 assert.equal(titles.length,1,name+" unique title");
 assert.equal(canonicals.length,1,name+" unique canonical");
}
assert(worker.includes('["https://grokarchivehub.com/archive/EFTA00013764", "2026-10-20"]'));
for (const url of ["/", "/guides/how-to-search-epstein-files", "/guides/doj-epstein-data-sets"]) {
 assert(worker.includes('["https://grokarchivehub.com'+url+'", "2026-10-20"]'),"sitemap lastmod for edited page: "+url);
}
assert(worker.includes('const GAH_VERIFIED_LOCAL_EXACT_SOURCE_ROWS'));
console.log("PASS niche homepage metadata and source directory; exact-ID dossier and direct links; canonical, sitemap, search provenance and caution");
