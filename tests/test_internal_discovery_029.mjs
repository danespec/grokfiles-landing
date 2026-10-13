import assert from "node:assert/strict";
import fs from "node:fs";
const home=fs.readFileSync(new URL("../index.html",import.meta.url),"utf8");
const book=fs.readFileSync(new URL("../book-of-black/index.html",import.meta.url),"utf8");
const expected=[
  "/guides/epstein-2007-npa-chronology",
  "/guides/epstein-2007-draft-federal-indictment",
  "/guides/epstein-black-book-redacted-doj",
  "/guides/epstein-flight-logs-doj",
  "/photos",
];
for(const target of expected){
  assert.equal(home.split('href="'+target+'"').length-1,1,
    "Homepage should link exactly once to "+target);
}
assert.ok(home.includes("Source inclusion alone does not establish conduct or guilt."),
  "Source-led guide links must retain evidentiary caveat");
assert.ok(home.includes('aria-label="Original DOJ and court record guides"'),
  "Accessible label required");
assert.ok(book.includes('href="/book-of-black/methodology"'),
  "Book of Black must link to own editorial methodology");
assert.ok(book.includes("not evidence")||book.includes("not the evidence layer"),
  "Book methodology link must be accompanied by evidence boundary");
const guide=fs.readFileSync(new URL("../guides/index.html",import.meta.url),"utf8");
for(const target of expected.slice(0,4))
  assert.ok(guide.includes('href="'+target+'"'),"Guide index changed unexpectedly");
console.log("PASS GAH-SEO-029: two orphan URLs linked, four source guides promoted with caveats");
