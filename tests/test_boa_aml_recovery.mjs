import assert from "node:assert/strict";
import fs from "node:fs";
const slug="/news/bank-of-america-aml-penalties-epstein-settlement-2026";
const worker=fs.readFileSync("_worker.js","utf8");
const html=fs.readFileSync("news/bank-of-america-aml-penalties-epstein-settlement-2026.html","utf8");
const hub=fs.readFileSync("news.html","utf8");
assert(html.includes('<link rel="canonical" href="https://grokarchivehub.com'+slug+'">'));
assert(html.includes("<h1>Bank of America Faces $1.2B AML Penalty After Separate Epstein Settlement</h1>"));
for(const url of [
"https://www.fincen.gov/system/files/2026-10/BoA-Consent-Order-Execution-Final.pdf",
"https://www.occ.gov/news-issuances/news-releases/2026/nr-occ-2026-89.html",
"https://ofac.treasury.gov/recent-actions/20261013_33",
"https://law.justia.com/cases/federal/district-courts/new-york/nysdce/1:2025cv08520/651138/165/"
])assert(html.includes(url),"Original source missing: "+url);
assert(html.includes("no connection between the proceedings has been established"));
assert(html.includes("The FinCEN order does not name Epstein"));
assert(html.includes('meta name="gah-ad-eligible" content="false"'));
assert(hub.includes('href="'+slug+'"'));
const regions=[
["const FRONTDOOR_PATHS = new Set([","const AD_EXCLUDED_EXACT_PATHS = new Map(["],
["const AD_EXCLUDED_EXACT_PATHS = new Map([","const UTILITY_NOINDEX_EXACT_PATHS"],
["const FRONTDOOR_STATIC_ASSETS = new Map([","const CORE_SITEMAP_ENTRIES"],
["const CORE_SITEMAP_ENTRIES = [","const PUBLIC_EDITORIAL_SEARCH_ROWS"],
];
assert(worker.includes('  "'+slug+'",'),"Public frontdoor route missing");
assert(worker.includes('["'+slug+'", "'+slug+'.html"]'),"Static article route missing");
assert(worker.includes('["https://grokarchivehub.com'+slug+'", "2026-10-15"]'),"Sitemap route missing");
assert(worker.includes('["'+slug+'", "sensitive-public-records-news-ad-free"]'),"Ad-free policy missing");
assert(worker.includes('id: "GAH-NEWS-066"'),"Search listing missing");
assert(worker.includes('if (clean === "'+slug+'") return true;'),"RSS listing missing");
console.log("PASS restored Bank of America AML original article, exact caption URL, 4 sources, editorial limitations, routes, ad policy, sitemap, search and news index");
