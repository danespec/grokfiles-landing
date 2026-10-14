import assert from "node:assert/strict";
import fs from "node:fs/promises";
import vm from "node:vm";
import path from "node:path";
import {fileURLToPath} from "node:url";
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const worker=(await import(new URL("../_worker.js?gah-instagram-060",import.meta.url))).default;
const source=await fs.readFile(root+"/_worker.js","utf8");
const profile="https://www.instagram.com/grokarchivehub/";
const mockedAssets={async fetch(input){
  const url=new URL(typeof input==="string"?input:input.url);
  const route=url.pathname==="/"?"/index.html":url.pathname;
  try{
    const bytes=await fs.readFile(root+route);
    const ext=path.extname(route);
    const contentType=ext===".html"?"text/html; charset=utf-8":ext===".json"?"application/json":ext===".xml"?"application/xml":"application/octet-stream";
    return new Response(bytes,{status:200,headers:{"Content-Type":contentType}});
  }catch{return new Response("not found",{status:404,headers:{"Content-Type":"text/plain"}});}
}};
const env={ASSETS:mockedAssets,X_TOKEN_STORE:{get:async()=>null}};
const routes=["/","/news/efta00000468-removal-restoration-audit","/investigations/barak-gadeco-fee-2014","/guides/how-to-search-epstein-files"];
let checked=0;
for(const route of routes){
 const res=await worker.fetch(new Request("https://grokarchivehub.com"+route),env);
 const html=await res.text();
 assert.equal(res.status,200,route+" HTTP200");
 assert.equal((html.match(/data-gah-social-profiles(?=\b)/g)||[]).length,1,route+" exactly one social footer");
 const footer=html.match(/<div[^>]+data-gah-social-profiles[^>]*>[\s\S]*?<\/div>/i)?.[0]||"";
 assert.ok(footer.includes('href="'+profile+'"'),route+" official Instagram footer");
 assert.ok(footer.includes("Instagram @grokarchivehub"),route+" clear text handle");
 assert.ok(footer.includes('rel="me noopener noreferrer"'),route+" safe external link and identity rel");
 assert.ok(footer.includes("X @DaneMilSpec")&&footer.includes("Reddit u/Salt_Cry2674"),route+" existing social links retained");
 const nav=html.match(/<nav class="nav-mobile"[^>]*>[\s\S]*?<\/nav>/i)?.[0]||"";
 assert.ok(nav.includes('href="'+profile+'"'),route+" mobile navigation");
 assert.ok(nav.includes('target="_blank"'),route+" opens off-site");
 const org=html.match(/<script type="application\/ld\+json" data-gah-social-org>([\s\S]*?)<\/script>/i)?.[1];
 assert.ok(org,route+" structured organization");
 const ld=JSON.parse(org);
 assert.ok(ld.sameAs.includes(profile),route+" sameAs");
 assert.ok(ld.sameAs.includes("https://x.com/DaneMilSpec"),route+" existing sameAs");
 assert.equal(res.headers.get("X-GAH-Ad-Approved"),"false",route+" advertising unchanged");
 assert.ok(html.includes("content=\"false\"")||res.headers.get("X-GAH-Ad-Eligible")!=="true",route+" do not enable ads");
 console.log("PASS",route,"footer, mobile, structured data, and ad guard");
 checked++;
}
const first=source.indexOf("function globalFooterHtml() {");
const last=source.indexOf("function addBodyClass(",first);
assert.ok(first>0&&last>first);
const fallback=vm.runInNewContext(source.slice(first,last)+"\nglobalFooterHtml");
assert.ok(fallback().includes('href="'+profile+'"'),"legacy fallback footer");
console.log("PASS legacy fallback footer");
assert.ok(source.includes('PAYPAL_LIVE_CHECKOUT_ENABLED'),"commerce controls retained");
assert.ok(source.includes('approvedDefault: false'),"AdSense disabled defaults retained");
console.log("RESULT",checked,"real Worker route renderings, one legacy fallback; no external requests");
