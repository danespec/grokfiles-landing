import fs from 'node:fs';
import assert from 'node:assert/strict';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const worker=fs.readFileSync(path.join(root,'_worker.js'),'utf8');
assert(!worker.includes('["/news", "phang-news-backing-files-absent"]'),'old noindex exclusion must be gone');
assert(worker.includes('return serveFrontdoorEnhanced(request, env, "/news.html");'),'new newsroom must serve');
assert(worker.includes('path.startsWith("/news/phang-docket-watch")'),'preserve Phang review policy');
for(const route of ['news','guides']){
 const html=fs.readFileSync(path.join(root,route+'.html'),'utf8');
 assert.equal((html.match(/<h1(?:\s|>)/g)||[]).length,1,route+' one h1');
 assert(html.includes('<meta name="robots" content="index,follow">'));
 assert(html.includes('<link rel="canonical" href="https://grokarchivehub.com/'+route+'">'));
 assert(html.includes('<script type="application/ld+json">'));
 assert(html.includes('/frontdoor/consent.js'));
 assert(worker.includes('["/'+route+'", "/'+route+'.html"]'),'asset route for '+route);
 assert(worker.includes('["https://grokarchivehub.com/'+route+'",'),'sitemap route '+route);
 assert(!html.includes('noindex'));
 const json=Array.from(html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs),m=>JSON.parse(m[1]));
 assert(json.some(x=>x['@type']==='CollectionPage'),route+' CollectionPage schema');
 assert(json.some(x=>x['@type']==='BreadcrumbList'),route+' breadcrumb schema');
 console.log('PASS',route,'canonical / metadata / links / schema');
}
const guides=fs.readFileSync(path.join(root,'guides.html'),'utf8');
assert((guides.match(/href="\/guides\//g)||[]).length>=7,'all seven guides linked');
const news=fs.readFileSync(path.join(root,'news.html'),'utf8');
assert((news.match(/href="\/news\//g)||[]).length>=5,'four news plus Phang status');
for(const p of ['index.html','start.html']) {
 const html=fs.readFileSync(path.join(root,p),'utf8');
 assert(html.includes('href="/news"')&&html.includes('href="/guides"'),p+' links to both hubs');
}
console.log('PASS all SEO discovery hub assertions');
