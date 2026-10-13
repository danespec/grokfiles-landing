import assert from "node:assert/strict";
import fs from "node:fs";

const base = new URL("../",import.meta.url);
const home=fs.readFileSync(new URL("index.html",base),"utf8");
const routes=JSON.parse(fs.readFileSync(new URL("_routes.json",base),"utf8"));
const worker=fs.readFileSync(new URL("_worker.js",base),"utf8");
const ico=fs.readFileSync(new URL("favicon.ico",base));

assert.ok(home.includes('<link rel="icon" type="image/x-icon" href="/favicon.ico?v=032" sizes="48x48">'));
assert.deepEqual(routes.include,["/*"],"Default Worker routing must remain");
assert.equal(routes.exclude.filter(x=>x==="/favicon.ico").length,1,"Only the exact icon path must be excluded");
assert.ok(routes.exclude.includes("/4843e5196190a1e2fc249c49d3172510.txt"),"IndexNow verification remains");
assert.ok(!routes.exclude.includes("/*.ico") && !routes.exclude.includes("/*"),"No wildcard bypass");
assert.ok(worker.includes('path === "/favicon.ico"'),"Legacy Worker branch remains for nonstatic fallback; route excludes it");
assert.equal(ico.readUInt16LE(0),0);
assert.equal(ico.readUInt16LE(2),1);
assert.equal(ico.readUInt16LE(4),2);
for(let i=0;i<2;i++){
 const pos=6+16*i;
 const expected=[48,96][i];
 assert.equal(ico[pos],expected);
 assert.equal(ico[pos+1],expected);
 const bytes=ico.readUInt32LE(pos+8),offset=ico.readUInt32LE(pos+12);
 assert.ok(bytes>70 && offset>=38 && offset+bytes<=ico.length);
 assert.equal(ico.subarray(offset,offset+8).toString("hex"),"89504e470d0a1a0a");
 assert.equal(ico.readUInt32BE(offset+16),expected);
 assert.equal(ico.readUInt32BE(offset+20),expected);
}
assert.ok(ico.length<20000,"Favicon must remain small");
console.log("PASS GAH-SEO-032: real PNG-encoded ICO, homepage discovery, exact Worker exclusion");
