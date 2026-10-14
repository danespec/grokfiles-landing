import assert from "node:assert/strict";
import fs from "node:fs";
import {fileURLToPath} from "node:url";
import path from "node:path";
const base=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const cases=[
 ["investigations/fbi-review-holdings-vault-parts-12-13.html","2026-10-11","October 11, 2026","New FBI Vault Parts 12–13"],
 ["guides/epstein-black-book-redacted-doj.html","2026-10-13","October 13, 2026","official redacted contact book"]
];
for(const [file,iso,date,subject] of cases){
 const source=fs.readFileSync(path.join(base,file),"utf8");
 const before=source.indexOf("</h1>");
 const byline='<p class="article-meta">By Grok Archive Hub · Published '+date+'</p>';
 assert.ok(before>=0,file+" requires heading");
 assert.ok(source.includes(byline),file+" requires visible attribution");
 assert.equal(source.split(byline).length,2,file+" must have one attribution");
 assert.ok(source.indexOf(byline)>before,file+" byline follows primary H1");
 assert.ok(source.includes('"datePublished":"'+iso+'"'),file+" new visible date must match already-published JSON-LD");
 assert.ok(source.includes('"name":"Grok Archive Hub"'),file+" byline must match structured organization author");
 assert.ok(source.includes(subject),file+" original editorial context retained");
 assert.ok(source.includes("justice.gov")||source.includes("vault.fbi.gov"),file+" original source links retained");
}
console.log("PASS GAH-EDITORIAL-042: visible organizational bylines agree with existing published dates and source documents retained");
