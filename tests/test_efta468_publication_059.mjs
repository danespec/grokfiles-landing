import assert from "node:assert/strict";
import fs from "node:fs";
const root=new URL("../",import.meta.url);
const path="/news/efta00000468-removal-restoration-audit";
const url="https://grokarchivehub.com"+path;
const h=fs.readFileSync(new URL("../news/efta00000468-removal-restoration-audit.html",import.meta.url),"utf8");
const worker=fs.readFileSync(new URL("../_worker.js",import.meta.url),"utf8");
const news=fs.readFileSync(new URL("../news.html",import.meta.url),"utf8");
const latest=fs.readFileSync(new URL("../latest.html",import.meta.url),"utf8");
assert.ok(h.includes('<link rel="canonical" href="'+url+'">'),"canonical public URL");
assert.ok(h.includes('<meta name="robots" content="index,follow">'),"indexable");
assert.ok(h.includes('<meta name="gah-ad-eligible" content="false">'),"explicit ad exclusion");
assert.ok(h.includes('<meta name="gah-ad-status" content="AD-EXCLUDE">'));
assert.ok(!h.includes('pagead2.googlesyndication.com/pagead/js/adsbygoogle.js'),"no live ads");
for(const s of [
 "Dec. 19, 2025","Dec. 20, 2025","Dec. 21, 2025",
 "Sept. 27, 2026","Sept. 28–29, 2026","Oct. 14, 2026",
 "not independently verified","age-verification","EFTA00000466.pdf",
 "EFTA00000470.pdf","one-page","376.2 KB",
 "No source photograph reproduced","without alteration or additional redaction",
 "is not a missing-file finding"
])assert.ok(h.includes(s),"missing dated or evidentiary qualifier: "+s);
for(const s of ["www.justice.gov/epstein/files/DataSet%201/EFTA00000468.pdf",
 "reuters.com/world/us/justice-department-restores-trump-photo-public-database-epstein-files-2025-12-21",
 "leadstories.com/hoax-alert/2025/12/fact-check-epstein-file-468-with-showing-trump-did-disappear.html",
 "tommycarstensen.com/epstein/deleted.html",
 "www.tommycarstensen.com/epstein/efta_index_set_1.html"])
assert.ok(h.includes(s),"missing source "+s);
const script=h.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
assert.ok(script,"no structured data");
const j=JSON.parse(script[1]);
assert.equal(j["@graph"][0]["@type"],"NewsArticle");
assert.equal(j["@graph"][0].url,url);
assert.equal(j["@graph"][0].datePublished,"2026-10-14");
assert.ok(j["@graph"][0].citation.length>=7);
assert.ok(news.includes('href="'+path+'"'),"news index link");
assert.ok(latest.includes('href="'+path+'"'),"latest index link");
for(const phrase of [
 '  ["'+path+'", "sensitive-public-records-news-ad-free"]',
 '  ["'+path+'", "'+path+'.html"]',
 '  ["'+url+'", "2026-10-14"]',
 ' || clean === "'+path+'"'
]) assert.ok(worker.includes(phrase),"worker missing "+phrase);
const exp=worker.split("const AD_ELIGIBLE_EXACT_PATHS = new Map([")[1].split("]);")[0];
assert.ok(!exp.includes(path),"never ad-eligible");
assert.ok(worker.includes('"'+path+'"\n  ].includes(policyPath)')||worker.includes('"'+path+'"\r\n  ].includes(policyPath)'),"image-free article must not inherit unrelated photo");
assert.ok(worker.includes("approvedDefault: false"),"AdSense stays unapproved");
console.log("PASS GAH EFTA468-059: source-linked dated audit, meta, ad exclusion, sitemap, canonical, news and latest");
