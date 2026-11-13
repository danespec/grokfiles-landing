import fsDefault from 'node:fs';
import {createHash} from 'node:crypto';

export function createArchiveIntegrity({fs=fsDefault, isMissing, registryPath='/app/archive-integrity-reviewed-v1.json'}) {
  let data={pages:{},documents:{}};
  try { const parsed=JSON.parse(fs.readFileSync(registryPath,'utf8')); if(parsed.version===1)data=parsed; } catch {}
  const validId=id=>/^EFTA\d{8}$/.test(String(id));
  const confirmed=new Map();
  function verifiedFile(path,id,digest) {
    if(!validId(id)||typeof path!=='string'||!path.startsWith('/doj/')||path.split('/').includes('..')||path.split('/').pop()!==id+'.pdf'||!/^[a-f0-9]{64}$/.test(digest||''))return '';
    const key=path+':'+digest;
    if(confirmed.has(key))return confirmed.get(key);
    let result='';
    try {if(fs.statSync(path).isFile()&&createHash('sha256').update(fs.readFileSync(path)).digest('hex')===digest)result=path;}catch{}
    confirmed.set(key,result);return result;
  }
  function pdfPath(id) {
    const row=data.documents?.[id];
    if(!row||isMissing(id)||row.existing_public_dossier!==true)return '';
    return verifiedFile(row.pdf_path,id,row.sha256);
  }
  function page(id) {
    const r=data.pages?.[id];
    if(!r||!validId(id)||!validId(r.parent_id)||id===r.parent_id||isMissing(id)||isMissing(r.parent_id)||
       r.verified_bates!==true||r.existing_public_parent!==true||!Number.isSafeInteger(r.page)||r.page<1||
       !Number.isSafeInteger(r.parent_pages)||r.page>r.parent_pages||
       !verifiedFile(r.parent_pdf_path,r.parent_id,r.parent_pdf_sha256))return null;
    return r;
  }
  function responseHeaders(res) {
    res.setHeader('Cache-Control','no-store');
    res.setHeader('X-Robots-Tag','noindex,follow');
    res.setHeader('X-GAH-Ad-Eligible','false');
    res.setHeader('X-GAH-Archive-Integrity','bates-parent-20261113');
  }
  function json(res,status,value) {responseHeaders(res);res.setHeader('Content-Type','application/json; charset=utf-8');res.statusCode=status;res.end(JSON.stringify(value));}
  function source(res,id) {
    const r=page(id);
    if(r) {json(res,200,{ok:true,id,source_type:'bates_page',standalone_document:false,parent_id:r.parent_id,page:r.page,parent_pages:r.parent_pages,pdf_found:true,pdf_url:'/api/pdfraw?id='+r.parent_id+'#page='+r.page,text:'',chars:0,ocr_available:false,canonical_url:'https://grokarchivehub.com/archive/'+id,parent_document_url:'https://grokarchivehub.com/archive/'+r.parent_id});return true;}
    const p=pdfPath(id);
    if(p) {json(res,200,{ok:true,id,source_type:'pdf',standalone_document:true,pdf_found:true,pdf_url:'/api/pdfraw?id='+id,text:'',chars:0,ocr_available:false,source_sha256:data.documents[id].sha256,size_bytes:fs.statSync(p).size});return true;}
    return false;
  }
  function handleHttp(req,res,url) {
    if(req.method!=='GET'&&req.method!=='HEAD')return false;
    const match=url.pathname.match(/^\/archive\/(EFTA\d{8})$/i);
    if(!match&&!['/api/source','/api/resolve','/api/metadata','/api/pdfraw','/api/pdf','/pdf-lite','/pdf-lite.html'].includes(url.pathname))return false;
    const id=String(match?.[1]||url.searchParams.get('id')||'').toUpperCase();
    const r=page(id);if(!r)return false;
    const canonical='https://grokarchivehub.com/archive/'+id;
    const parentUrl='https://grokarchivehub.com/archive/'+r.parent_id;
    const pdf='/api/pdfraw?id='+r.parent_id+'#page='+r.page;
    responseHeaders(res);
    res.setHeader('X-GAH-Bates-Parent',r.parent_id);res.setHeader('X-GAH-Bates-Page',String(r.page));res.setHeader('X-GAH-Bates-Pages',String(r.parent_pages));
    if(match) {
      const body='<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,follow"><meta name="grok-ad-eligible" content="false"><meta name="grok-ad-policy" content="ad-excluded-source-page-mapping"><link rel="canonical" href="'+canonical+'"><title>'+id+' — page '+r.page+' of '+r.parent_id+'</title></head><body><main><h1>'+id+'</h1><p>This Bates identifier is page '+r.page+' of the '+r.parent_pages+'-page document '+r.parent_id+'. It is not a separate PDF.</p><p><a href="'+pdf+'">Open the parent PDF at page '+r.page+'</a></p><p><a href="'+parentUrl+'">Parent document source record</a></p><p>The mapping was verified against the printed identifier in the existing PDF. Original redactions are preserved.</p></main></body></html>';
      res.statusCode=200;res.setHeader('Content-Type','text/html; charset=utf-8');res.setHeader('Link','<'+canonical+'>; rel="canonical"');res.end(req.method==='HEAD'?undefined:body);return true;
    }
    if(['/api/source','/api/resolve'].includes(url.pathname))return source(res,id);
    if(url.pathname==='/api/metadata') {json(res,200,{ok:true,id,artifact_count:0,signal_count:0,context_count:0,artifacts:[],signals:[],contexts:[],source_type:'bates_page',standalone_document:false,parent_id:r.parent_id,page:r.page,parent_pages:r.parent_pages,pdf_found:true,pdf_url:pdf,canonical_url:canonical,parent_document_url:parentUrl});return true;}
    if(['/api/pdfraw','/api/pdf','/pdf-lite','/pdf-lite.html'].includes(url.pathname)) {res.statusCode=307;res.setHeader('Location',pdf);res.end();return true;}
    return false;
  }
  return {pdfPath,page,source,handleHttp};
}
