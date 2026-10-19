import fs from 'node:fs';
import assert from 'node:assert/strict';
const source=fs.readFileSync(new URL('../_worker.js',import.meta.url),'utf8');
assert(source.includes('url.hostname === APEX_HOST &&\n      path === "/sitemap-index.xml"'));
assert(source.includes('<sitemap><loc>https://grokarchivehub.com/sitemap.xml</loc></sitemap>'));
assert(source.includes('request.method === "HEAD" ? null : xml'));
assert(source.includes('return serveSitemapWithPublishedDispatches(request, env)'));
assert(!source.includes('https://wiki.grokarchivehub.com/sitemap-archive-1.xml'));
console.log('PASS apex sitemap-index override, HTML-safe static XML, HEAD support, canonical sitemap preserved');
