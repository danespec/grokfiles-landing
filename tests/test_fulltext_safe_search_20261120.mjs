import assert from 'node:assert/strict';
import fs from 'node:fs';
import {catalogSafeSearchHandler} from '../backend/wiki-fulltext-search-20261120/catalog-safe-search.mjs';

function makeResponse() {
  return {status:0,headers:{},body:'',writeHead(status,headers){this.status=status;this.headers=headers;},end(body=''){this.body=String(body||'');}};
}
let searches=0, lastArgs=null;
async function run(url,method='GET',reply={
  ok:true,
  hits:[
    {id:'EFTA00039884',title:'Protected Person — Do not display',summary:'Unreviewed private OCR details should never display',path:'/volume1/private/path'},
    {id:'EFTA00039884',body:'duplicate sensitive data'},
    {id:'EFTA00003212',summary:'some phone and private email'},
    {id:'EFTA99999999',summary:'bad unavailable record'},
    {id:'bogus',body:'bad source'}
  ]
}) {
  const res=makeResponse();
  const handler=await catalogSafeSearchHandler({url,method},res,{
    postSearch:async args=>{searches++;lastArgs=args;if(reply instanceof Error)throw reply;return reply;},
    catalogFlags:id=>id==='EFTA00039884'?7:id==='EFTA00003212'?25:0
  });
  return {res,handler};
}
const base=await run('/catalog/search');
assert(base.handler);assert.equal(base.res.status,200);assert.equal(base.res.headers['X-Robots-Tag'],'noindex,follow');
assert.match(base.res.body,/role="search"/);assert.equal(searches,0);
const s=await run('/catalog/search?q=aviation');
assert.equal(s.res.status,200);assert.equal(searches,1);
assert.equal(lastArgs.fast,true);assert.equal(lastArgs.no_ai,true);assert.equal(lastArgs.limit,80);
assert.match(s.res.body,/EFTA00039884/);assert.match(s.res.body,/EFTA00003212/);
assert.match(s.res.body,/PDF · OCR/);assert.match(s.res.body,/video · audio/);
assert.doesNotMatch(s.res.body,/Protected Person|Unreviewed private|phone and private email|volume1/);
assert.doesNotMatch(s.res.body,/EFTA99999999|bogus/);
assert.equal((s.res.body.match(/href="\/catalog\/EFTA00039884"/g)||[]).length,1);
assert.equal(s.res.headers['Cache-Control'],'no-store');
assert.equal(s.res.headers['X-GAH-Ad-Eligible'],'false');
assert.match(s.res.headers['Content-Security-Policy'],/default-src 'none'/);
const x=await run('/catalog/search?q=%3Cscript%3Ealert(1)%3C%2Fscript%3E');
assert.equal(x.res.status,200);
assert.doesNotMatch(x.res.body,/<script>/);
assert.match(x.res.body,/&lt;script&gt;/);
const tooLong=await run('/catalog/search?q='+encodeURIComponent('x'.repeat(121)));
assert.equal(tooLong.res.status,400);
const bad=await run('/catalog/search?q=a');
assert.equal(bad.res.status,400);
const head=await run('/catalog/search?q=aviation','HEAD');
assert.equal(head.res.status,200);assert.equal(head.res.body,'');
const noPost=await run('/catalog/search?q=aviation','POST');
assert.equal(noPost.res.status,405);
const errored=await run('/catalog/search?q=aviation','GET',new Error('internal secrets: host.docker.internal PRIVATE DATA'));
assert.equal(errored.res.status,502);
assert.doesNotMatch(errored.res.body,/internal secrets|host\.docker|PRIVATE DATA/);
assert.equal((await run('/other-route')).handler,false);
const policy=fs.readFileSync(new URL('../backend/identifier-release-20261027/identifier-host-policy.mjs',import.meta.url),'utf8');
const patch=fs.readFileSync(new URL('../backend/wiki-fulltext-search-20261120/patch-gateway.py',import.meta.url),'utf8');
assert.match(policy,/export function eftaCatalogFlags/);
assert(policy.includes('form action="/catalog/search"'));
assert.match(patch,/catalogSafeSearchHandler/);
assert.match(patch,/if \(identifierHostPolicy\(req, res\)\) return/);
const mediaProbe=JSON.parse(fs.readFileSync(new URL('../backend/wiki-fulltext-search-20261120/media-probe-summary-20261120.json',import.meta.url),'utf8'));
assert.equal(mediaProbe.media_files,301);
assert.equal(mediaProbe.unique_efta_ids,151);
assert.equal(mediaProbe.known_audio_tracks,291);
assert.equal(mediaProbe.duration_probed,301);
const worker=fs.readFileSync(new URL('../backend/wiki-fulltext-search-20261120/transcribe-private-offline.py',import.meta.url),'utf8');
assert(worker.includes('local_files_only=True'),'No cloud model access');
assert(worker.includes("publication_status':'not_approved"));
assert(worker.includes('Private transcript directory')||worker.includes('private transcript directory'));
console.log('PASS sanitized ID-only keyword search, rate limits delegated, noindex, no raw OCR, malformed query and upstream error safety');
