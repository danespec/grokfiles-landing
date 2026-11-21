import assert from 'node:assert/strict';
import fs from 'node:fs';
import {catalogSafeSearchHandler} from '../backend/wiki-fulltext-search-20261120/catalog-safe-search.mjs';
function makeResponse() {
 return {status:0,headers:{},body:'',writeHead(status,headers){this.status=status;this.headers=headers},end(body=''){this.body=String(body||'')}};
}
const hits={
 ok:true,
 hits:[
  {id:'EFTA00039884',title:'Protected Person — Do not display',summary:'Unreviewed private OCR details should never display',path:'/volume1/private/path'},
  {id:'EFTA00039884',body:'duplicate sensitive data'},
  {id:'EFTA00003212',summary:'some phone and private email'},
  {id:'EFTA99999999',summary:'bad unavailable record'},
  {id:'bogus',body:'invalid source'}
 ]
};
let searches=0,lastArgs=null;
async function run(url,method='GET',reply=hits,body='',contentType='application/x-www-form-urlencoded') {
 const res=makeResponse();
 const req={
  url,method,headers:{'content-type':contentType},
  async *[Symbol.asyncIterator](){if(body)yield Buffer.from(body)}
 };
 const handled=await catalogSafeSearchHandler(req,res,{
  postSearch:async args=>{searches++;lastArgs=args;if(reply instanceof Error)throw reply;return reply},
  catalogFlags:id=>id==='EFTA00039884'?7:id==='EFTA00003212'?25:0
 });
 return {res,handled};
}
const home=await run('/catalog/search');
assert(home.handled);assert.equal(home.res.status,200);assert.equal(home.res.headers['X-Robots-Tag'],'noindex,follow');
assert.match(home.res.body,/method="post"/);assert.equal(searches,0);
const s=await run('/catalog/search','POST',hits,'q=aviation');
assert.equal(s.res.status,200);assert.equal(searches,1);assert.equal(lastArgs.fast,true);
assert.equal(lastArgs.no_ai,true);assert.equal(lastArgs.limit,80);
assert.match(s.res.body,/EFTA00039884/);assert.match(s.res.body,/EFTA00003212/);
assert.match(s.res.body,/PDF · OCR/);assert.match(s.res.body,/video · audio/);
assert.doesNotMatch(s.res.body,/Protected Person|Unreviewed private|phone and private email|volume1/);
assert.doesNotMatch(s.res.body,/EFTA99999999|bogus/);
assert.equal((s.res.body.match(/href="\/catalog\/EFTA00039884"/g)||[]).length,1);
assert.equal(s.res.headers['Cache-Control'],'no-store');
assert.equal(s.res.headers['X-GAH-Ad-Eligible'],'false');
assert.match(s.res.headers['Content-Security-Policy'],/default-src 'none'/);
assert.equal(s.res.headers['Referrer-Policy'],'no-referrer');
assert.doesNotMatch(s.res.body,/\baviation\b/,'Actual user query not reflected into analytics-accessible HTML');
const legacy=await run('/catalog/search?q=aviation');
assert.equal(legacy.res.status,200);assert.match(legacy.res.body,/For privacy, submit keyword searches/);
assert.doesNotMatch(legacy.res.body,/\baviation\b/);assert.equal(searches,1);
const x=await run('/catalog/search','POST',hits,'q='+encodeURIComponent('<script>alert(1)</script>'));
assert.equal(x.res.status,200);assert.doesNotMatch(x.res.body,/<script>/);
const tooLong=await run('/catalog/search','POST',hits,'q='+'x'.repeat(121));assert.equal(tooLong.res.status,400);
const big=await run('/catalog/search','POST',hits,'q='+'x'.repeat(5000));assert.equal(big.res.status,413);
const short=await run('/catalog/search','POST',hits,'q=a');assert.equal(short.res.status,400);
const ctrl=await run('/catalog/search','POST',hits,'q=x%00y');assert.equal(ctrl.res.status,400);
const head=await run('/catalog/search','HEAD');assert.equal(head.res.status,200);assert.equal(head.res.body,'');
const unsupported=await run('/catalog/search','PUT');assert.equal(unsupported.res.status,405);
const badType=await run('/catalog/search','POST',hits,'{"q":"aviation"}','application/json');assert.equal(badType.res.status,415);
const errored=await run('/catalog/search','POST',new Error('internal secrets host.docker.internal'),'q=aviation');
assert.equal(errored.res.status,502);assert.doesNotMatch(errored.res.body,/internal secrets|host\.docker/);
assert.equal((await run('/other-route')).handled,false);
const policy=fs.readFileSync(new URL('../backend/identifier-release-20261027/identifier-host-policy.mjs',import.meta.url),'utf8');
const patch=fs.readFileSync(new URL('../backend/wiki-fulltext-search-20261120/patch-gateway.py',import.meta.url),'utf8');
assert.match(policy,/export function eftaCatalogFlags/);
assert(policy.includes('form action="/catalog/search" method="post"'));
assert.match(patch,/catalogSafeSearchHandler/);
const mediaProbe=JSON.parse(fs.readFileSync(new URL('../backend/wiki-fulltext-search-20261120/media-probe-summary-20261120.json',import.meta.url),'utf8'));
assert.equal(mediaProbe.media_files,301);assert.equal(mediaProbe.unique_efta_ids,151);
assert.equal(mediaProbe.known_audio_tracks,291);assert.equal(mediaProbe.duration_probed,301);
const worker=fs.readFileSync(new URL('../backend/wiki-fulltext-search-20261120/transcribe-private-offline.py',import.meta.url),'utf8');
assert(worker.includes('local_files_only=True'));assert(worker.includes("'publication_status':'not_approved"));
console.log('PASS POST-only no-query-leak OCR search, ID-only output, noindex, rate/auth proxy, malicious requests and private media safeguards');
