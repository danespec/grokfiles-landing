import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createArchiveIntegrity} from './archive-integrity-v1.mjs';
const digest=createHash('sha256').update('%PDF-fixture').digest('hex');
const valid={version:1,pages:{EFTA00000002:{parent_id:'EFTA00000001',page:2,parent_pages:3,parent_pdf_path:'/doj/test/EFTA00000001.pdf',parent_pdf_sha256:digest,verified_bates:true,existing_public_parent:true}},documents:{EFTA00000003:{pdf_path:'/doj/test/EFTA00000003.pdf',sha256:digest,existing_public_dossier:true}}};
function make(data=valid,missing=()=>false) {return createArchiveIntegrity({isMissing:missing,fs:{readFileSync:p=>p.endsWith('.json')?JSON.stringify(data):Buffer.from('%PDF-fixture'),statSync:()=>({isFile:()=>true,size:12})}});}
function response(){return {headers:{},setHeader(k,v){this.headers[k.toLowerCase()]=v;},end(b){this.body=b;}};}
let a=make(),r=response();
assert.equal(a.handleHttp({method:'GET'},r,new URL('https://grokarchivehub.com/archive/EFTA00000002')),true);
assert.equal(r.statusCode,200);assert.match(r.body,/not a separate PDF/);assert.match(r.body,/parent PDF at page 2/);assert.match(r.body,/rel="canonical" href="https:\/\/grokarchivehub.com\/archive\/EFTA00000002"/);assert.equal(r.headers['x-robots-tag'],'noindex,follow');assert.equal(r.headers['x-gah-ad-eligible'],'false');
r=response();a.handleHttp({method:'GET'},r,new URL('https://grokarchivehub.com/api/pdfraw?id=EFTA00000002'));assert.equal(r.statusCode,307);assert.equal(r.headers.location,'/api/pdfraw?id=EFTA00000001#page=2');
r=response();a.source(r,'EFTA00000002');let j=JSON.parse(r.body);assert.equal(j.standalone_document,false);assert.equal(j.parent_id,'EFTA00000001');assert.equal(j.text,'');
r=response();a.source(r,'EFTA00000003');j=JSON.parse(r.body);assert.equal(j.pdf_found,true);assert.equal(j.ocr_available,false);assert.equal(j.chars,0);
assert.equal(a.pdfPath('EFTA00000002'),'');assert.equal(a.pdfPath('EFTA00000003'),'/doj/test/EFTA00000003.pdf');
assert.equal(make(valid,id=>id==='EFTA00000001').page('EFTA00000002'),null);
assert.equal(make(valid,id=>id==='EFTA00000002').page('EFTA00000002'),null);
for(const bad of [{page:4},{page:0},{page:1.1},{verified_bates:false},{existing_public_parent:false},{parent_pdf_path:'/doj/../private/EFTA00000001.pdf'},{parent_pdf_sha256:'0'.repeat(64)}]){const d=structuredClone(valid);Object.assign(d.pages.EFTA00000002,bad);assert.equal(make(d).page('EFTA00000002'),null);}
r=response();assert.equal(a.handleHttp({method:'GET'},r,new URL('https://grokarchivehub.com/unrelated?id=EFTA00000002')),false);assert.deepEqual(r.headers,{});
assert.equal(a.handleHttp({method:'POST'},response(),new URL('https://grokarchivehub.com/archive/EFTA00000002')),false);
assert.equal(a.source(response(),'EFTA99999999'),false);
console.log('PASS: truthful page mapping, PDF-only source, source hashes, bounds, missing guards, path containment, canonical/noindex/ad policies, unrelated routes.');
