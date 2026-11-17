import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import worker,{gahResearchIndexablePublication} from '../_worker.js';
const root=new URL('../',import.meta.url),base='https://grokarchivehub.com';
const env={ASSETS:{async fetch(req){const path=new URL(typeof req==='string'?req:req.url).pathname;for(const p of [path,path+'.html',path.replace(/\/$/,'')+'/index.html']){try{return new Response(await fs.readFile(new URL('.'+p,root)),{headers:{'Content-Type':p.endsWith('.json')?'application/json':'text/html'}})}catch{}}return new Response('missing',{status:404})}}};
const get=(p,method='GET')=>worker.fetch(new Request(base+p,{method}),env);
const urls=Array.from({length:12},(_,i)=>'/guides/epstein-files-data-set-'+(i+1));
const sm=await(await get('/sitemap.xml')).text(),llms=await(await get('/llms.txt')).text();
const hub=await(await get('/guides/doj-epstein-data-sets')).text(),directory=await(await get('/guides')).text();
const first=['00000001','00003159','00003380','00005705','00008409','00008529','00009016','00009676','00039025','01262782','02209722','02730265'];
for(const [i,p] of urls.entries()){
 const n=i+1,u=base+p,r=await get(p),h=await r.text();
 assert.equal(r.status,200,p);assert.equal(r.headers.get('X-Robots-Tag'),'index,follow',p);assert.equal(r.headers.get('X-GAH-Ad-Eligible'),'false',p);assert.equal((h.match(/<h1\b/g)||[]).length,1,p);
 assert(h.includes('rel="canonical" href="'+u+'"'),p);assert(h.includes('https://www.justice.gov/epstein/doj-disclosures/data-set-'+n+'-files'),p);assert(h.replace(/<[^>]+>/g,'').includes('EFTA'+first[i]+'.pdf'),p);
 assert(sm.includes('<loc>'+u+'</loc>'),p);assert(llms.includes(u),p);assert(hub.includes('href="'+u+'"'),p);assert(directory.includes('href="'+u+'"'),p);
 assert.equal((await get(p,'HEAD')).headers.get('X-Robots-Tag'),'index,follow',p);assert(!gahResearchIndexablePublication(u),'navigation only, no corpus admission');
 for(const a of [i-1,i+1].filter(k=>k>=0&&k<12))assert(h.includes('href="'+base+urls[a]+'"'),p+' adjacent link '+urls[a]);
 if([2,3,5,6,7].includes(n))assert(h.includes('index-navigation guide only'),p+' coverage boundary');
 if(n!==9)assert(!/href="https:\/\/www\.justice\.gov\/epstein\/files\//.test(h),p+' no unreviewed direct PDFs');
}
for(const [p,ids] of [[urls[7],['EFTA00013764','EFTA00016622','EFTA00035147']],[urls[9],['EFTA01703108','EFTA01972778']],[urls[11],['EFTA02730265','EFTA02730996','EFTA02731082']]]){
 const h=await(await get(p)).text();for(const id of ids)assert(h.includes('href="'+base+'/archive/'+id+'"'),p+' '+id);
}
const home=await(await get('/')).text();assert(home.includes(base+urls[7]));assert(home.includes(base+urls[8]));assert(home.includes(base+'/guides/doj-epstein-data-sets#individual-dataset-guides'));
console.log('PASS twelve dataset guides: canonical GET/HEAD, official indexes, first filenames, sitemap, hub, directory, adjacent navigation, ad and corpus separation, coverage boundaries');
