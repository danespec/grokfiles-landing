import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const source = await readFile(new URL('../_worker.js',import.meta.url),'utf8');
const {default:worker, enhanceEditorialAuthorship, enhanceHtmlText} = await import('data:text/javascript;base64,'+Buffer.from(source+'\nexport {enhanceEditorialAuthorship, enhanceHtmlText};').toString('base64'));
const canonical='https://grokarchivehub.com/investigations/example';
const profile='https://grokarchivehub.com/about-the-operator#editorial-responsibility';
const article={ '@context':'https://schema.org','@type':'NewsArticle',headline:'Example',mainEntityOfPage:canonical,datePublished:'2026-09-01',author:{'@type':'Organization',name:'Grok Archive Hub Editorial Desk'}};
const wrap=data=>'<!doctype html><html><head><title>Example</title><script type="application/ld+json">'+JSON.stringify(data)+'</script></head><body><main><h1>Example</h1><p class="byline">Grok Archive Hub Editorial Desk · September 1, 2026</p></main></body></html>';
const parse=s=>JSON.parse(s.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
let output=enhanceEditorialAuthorship(wrap(article),canonical);
assert.equal(parse(output).author.url,profile);
assert.equal(parse(output).author['@type'],'Organization');
assert.equal(parse(output).datePublished,'2026-09-01');
assert.match(output, /<a rel="author" href="[^"]+#editorial-responsibility">Grok Archive Hub Editorial Desk<\/a>/);
assert.equal(enhanceEditorialAuthorship(output,canonical),output,'idempotent links and schema');
const person={...article,author:{'@type':'Person',name:'Thomas'}};
assert.equal(parse(enhanceEditorialAuthorship(wrap(person),canonical)).author.url,'https://grokarchivehub.com/about-the-operator#operator');
const external={...article,author:{'@type':'Person',name:'Independent Contributor',url:'https://example.com/profile'}};
assert.deepEqual(parse(enhanceEditorialAuthorship(wrap(external),canonical)),external,'external authors preserved');
const existing={...article,author:{...article.author,url:'https://example.com/existing'}};
assert.equal(parse(enhanceEditorialAuthorship(wrap(existing),canonical)).author.url,existing.author.url);
const multiple={...article,author:[article.author,external.author]};
const multi=parse(enhanceEditorialAuthorship(wrap({'@graph':[multiple]}),canonical))['@graph'][0];
assert.equal(multi.author[0].url,profile);
assert.deepEqual(multi.author[1],external.author);
const absent={...article}; delete absent.author;
assert.ok(!parse(enhanceEditorialAuthorship(wrap(absent),canonical)).author,'do not invent missing authors');
const noByline=wrap(article).replace(/<p class="byline">.*?<\/p>/,'');
const responsibility=enhanceEditorialAuthorship(noByline,canonical);
assert.match(responsibility,/data-gah-authorship="v1"/);
assert.equal((enhanceEditorialAuthorship(responsibility,canonical).match(/data-gah-authorship="v1"/g)||[]).length,1);
assert.ok(!enhanceEditorialAuthorship(noByline,canonical+'/different').includes('data-gah-authorship'),'listing cards do not create page authorship');
const bad='<script type="application/ld+json">{invalid}</script>';
assert.equal(enhanceEditorialAuthorship(bad,canonical),bad,'malformed unrelated schema remains untouched');
const linked=wrap(article).replace('Grok Archive Hub Editorial Desk ·','<a href="/custom">Grok Archive Hub Editorial Desk</a> ·');
assert.ok(enhanceEditorialAuthorship(linked,canonical).includes('<a href="/custom">Grok Archive Hub Editorial Desk</a>'),'existing visible author links preserved');
output=enhanceHtmlText(wrap(article),canonical,{},{});
assert.equal(parse(output).author.url,profile,'real enhancement pipeline links authors');
assert.ok(!output.includes('pagead/js/adsbygoogle.js'),'approval gate remains disabled');
for(const slug of ['verified-source-cards','source-card-efta00067364-calendar-epstein','source-card-efta00082040-black-book-epstein','source-card-efta00095936']){
 const path='/research/evidence/'+slug;
 const env={ASSETS:{fetch:async request=>{
   const asset=new URL(typeof request === "string" ? request : request.url).pathname;
   try{return new Response(await readFile(new URL('..'+asset,import.meta.url),'utf8'),{headers:{'Content-Type':'text/html'}});}
   catch{return new Response('Missing',{status:404});}
 }}};
 const response=await worker.fetch(new Request('https://grokarchivehub.com'+path),env,{waitUntil(){}});
 const body=await response.text();
 assert.equal(response.status,200,path);
 assert.equal(response.headers.get('X-GAH-Ad-Status'),'AD-EXCLUDE');
 assert.match(response.headers.get('X-Robots-Tag'),/noindex/);
 assert.ok(!body.includes('pagead/js/adsbygoogle.js'));
 assert.ok(!body.includes('pending manual visual confirmation'));
 assert.ok(!body.includes('V110 can publish'));
 assert.ok(body.includes('AI-assisted'));
 assert.equal((body.match(/<header\b/g)||[]).length,1,'one shared header');
 assert.equal((body.match(/>Skip to content<\/a>/g)||[]).length,1,'one skip link');
}
console.log('PASS authorship identity, visible links, arrays, preserved external authors/dates, idempotency, real pipeline and four routed source reviews');
