import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import worker from '../_worker.js';
import path from 'node:path';
const root=path.resolve(new URL('..',import.meta.url).pathname);
const mock=async r=>{const p=new URL(typeof r==='string'?r:r.url).pathname;const f=path.join(root,p==='/'?'index.html':p==='/latest'?'latest.html':p);try{return new Response(await readFile(f),{status:200,headers:{'Content-Type':'text/html'}})}catch{return new Response('missing',{status:404})}};
const env=(staging=false)=>({ASSETS:{fetch:mock},X_TOKEN_STORE:{get:async()=>null},...(staging?{GAH_STAGING:'true'}:{})});
let count=0; const check=(label,ok)=>{assert.ok(ok,label);console.log('PASS '+label);count++};
const routes=['/dispatches/epstein-source-watch-october-2026','/investigations/fbi-review-holdings-vault-parts-12-13'];
for(const p of routes){const r=await worker.fetch(new Request('https://grokarchivehub.com'+p),env());const s=await r.text();check(p+' HTTP 200',r.status===200);check(p+' has canonical',s.includes('rel="canonical" href="https://grokarchivehub.com'+p+'"'));check(p+' headline and Article data',s.includes('<h1>')&&s.includes('"@type":"Article"'));const staging=await worker.fetch(new Request('https://grokarchivehub.com'+p),env(true));check(p+' staging noindex',staging.headers.get('X-Robots-Tag')==='noindex, nofollow, noarchive')}
const watch=await readFile(path.join(root,'dispatches/epstein-source-watch-october-2026.html'),'utf8');
check('exactly eight numbered signals',([1,2,3,4,5,6,7,8].every(n=>watch.includes('Signal '+n)))&&!watch.includes('Signal 9'));
check('unverified deletion claim is qualified',watch.includes('No official item-level removal manifest')&&watch.includes('unverified'));
check('Wyden amount and document distinguished',watch.includes('not the value of the missing interview'));
check('French 13 classified as victims not suspects',watch.includes('not</em> an identified list of suspects'));
const fbi=await readFile(path.join(root,'investigations/fbi-review-holdings-vault-parts-12-13.html'),'utf8');
check('FBI files sourced directly',fbi.includes('part-12/view')&&fbi.includes('part-13/view'));
check('scope of visual verification explicit',fbi.includes('direct visual examination')&&fbi.includes('not establish intentional deletion'));
for(const p of ['/','/latest']){const r=await worker.fetch(new Request('https://grokarchivehub.com'+p),env());const s=await r.text();check(p+' both editorials linked',routes.every(q=>s.includes('href="'+q+'"')))}
const sitemap=await worker.fetch(new Request('https://grokarchivehub.com/sitemap.xml'),env());const xml=await sitemap.text();check('both routes in sitemap',routes.every(q=>xml.includes('https://grokarchivehub.com'+q)));const all=[...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map(x=>x[1]);check('sitemap count 120 and unique',all.length===120&&new Set(all).size===120);
console.log('RESULT '+count+'/'+count+' PASS');
