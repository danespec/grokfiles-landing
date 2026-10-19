import fs from 'node:fs';
import assert from 'node:assert/strict';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const worker=fs.readFileSync(path.join(root,'_worker.js'),'utf8');
const cases=[
 ['investigations/fbi-vault-redaction-chronology-phang','FBI Vault Part 13','vault.fbi.gov','doj-oip-epstein-review-public-figure-flags-2026'],
 ['investigations/doj-oip-epstein-review-public-figure-flags-2026','DOJ Epstein Review Emails','justice.gov/oip/media/1465356','fbi-vault-redaction-chronology-phang']
];
for(const [slug,term,primary,cross] of cases){
 const h=fs.readFileSync(path.join(root,slug+'.html'),'utf8');
 const get=(rx)=>{const m=h.match(rx);return m?.[1]??'';};
 const title=get(/<title>(.*?)<\/title>/s);
 const heading=get(/<h1[^>]*>(.*?)<\/h1>/s).replace(/<[^>]*>/g,'');
 const description=get(/<meta name="description" content="([^"]+)"/);
 const canonical=get(/<link rel="canonical" href="([^"]+)"/);
 const ld=JSON.parse(get(/<script type="application\/ld\+json">(.*?)<\/script>/s));
 assert.equal((h.match(/<h1[ >]/g)||[]).length,1);
 assert(title.includes(term)&&title.length<80, 'concise title '+slug);
 assert(heading.includes(term));
 assert.equal(ld.headline,heading);
 assert.equal(ld.description,description);
 assert.equal(ld.dateModified,'2026-10-19');
 assert.equal(canonical,'https://grokarchivehub.com/'+slug);
 assert(h.includes('<meta name="robots" content="index,follow">'));
 assert(h.includes(primary),'primary source retained');
 assert(h.includes(cross),'companion source linked');
 assert(h.includes('The short answer, with sources'));
 assert(h.includes('utm_campaign%3Dgah_search_editorial_001'),'X share UTM');
 assert(h.includes('rel="noopener noreferrer"'));
 assert(worker.includes('["https://grokarchivehub.com/'+slug+'", "2026-10-19"]'));
 console.log('PASS',slug);
}
const fbi=fs.readFileSync(path.join(root,cases[0][0]+'.html'),'utf8');
assert(!fbi.includes('<strong>Phang, ECF 59</strong><br>October 16 DOJ Notice'),'misplaced ECF59 removed');
assert(fbi.includes('October 16 ECF 59 Notice of Compliance'),'ECF59 original citation retained');
const news=fs.readFileSync(path.join(root,'news.html'),'utf8');
for(const [slug] of cases)assert(news.includes('href="/'+slug+'"'),'news hub link '+slug);
console.log('PASS editorial source-growth tests');
