import { qualityHtml } from './reader-quality.mjs';
import fs from 'node:fs';
const ORIGIN='https://wiki.grokarchivehub.com';
const MAIN='https://grokarchivehub.com';
const manifest=JSON.parse(fs.readFileSync('/app/identifier-dossiers.json','utf8'));
const entries=new Map(manifest.entries.map(e=>[e.id,e]));
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function send(req,res,status,body,type='text/html; charset=utf-8',index='noindex,follow'){
 if(type.startsWith('text/html')){body=qualityHtml(body,ORIGIN+req.url,manifest.entries);body=body.replace(/<meta\b(?=[^>]*name=["']robots["'])[^>]*>/ig,'<meta name="robots" content="'+index+'">');}
 res.writeHead(status,{'Content-Type':type,'Cache-Control':'no-store','CDN-Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Robots-Tag':index,'X-GAH-Identifier-Host-Policy':'20261027'});
 res.end(req.method==='HEAD'?'':body);return true;
}
function redirect(req,res,to){res.writeHead(301,{Location:to,'Cache-Control':'no-store','X-GAH-Identifier-Host-Policy':'20261027'});res.end();return true;}
export function identifierHostPolicy(req,res){
 if(!['GET','HEAD'].includes(req.method))return false;
 if(String(req.headers.host||'').split(':')[0].toLowerCase()!=='wiki.grokarchivehub.com'||req.headers['x-gah-internal-wiki-proxy'])return false;
 const url=new URL(req.url,ORIGIN);const path=url.pathname.replace(/\/+$/,'')||'/';
 const id=path.match(/^\/archive\/efta(\d{1,8})(?:\.html)?$/i);
 if(id)return redirect(req,res,MAIN+'/archive/EFTA'+id[1].padStart(8,'0')+url.search);
 if(path==='/wiki'||path==='/grok-command-v4')return redirect(req,res,ORIGIN+'/');
 if(path==='/methodology')return redirect(req,res,MAIN+'/methodology');
 if(path==='/barak'||path==='/dispatches/barak-archive')return redirect(req,res,MAIN+'/barak');
 if(path==='/receipts')return redirect(req,res,ORIGIN+'/archive');
 if(path==='/robots.txt')return send(req,res,200,'User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /pdf-viewer\nDisallow: /pdf-viewer.html\nSitemap: '+ORIGIN+'/sitemap.xml\n','text/plain; charset=utf-8','index,follow');
 if(['/sitemap.xml','/sitemap-index.xml','/sitemap-global.xml','/sitemap-archive-1.xml'].includes(path)){
  const paths=['/','/archive','/research-index',...manifest.entries.filter(e=>e.indexable).map(e=>'/receipts/'+e.id)];
  const xml='<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+paths.map(p=>'<url><loc>'+ORIGIN+p+'</loc><lastmod>'+manifest.updated+'</lastmod></url>').join('\n')+'\n</urlset>\n';
  return send(req,res,200,xml,'application/xml; charset=utf-8','index,follow');
 }
 if(path==='/'||path==='/archive'){
  let html=fs.readFileSync('/app/wiki-home-identifiers.html','utf8');
  if(path==='/archive')html=html.replace(/<h1>[^<]+<\/h1>/,'<h1>Receipt-card archive</h1>').replace('<link rel="canonical" href="'+ORIGIN+'/">','<link rel="canonical" href="'+ORIGIN+'/archive">').replace('content="'+ORIGIN+'/"','content="'+ORIGIN+'/archive"').replace('<title>Receipt cards and research index','<title>Receipt-card archive').replace('content="Receipt cards and research index"','content="Receipt-card archive"');
  return send(req,res,200,html,'text/html; charset=utf-8','index,follow');
 }
 if(path==='/research/evidence/black-book-epstein')return send(req,res,200,fs.readFileSync('/app/black-book-source-guide.html','utf8'));
 if(path==='/research-index'){
  let html=fs.readFileSync('/app/research-index.html','utf8');
  html=html.replace(/<link\b(?=[^>]*rel=["']canonical["'])[^>]*>/ig,'<link rel="canonical" href="'+ORIGIN+'/research-index">').replace(/<meta\b(?=[^>]*name=["']robots["'])[^>]*>/ig,'<meta name="robots" content="index,follow">');
  html=html.replace(/<meta\b(?=[^>]*property=["']og:url["'])[^>]*>/ig,'<meta property="og:url" content="'+ORIGIN+'/research-index">');
  html=html.replace('</main>','<p><a href="'+MAIN+'/archive/ids">Read the published document dossiers</a> · <a href="/archive">Browse receipt cards</a></p></main>');
  return send(req,res,200,html,'text/html; charset=utf-8','index,follow');
 }
 const receipt=path.match(/^\/receipts\/efta(\d{1,8})$/i);
 if(receipt){
  const id='EFTA'+receipt[1].padStart(8,'0');
  if(path!=='/receipts/'+id)return redirect(req,res,ORIGIN+'/receipts/'+id+url.search);
  const e=entries.get(id);
  if(e)return send(req,res,200,fs.readFileSync('/app/identifier-receipts/'+id+'.html','utf8'),'text/html; charset=utf-8',e.indexable?'index,follow':'noindex,follow');
  return send(req,res,404,'<!doctype html><html lang="en"><head><meta charset="utf-8"><title>'+id+' unavailable | Grok Archive Hub</title><meta name="robots" content="noindex,follow"></head><body><main><h1>'+id+' — receipt unavailable</h1><p>No reviewed receipt card is published for this identifier.</p><form action="'+MAIN+'/search"><label>Search the archive <input name="q" value="'+id+'"></label><button>Search</button></form><p><a href="https://www.justice.gov/epstein/search">DOJ library search</a> · <a href="/archive">Published receipts</a></p></main></body></html>');
 }
 return false;
}
