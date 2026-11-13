import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const root=new URL('../../',import.meta.url);
const source=fs.readFileSync(new URL('_worker.js',root),'utf8');
const start=source.indexOf('async function rewriteArchiveOcrSourceLink(');
const end=source.indexOf('\nasync function ',start+1);
const ctx={Response,Headers,GAH_IDENTIFIER_SOURCES:new Map(),escapeHtml:x=>String(x).replaceAll('<','&lt;')};
vm.createContext(ctx);vm.runInContext(source.slice(start,end),ctx);
const call=async(headers={},status=200,method='GET')=>ctx.rewriteArchiveOcrSourceLink(new Response('PRIVATE_UNREVIEWED_TRANSCRIPT',{status,headers:{'Content-Type':'text/html',...headers}}),new Request('https://grokarchivehub.com/archive/EFTA00000002',{method}),'EFTA00000002');
const good={'X-GAH-Archive-Integrity':'bates-parent-20261113','X-GAH-Bates-Parent':'EFTA00000001','X-GAH-Bates-Page':'2','X-GAH-Bates-Pages':'3'};
let r=await call(good);let html=await r.text();assert.match(html,/page 2 of the 3-page document EFTA00000001/);assert.match(html,/api\/pdfraw\?id=EFTA00000001#page=2/);assert.match(html,/rel="canonical" href="https:\/\/grokarchivehub.com\/archive\/EFTA00000002"/);assert.doesNotMatch(html,/PRIVATE_UNREVIEWED_TRANSCRIPT/);assert.equal(r.headers.get('X-Robots-Tag'),'noindex,follow');
for(const bad of [{},{...good,'X-GAH-Bates-Parent':'<script>alert(1)</script>'},{...good,'X-GAH-Bates-Page':'4'},{...good,'X-GAH-Bates-Page':'0'},{...good,'X-GAH-Bates-Pages':'1000001'},{...good,'X-GAH-Archive-Integrity':'spoofed'}]){html=await (await call(bad)).text();assert.match(html,/Source text awaiting verification/);assert.doesNotMatch(html,/PRIVATE_UNREVIEWED_TRANSCRIPT|<script>alert/);}
assert.equal((await call({},404)).status,404);assert.equal(await (await call(good,200,'HEAD')).text(),'');
if(process.argv[2]){
 const gateway=fs.readFileSync(process.argv[2],'utf8');const s=gateway.indexOf('function archiveRelatedIds('),e=gateway.indexOf('\nfunction ',s+1);
 let checks=0;const c={ARCHIVE_RELATED_LIMIT:12,archiveIntegrityV1:{page:id=>id==='EFTA00000003'},archiveRecordIsResolvableFast:id=>{checks++;return id==='EFTA00000001';}};vm.createContext(c);vm.runInContext(gateway.slice(s,e),c);
 assert.equal(JSON.stringify(c.archiveRelatedIds('EFTA00000000 EFTA00000002 EFTA00000001 EFTA00000003 EFTA00000001','EFTA00000000')),JSON.stringify(['EFTA00000001','EFTA00000003']));
 checks=0;c.archiveRelatedIds(Array.from({length:200},(_,i)=>'EFTA'+String(i+100).padStart(8,'0')).join(' '),'EFTA00000000');assert.equal(checks,64);
}
console.log('PASS: Worker mapping metadata, transcript privacy shield, malformed mappings, noindex, canonical, HEAD/404 preservation and bounded available-source links.');

if(process.argv[3]) {const rows=JSON.parse(fs.readFileSync(process.argv[3],"utf8"));for(const row of rows){let r=await ctx.rewriteArchiveOcrSourceLink(new Response(row.body,{status:row.status,headers:row.headers}),new Request("https://grokarchivehub.com/archive/"+row.id),row.id);let text=await r.text();assert(text.includes("page "+row.page+" of"));assert(text.includes("/api/pdfraw?id="+row.parent_id+"#page="+row.page));assert(!text.includes("Source text awaiting verification"));}console.log("PASS: "+rows.length+" real staging responses through the production Worker locator function.");}
