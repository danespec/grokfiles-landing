import assert from "node:assert/strict";
import fs from "node:fs";

const workerSource=fs.readFileSync(new URL("../_worker.js",import.meta.url),"utf8");
const index=fs.readFileSync(new URL("../guides/index.html",import.meta.url),"utf8");
const articles=[
  "how-to-search-epstein-files",
  "doj-epstein-data-sets",
  "epstein-client-list-explained",
  "epstein-files-transparency-act",
];
assert.ok(workerSource.includes('["/guides", "/guides/index.html"]'));
assert.ok(workerSource.includes('["/guides/", "/guides/index.html"]'));
assert.ok(workerSource.includes('["https://grokarchivehub.com/guides", "2026-10-13"]'));
assert.match(index,/<html lang="en">/);
assert.match(index,/<meta name="robots" content="index,follow">/);
assert.match(index,/<link rel="canonical" href="https:\/\/grokarchivehub\.com\/guides">/);
assert.match(index,/<main id="main"/);
assert.match(index,/<nav aria-label="Primary"/);
assert.match(index,/<script type="application\/ld\+json">/);
assert.match(index,/<h1>Epstein records research guides<\/h1>/);
for (const slug of articles) {
  assert.ok(index.includes('href="/guides/'+slug+'"'),"missing guide card "+slug);
  assert.ok(index.includes('"url":"https://grokarchivehub.com/guides/'+slug+'"'),"missing structured-data item "+slug);
  const content=fs.readFileSync(new URL("../guides/"+slug+".html",import.meta.url),"utf8");
  assert.ok(content.includes('rel="canonical"'),"existing guide missing canonical "+slug);
}
assert.ok(index.includes('https://www.justice.gov/epstein'));
assert.ok(index.includes('href="/methodology"'));
assert.ok(index.includes('href="/corrections"'));
assert.ok(index.includes('A name in a file does not establish misconduct'));
assert.ok(!index.includes('href="/guides/index.html"'));
console.log("PASS guide index, sitemap entry, four source-backed cards, accessibility and canonical invariants");
