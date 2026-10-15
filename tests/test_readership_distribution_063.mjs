import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import {fileURLToPath} from "node:url";
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const worker=(await import(new URL("../_worker.js?readership063",import.meta.url))).default;
const main="https://grokarchivehub.com";
const patreon="https://www.patreon.com/cw/grokarchivehub";
const ig="https://www.instagram.com/grokarchivehub/";
const mockAssets={async fetch(req){
 const u=new URL(typeof req==="string"?req:req.url);
 const file=u.pathname==="/"?"/index.html":(u.pathname.endsWith(".html")?u.pathname:u.pathname+".html");
 try{
  let buf=await fs.readFile(root+file);
  return new Response(buf,{status:200,headers:{"Content-Type":"text/html; charset=utf-8"}});
 }catch{return new Response("Not found",{status:404})}
}};
const env={ASSETS:mockAssets,X_TOKEN_STORE:{get:async()=>null}};
const routes=[
 ["/",false],["/news/efta00000468-removal-restoration-audit",true],
 ["/news/gadeco-chinese-consortium-declined",true],
 ["/news/doj-march-2025-review-emails-released",true],
 ["/news/phang-fbi-notes-in-camera-october-16",true],
 ["/investigations/barak-gadeco-fee-2014",true],
 ["/membership",false]
];
for(const [route,shareable] of routes){
 const res=await worker.fetch(new Request(main+route),env);
 const body=await res.text();
 assert.equal(res.status,200,route+" public HTTP 200");
 const footer=body.match(/<div[^>]*data-gah-social-profiles[^>]*>[\s\S]*?<\/div>/i);
 assert.ok(footer,route+" footer present");
 assert.ok(footer[0].includes('href="'+patreon+'"'),route+" Patreon profile link");
 assert.ok(footer[0].includes("Patreon · Support the research"),route+" supporter invitation");
 assert.ok(footer[0].includes('href="'+ig+'"'),route+" Instagram intact");
 assert.ok(footer[0].includes('href="https://x.com/DaneMilSpec"'),route+" X intact");
 assert.ok(footer[0].includes('rel="me noopener noreferrer"'),route+" safe external identity");
 assert.equal((body.match(/data-gah-social-profiles(?:[\s>])/g)||[]).length,1,route+" exactly one footer");
 const org=body.match(/<script type="application\/ld\+json" data-gah-social-org>([\s\S]*?)<\/script>/);
 assert.ok(org,route+" publisher schema");
 assert.ok(JSON.parse(org[1]).sameAs.includes(patreon),route+" Patreon sameAs");
 assert.equal((body.match(/<aside[^>]*data-gah-social-share\b/g)||[]).length,shareable?1:0,route+" share widget presence");
 if(shareable){
  assert.ok(/utm_source(?:%3D|=)x/i.test(body),route+" X share tracking");
  assert.ok(/utm_campaign(?:%3D|=)reader_share/i.test(body),route+" existing campaign retained");
  assert.ok(body.includes('data-gah-share-platform="Instagram"'),route+" share sheet Instagram");
  assert.ok(body.includes('data-gah-share-platform="Link"'),route+" copy link");
 }
 if(route==="/news/efta00000468-removal-restoration-audit"){
  assert.ok(body.includes("not independently verified"),"source caveat retained");
 }
 assert.equal(res.headers.get("X-GAH-Ad-Approved"),"false","ad approval unchanged");
 console.log("PASS",route,shareable?"share+footer":"footer");
}
console.log("PASS GAH-READERSHIP-063: 7 route renders, public news sharing, Patreon footer, schema, protections");
