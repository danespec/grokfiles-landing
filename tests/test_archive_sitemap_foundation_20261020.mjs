import fs from "node:fs";
import assert from "node:assert/strict";
const code=fs.readFileSync(new URL("../_worker.js",import.meta.url),"utf8");
const ids=["EFTA00013764","EFTA00035147","EFTA00039025","EFTA00039356","EFTA00039416","EFTA00039660"];
assert(code.includes('path === "/sitemap-archive.xml"'));
assert(code.includes("serveCuratedArchiveSitemap(request)"));
assert(code.includes('X-GAH-Archive-Sitemap'));
assert(code.includes('https://grokarchivehub.com/sitemap-archive.xml'));
for(const id of ids) {
 assert(code.includes('["/archive/'+id+'",'));
 const page=fs.readFileSync(new URL("../archive/"+id+".html",import.meta.url),"utf8");
 assert(page.includes('name="robots" content="index,follow"'),id+" must be indexable");
 assert(page.includes('rel="canonical" href="https://grokarchivehub.com/archive/'+id+'"'),id+" must be canonical");
}
for(const id of ["EFTA00035119","EFTA00035613","EFTA02858481","EFTA00153570"])
 assert(!code.includes('["/archive/'+id+'",'),"unreviewed or sensitive page excluded "+id);
assert(code.includes('return serveSitemapWithPublishedDispatches(request, env)'));
assert(code.includes('request.method === "HEAD" ? null : xml'));
console.log("PASS curated-only archive sitemap; existing main sitemap preserved");
