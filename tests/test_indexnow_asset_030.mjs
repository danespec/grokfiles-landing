import assert from "node:assert/strict";
import fs from "node:fs";
const base=new URL("../",import.meta.url);
const key="4843e5196190a1e2fc249c49d3172510";
const route=JSON.parse(fs.readFileSync(new URL("_routes.json",base),"utf8"));
const file=fs.readFileSync(new URL(key+".txt",base),"utf8");
assert.equal(file,key,"IndexNow site key must be exactly the published file content");
assert.deepEqual(route.include,["/*"],"Existing Worker request coverage must be unchanged");
assert.equal(route.exclude.filter(x=>x==="/"+key+".txt").length,1,"One exact indexnow TXT exclusion only");
assert.ok(route.exclude.every(x=>!x.includes("api/") && !x.includes("admin") && !x.includes("private/")),
  "Do not exempt protected routes from Worker");
assert.ok(route.exclude.includes("/evidence-data/*.json"),"Existing evidence asset exclusions must remain");
assert.ok(!route.exclude.includes("/*.txt"),"No generic TXT routing bypass");
assert.ok(!route.exclude.includes("/*"),"No broad routing bypass");
const worker=fs.readFileSync(new URL("_worker.js",base),"utf8");
assert.ok(worker.includes("GAH-WWW-APEX-301"),"Existing WWW canonical logic must remain");
assert.ok(worker.includes("serveWikiHostNoindexRoute"),"Existing Wiki canonical/guard path must remain");
console.log("PASS GAH-SEO-030: exact public IndexNow verification route, no broad Worker exclusion");
