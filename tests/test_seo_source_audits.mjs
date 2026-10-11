import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import {fileURLToPath} from "node:url";
const dir=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const worker=(await import(new URL("../_worker.js?seo-source-audit",import.meta.url))).default;
let count=0;
function pass(msg,v){assert.ok(v,msg);console.log("PASS",msg);count++}
const mockFetch=async input=>{
 const u=new URL(typeof input==="string"?input:input.url);
 const p=u.pathname==="/"?"/index.html":u.pathname==="/latest"?"/latest.html":u.pathname;
 const file=dir+p;
 try{
  const body=await fs.readFile(file);
  return new Response(body,{status:200,headers:{"Content-Type":p.endsWith(".xml")?"application/xml":p.endsWith(".js")?"application/javascript":p.endsWith(".css")?"text/css":"text/html"}});
 }catch{return new Response("Asset not found",{status:404})}
};
const env=(staging=false)=>({ASSETS:{fetch:mockFetch},...(staging?{GAH_STAGING:"true"}:{}),X_TOKEN_STORE:{get:async()=>null}});
const base="https://grokarchivehub.com";
const routes=[
 ["/guides/epstein-client-list-explained","Was there really an Epstein"],
 ["/guides/epstein-files-transparency-act","What is the Epstein Files Transparency Act"],
 ["/guides/how-to-search-epstein-files","How to search the Epstein files"],
 ["/guides/doj-epstein-data-sets","Epstein Files Data Sets 1–12"]
];
for(const [route,h1] of routes){
 const res=await worker.fetch(new Request(base+route),env());
 const body=await res.text();
 pass(route+" production status 200",res.status===200);
 pass(route+" unique intended H1",body.includes("<h1>"+h1));
 pass(route+" canonical and no index block",body.includes('rel="canonical" href="'+base+route+'"')&&res.headers.get("X-Robots-Tag")!=="noindex, nofollow, noarchive");
 const objects=[...body.matchAll(/<script type="application\/ld\+json">([^<]+)<\/script>/g)].map(x=>JSON.parse(x[1]));
 const faq=objects.find(x=>x["@type"]==="FAQPage");
 pass(route+" visible and structured FAQs",!!faq&&faq.mainEntity.length>=2&&faq.mainEntity.every(q=>body.includes(q.name)&&body.includes(q.acceptedAnswer.text)));
 const staging=await worker.fetch(new Request(base+route),env(true));
 pass(route+" staging noindex",staging.status===200&&staging.headers.get("X-Robots-Tag")==="noindex, nofollow, noarchive");
}
const home=await worker.fetch(new Request(base+"/"),env());
const html=await home.text();
pass("all guides permanently linked on homepage",routes.every(([p])=>html.includes('href="'+p+'"')));
const latest=await worker.fetch(new Request(base+"/latest"),env());
const latestHtml=await latest.text();
pass("all four guides actually linked on /latest",routes.every(([p])=>latestHtml.includes('href="'+p+'"')));
const sitemap=await worker.fetch(new Request(base+"/sitemap.xml"),env());
const xml=await sitemap.text();
pass("new guides in source sitemap",sitemap.status===200&&routes.every(([p])=>xml.includes(base+p)));

const client=(await fs.readFile(dir+"/guides/epstein-client-list-explained.html","utf8"));
pass("memo and law primary sources cited",client.includes('https://www.justice.gov/opa/media/1407001/dl')&&client.includes('PLAW-119publ38'));
pass("client list facts separated from contact records",client.includes("Address book / contact directory")&&client.includes("What it cannot prove alone"));
const act=await fs.readFile(dir+"/guides/epstein-files-transparency-act.html","utf8");
pass("new guides cross-link each other",client.includes('href="/guides/epstein-files-transparency-act"')&&act.includes('href="/guides/epstein-client-list-explained"'));
pass("EFTA guide documents Federal Register and post-release reporting duties",act.includes("Federal Register")&&act.includes("15 days after completion"));
const howto=(await fs.readFile(dir+"/guides/how-to-search-epstein-files.html","utf8"));
pass("worked EFTA00013764 example links to original DOJ PDF and source investigation",howto.includes("https://www.justice.gov/epstein/files/DataSet%208/EFTA00013764.pdf")&&howto.includes("/investigations/epstein-december-6-7-2007-decision-gap"));
const dataset=(await fs.readFile(dir+"/guides/doj-epstein-data-sets.html","utf8"));
pass("all 12 official data set landing pages linked",Array.from({length:12},(_,i)=>i+1).every(n=>dataset.includes('https://www.justice.gov/epstein/doj-disclosures/data-set-'+n+'-files')));
console.log("RESULT",count+"/"+count,"PASS");
