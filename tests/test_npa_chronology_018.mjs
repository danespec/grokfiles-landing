import assert from "node:assert/strict";
import fs from "node:fs";

const root = new URL("../", import.meta.url);
const page=fs.readFileSync(new URL("guides/epstein-2007-npa-chronology.html",root),"utf8");
const guides=fs.readFileSync(new URL("guides/index.html",root),"utf8");
const worker=fs.readFileSync(new URL("_worker.js",root),"utf8");
assert.match(page,/<html lang="en">/);
assert.match(page,/<meta name="robots" content="index,follow">/);
assert.match(page,/<link rel="canonical" href="https:\/\/grokarchivehub\.com\/guides\/epstein-2007-npa-chronology">/);
assert.match(page,/<meta name="description" content="[^"]+">/);
assert.match(page,/<h1>Epstein's 2007–08 non-prosecution agreement:/);
assert.match(page,/<a class="skip" href="#main">/);
for(const date of ["2007-05","2007-07-31","2007-09-24","2008-06-23","2008-06-30","2008-07-07"]){
  assert.ok(page.includes('datetime="'+date+'"'),"Missing dated primary event "+date);
}
for(const phrase of ["60-count indictment","53-page draft indictment","September 24, 2007","June 30, 2008","poor judgment","not</strong> find professional misconduct","must be verified before GAH offers"]){
  assert.ok(page.includes(phrase), "Missing bounded source distinction "+phrase);
}
for(const official of ["justice.gov/opa/press-release/file/1336416/dl","justice.gov/archives/opa/pr/statement-doj","justice.gov/osg/media/1185486/dl","justice.gov/multimedia/Court%20Records/"]){
  assert.ok(page.includes(official),"Missing official primary link "+official);
}
for(const phrase of ["the NPA was an agreement","The signed NPA's complete provenance","state convictions"]){
 assert.ok(page.includes(phrase),"Missing editorial uncertainty "+phrase);
}
assert.ok(guides.includes('href="/guides/epstein-2007-npa-chronology"'));
assert.ok(guides.includes('"position":5'));
assert.ok(guides.includes('"url":"https://grokarchivehub.com/guides/epstein-2007-npa-chronology"'));
const sitemap="https://grokarchivehub.com/guides/epstein-2007-npa-chronology";
assert.equal(worker.split('["'+sitemap+'", "2026-10-13"]').length-1,1);
assert.ok(!page.includes('Epstein client list of guilty'));
console.log("PASS 13 NPA chronology primary-source, dates, caveat, indexing and cross-links assertions");
