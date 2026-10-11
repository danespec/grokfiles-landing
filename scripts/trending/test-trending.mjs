import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {pathToFileURL} from "node:url";
const dir=new URL("../../",import.meta.url).pathname.replace(/\/$/,"");
const worker=(await import(pathToFileURL(dir+"/_worker.js").href+"?trending-test")).default;
const demo=JSON.parse(await readFile(dir+"/frontdoor/trending-demo-v1.json","utf8"));
const css=new Map([[".css","text/css"],[".js","application/javascript"],[".json","application/json"]]);
const readAsset=async input=>{
 const path=new URL(typeof input==="string"?input:input.url).pathname;
 const file=path==="/"?"/index.html":path==="/latest"?"/latest.html":path;
 try{
  const data=await readFile(dir+file);
  const type=[...css].find(([ext])=>file.endsWith(ext))?.[1]||"text/html";
  return new Response(data,{status:200,headers:{"Content-Type":type}});
 }catch(e){return new Response("NOT_FOUND",{status:404})}
};
const mkEnv=(feed,staging=false)=>({
 ASSETS:{fetch:readAsset},
 ...(staging?{GAH_STAGING:"true"}:{}),
 X_TOKEN_STORE:{get:async(key,type)=>{
   assert.equal(key,"gah:public:trending:topics:v1");assert.equal(type,"json");
   return feed;
 }}
});
const base="https://grokarchivehub.com";
const check=async(path,env)=>worker.fetch(new Request(base+path),env);
const valid={...demo,preview:false,status:"active",
 items:demo.items.map(({query,url})=>({query,url,signal:"search_suggestion_plus_news",score:0.87}))};
let count=0;
const yes=(name,ok)=>{assert.ok(ok,name);console.log("PASS",name);count++};
const home=await check("/",mkEnv(valid));
const html=await home.text();
yes("production home HTTP 200",home.status===200);
yes("home renders validated six-item block",html.includes("gah-trend-box")&&(html.match(/class="gah-trend-items"/g)||[]).length===1);
yes("trend links are source-linked",html.includes("/evidence-briefs/leon-black-158m-170m-epstein-payments"));
yes("KV feed does not leak raw JSON",!html.includes("search_suggestion_plus_news"));
const latest=await check("/latest",mkEnv(valid));
yes("latest displays same shared module",(await latest.text()).includes("gah-trend-box"));
const staging=await check("/",mkEnv(null,true));
const sh=await staging.text();
yes("protected staging uses labeled sample, not fake live signal",sh.includes("Design preview only")&&sh.includes('data-preview="true"'));
const none=await check("/",mkEnv(null));
const noneHtml=await none.text();
yes("missing feed hidden cleanly",none.status===200&&noneHtml.includes("Latest investigations")&&!noneHtml.includes('class="gah-trend-box"'));
for(const [label,data] of [
 ["stale",{...valid,generated_at:new Date(Date.now()-25*3600000).toISOString()}],
 ["future",{...valid,generated_at:new Date(Date.now()+3600000).toISOString()}],
 ["accusation",{...valid,items:[...valid.items.slice(0,5),{query:"Epstein criminal arrested person",url:"/search",signal:"search_suggestion_plus_news"}]}],
 ["offsite",{...valid,items:[...valid.items.slice(0,5),{query:"Epstein financial document",url:"//attacker.invalid",signal:"search_suggestion_plus_news"}]}],
 ["short",{...valid,items:valid.items.slice(0,4)}],
 ["preview-in-prod",{...demo}]
]){
 const r=await check("/",mkEnv(data));const s=await r.text();
 yes(label+" feed fail-closed",r.status===200&&!s.includes('class="gah-trend-box"'));
}
const cssResponse=await check("/frontdoor/trending.css",mkEnv(valid));
yes("trending CSS served",cssResponse.status===200&&(await cssResponse.text()).includes(".gah-trend-box"));
yes("production never renders illustrative preview feed",!html.includes("Design preview only")&&!html.includes("data-preview=\"true\""));
yes("missing production feed never renders preview",!noneHtml.includes("Design preview only")&&!noneHtml.includes('class="gah-trend-box"'));
const guide=await check("/guides/how-to-search-epstein-files",mkEnv(valid));
yes("guide route loads real HTML",guide.status===200&&(await guide.text()).includes("How to search the Epstein files"));
const guideStaging=await check("/guides/doj-epstein-data-sets",mkEnv(null,true));
yes("staging guide noindexed",guideStaging.status===200&&guideStaging.headers.get("X-Robots-Tag")==="noindex, nofollow, noarchive");
const map=await check("/sitemap.xml",mkEnv(valid));
const xml=await map.text();
yes("both new guides in sitemap",map.status===200&&xml.includes("https://grokarchivehub.com/guides/how-to-search-epstein-files")&&xml.includes("https://grokarchivehub.com/guides/doj-epstein-data-sets"));
console.log("RESULT "+count+"/"+count+" PASS");
