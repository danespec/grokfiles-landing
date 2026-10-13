import assert from "node:assert/strict";
import fs from "node:fs";
const read=(p)=>fs.readFileSync(new URL("../"+p,import.meta.url),"utf8");
const routeBase="https://grokarchivehub.com/guides/";
const worker=read("_worker.js");
const guides=read("guides/index.html");
const release="https://www.justice.gov/opa/pr/attorney-general-pamela-bondi-releases-first-phase-declassified-epstein-files";
const pages=[
  ["epstein-black-book-redacted-doj","contact book","https://www.justice.gov/ag/media/1391321/dl?inline"],
  ["epstein-flight-logs-doj","flight logs","https://www.justice.gov/ag/media/1391276/dl?inline"]
];
for(const [slug,title,official] of pages){
 const page=read("guides/"+slug+".html");
 assert.match(page,/<html lang="en">/);
 assert.match(page,/<meta name="robots" content="index,follow">/);
 assert.ok(page.includes('<link rel="canonical" href="'+routeBase+slug+'">'));
 assert.ok(page.includes('<h1>') && page.includes('<title>'));
 assert.ok(page.toLowerCase().includes(title));
 assert.ok(page.includes(release),"DOJ press release provenance");
 assert.ok(page.includes(official),"DOJ original PDF link");
 assert.ok(page.includes('href="/corrections"'));
 assert.ok(guides.includes('href="/guides/'+slug+'"'));
 assert.ok(guides.includes('"url":"'+routeBase+slug+'"'));
 assert.ok(worker.includes('["/guides/'+slug+'", "/guides/'+slug+'.html"]'));
 assert.ok(worker.includes('["'+routeBase+slug+'", "2026-10-13"]'));
}
const book=read("guides/epstein-black-book-redacted-doj.html");
assert.ok(book.includes('A searchable name or phone entry in a contact book is not a finding'));
assert.ok(book.includes('not</em> related to GAH') || book.includes('not</strong> related to GAH') || book.includes('This guide is <strong>not</strong> related to GAH'));
assert.ok(book.includes('Grok Archive Hub') && book.includes('Contact Book_Redacted'));
const logs=read("guides/epstein-flight-logs-doj.html");
const codes=["1391276","1391281","1391291","1391296","1391301","1391306","1391311"];
for(const id of codes)assert.ok(logs.includes('https://www.justice.gov/ag/media/'+id+'/dl?inline'));
assert.ok(logs.includes('does not assert that every year from 1997 through 2006 is covered'));
assert.ok(logs.includes('A flight leg is a transportation record, not evidence of a crime'));
assert.ok(!logs.includes('Ghislaine Maxwell committed'));
assert.ok(guides.includes('"position":7'));
console.log("PASS DOJ contact-book and flight-log source URLs, seven releases, canonical routing, metadata and no-overclaim checks");
