import { RESEARCH_ROUTES } from './content/research-route-policy.mjs';
import { qualityHtml, publicationRule } from './reader-quality.mjs';
import fs from 'node:fs';
const ORIGIN='https://wiki.grokarchivehub.com';
const MAIN='https://grokarchivehub.com';
const manifest=JSON.parse(fs.readFileSync('/app/identifier-dossiers.json','utf8'));
const entries=new Map(manifest.entries.map(e=>[e.id,e]));
// GAH-EFTA-OPEN-20261120: Public EFTA search discovery is explicit, not a raw OCR filesystem index.
const EFTA_SEARCH_CATALOG=JSON.parse(fs.readFileSync('/app/efta-index-eligible-20261120.json','utf8'));
const EFTA_INDEX_IDS=Object.freeze(EFTA_SEARCH_CATALOG.ids.filter(id=>/^EFTA\d{8}$/.test(id)));
const EFTA_INDEX_SET=new Set(EFTA_INDEX_IDS);
const EFTA_SITEMAP_LIMIT=30000;
const EFTA_SITEMAP_COUNT=Math.ceil(EFTA_INDEX_IDS.length/EFTA_SITEMAP_LIMIT);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function send(req,res,status,body,type='text/html; charset=utf-8',index='noindex,follow'){
 if(status===200&&type.startsWith('text/html')&&res.gahPublicAnalytics)body=res.gahPublicAnalytics(body);
 if(type.startsWith('text/html')&&publicationRule(ORIGIN+req.url)?.noindex)index='noindex,follow';
 if(type.startsWith('text/html')){body=qualityHtml(body,ORIGIN+req.url,manifest.entries);body=body.replace(/<meta\b(?=[^>]*name=["']robots["'])[^>]*>/ig,'<meta name="robots" content="'+index+'">');}
 res.writeHead(status,{'Content-Type':type,'Cache-Control':'no-store','CDN-Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Robots-Tag':index,'X-GAH-Identifier-Host-Policy':'20261027'});
 res.end(req.method==='HEAD'?'':body);return true;
}
function redirect(req,res,to){res.writeHead(301,{Location:to,'Cache-Control':'no-store','X-GAH-Identifier-Host-Policy':'20261027'});res.end();return true;}
export function identifierHostPolicy(req,res){
 if(!['GET','HEAD'].includes(req.method))return false;
 if(String(req.headers.host||'').split(':')[0].toLowerCase()!=='wiki.grokarchivehub.com'||req.headers['x-gah-internal-wiki-proxy'])return false;
 const url=new URL(req.url,ORIGIN);const path=url.pathname.replace(/\/+$/,'')||'/';
 if((path==='/pdf-lite'||path==='/pdf-lite.html')&&!/^EFTA\d{8}$/.test(url.searchParams.get('id')||''))return send(req,res,404,'<!doctype html><html><head><title>Document not found | Grok Archive Hub</title><meta name="robots" content="noindex,follow"></head><body><main><h1>Document not found</h1><p>Supply a valid EFTA document identifier.</p></main></body></html>');
 const id=path.match(/^\/archive\/efta(\d{1,8})(?:\.html)?$/i);
 if(id){
  const normalized='EFTA'+id[1].padStart(8,'0');
  // Existing main-site dossiers retain their selected editorial canonical.
  // Unscreened IDs retain the prior main-site source-locator redirect and never expose raw OCR here.
  if(entries.has(normalized)||!EFTA_INDEX_SET.has(normalized))return redirect(req,res,MAIN+'/archive/'+normalized+url.search);
  if(path!=='/archive/'+normalized)return redirect(req,res,ORIGIN+'/archive/'+normalized+url.search);
  return false; // Qualified canonical record is served by the existing source gateway, not a proxy.
 }
 if(path==='/wiki'||path==='/grok-command-v4')return redirect(req,res,ORIGIN+'/');
 if(path==='/topics')return redirect(req,res,MAIN+'/topics');
 if(path==='/methodology')return redirect(req,res,MAIN+'/methodology');
 if(path==='/barak'||path==='/dispatches/barak-archive')return redirect(req,res,MAIN+'/barak');
 if(path==='/receipts')return redirect(req,res,ORIGIN+'/archive');
 const topicTools=["/topics/maxwell-prosecution", "/topics/epstein-victim-services-doj-coordination", "/topics/epstein-victim-notification-vns-sdny-outreach", "/topics/sdny-epstein-maxwell-court-filings"];
 if(topicTools.includes(path))return send(req,res,200,fs.readFileSync('/app/topic-pages/'+path.split('/').pop()+'.html','utf8'),'text/html; charset=utf-8','index,follow');
 const research=RESEARCH_ROUTES.find(r=>r.path===path);
 if(research){
  if(research.owner==='main')return redirect(req,res,MAIN+research.path+url.search);
  if(path!=='/research/evidence/black-book-epstein'){
   const html=fs.readFileSync('/app/'+research.file,'utf8');
   return send(req,res,200,html,'text/html; charset=utf-8',research.indexable?'index,follow':'noindex,follow');
  }
 }
 if(path==='/robots.txt')return send(req,res,200,'User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /pdf-viewer\nDisallow: /pdf-viewer.html\nSitemap: '+ORIGIN+'/sitemap-index.xml\n','text/plain; charset=utf-8','index,follow');
 if(path==='/sitemap-index.xml'){
  const locs=[ORIGIN+'/sitemap.xml',...Array.from({length:EFTA_SITEMAP_COUNT},(_,i)=>ORIGIN+'/sitemap-efta-'+(i+1)+'.xml')];
  const xml='<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+locs.map(loc=>'<sitemap><loc>'+loc+'</loc></sitemap>').join('\n')+'\n</sitemapindex>\n';
  return send(req,res,200,xml,'application/xml; charset=utf-8','index,follow');
 }
 if(path==='/sitemap-archive-1.xml')return redirect(req,res,ORIGIN+'/sitemap-efta-1.xml');
 const eftaSitemap=path.match(/^\/sitemap-efta-(\d+)\.xml$/);
 if(eftaSitemap){
  const page=Number(eftaSitemap[1]);
  if(!Number.isInteger(page)||page<1||page>EFTA_SITEMAP_COUNT)return send(req,res,404,'Not Found','text/plain; charset=utf-8','noindex,follow');
  const records=EFTA_INDEX_IDS.slice((page-1)*EFTA_SITEMAP_LIMIT,page*EFTA_SITEMAP_LIMIT);
  const xml='<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+records.map(id=>'<url><loc>'+ORIGIN+'/archive/'+id+'</loc><lastmod>'+EFTA_SEARCH_CATALOG.date+'</lastmod></url>').join('\n')+'\n</urlset>\n';
  return send(req,res,200,xml,'application/xml; charset=utf-8','index,follow');
 }
 if(['/sitemap.xml','/sitemap-global.xml'].includes(path)){
  const paths=['/','/archive','/research-index',...manifest.entries.filter(e=>e.indexable).map(e=>'/receipts/'+e.id),...RESEARCH_ROUTES.filter(r=>r.owner==='wiki'&&r.indexable).map(r=>r.path),...topicTools].filter(p=>{const rule=publicationRule(ORIGIN+p);return !rule?.noindex&&(!rule?.canonical||rule.canonical===ORIGIN+p);});
  const xml='<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+paths.map(p=>'<url><loc>'+ORIGIN+p+'</loc><lastmod>'+manifest.updated+'</lastmod></url>').join('\n')+'\n</urlset>\n';
  return send(req,res,200,xml,'application/xml; charset=utf-8','index,follow');
 }
 if(path==='/'||path==='/archive'){
  let html=fs.readFileSync('/app/wiki-home-identifiers.html','utf8');
  if(path==='/archive')html=html.replace(/<h1>[^<]+<\/h1>/,'<h1>Receipt-card archive</h1>').replace('<link rel="canonical" href="'+ORIGIN+'/">','<link rel="canonical" href="'+ORIGIN+'/archive">').replace('content="'+ORIGIN+'/"','content="'+ORIGIN+'/archive"').replace('<title>Receipt cards and research index','<title>Receipt-card archive').replace('content="Receipt cards and research index"','content="Receipt-card archive"');
  return send(req,res,200,html,'text/html; charset=utf-8','index,follow');
 }
 if(path==='/research/evidence/black-book-epstein')return send(req,res,200,fs.readFileSync('/app/black-book-source-guide.html','utf8'),'text/html; charset=utf-8','index,follow');
 if(path==='/research-index'){
  let html=fs.readFileSync('/app/research-index.html','utf8');
  html=html.replace(/<link\b(?=[^>]*rel=["']canonical["'])[^>]*>/ig,'<link rel="canonical" href="'+ORIGIN+'/research-index">').replace(/<meta\b(?=[^>]*name=["']robots["'])[^>]*>/ig,'<meta name="robots" content="index,follow">');
  html=html.replace(/<meta\b(?=[^>]*property=["']og:url["'])[^>]*>/ig,'<meta property="og:url" content="'+ORIGIN+'/research-index">');
    const discoveryRoutes=RESEARCH_ROUTES.filter(r=>r.owner==='wiki'&&r.indexable&&!publicationRule(ORIGIN+r.path)?.noindex).sort((a,b)=>a.title.localeCompare(b.title));
  const sourceCards=manifest.entries.filter(e=>e.indexable).filter(e=>{const u=ORIGIN+'/receipts/'+e.id;const r=publicationRule(u);return !r?.noindex&&(!r?.canonical||r.canonical===u);}).sort((a,b)=>a.id.localeCompare(b.id));
  const discovery='<section id="open-research-index"><h2>Public research topics and source guides ('+discoveryRoutes.length+')</h2><p>Each topic is a finding aid, not a claim that all linked documents have been adjudicated. Source files and redactions retain their limits.</p><ul>'+discoveryRoutes.map(r=>'<li><a href="'+ORIGIN+esc(r.path)+'">'+esc(r.title)+'</a></li>').join('')+'</ul><h2>Standalone verified receipt records ('+sourceCards.length+')</h2><p>These receipt cards have their own source-record page. Cards with an existing main-site investigation continue to point to that canonical article.</p><ul>'+sourceCards.map(e=>'<li><a href="'+ORIGIN+'/receipts/'+esc(e.id)+'">'+esc(e.id)+' — '+esc(e.title)+'</a></li>').join('')+'</ul></section>';
  const eftaSearch='<section id="wiki-efta-open-catalog"><h2>Open EFTA source record collection ('+EFTA_INDEX_IDS.length.toLocaleString('en-US')+')</h2><p>Source-backed document records with meaningful OCR excerpts and screening for identity or contact-detail markers. The archive records show what files contain, not a finding of wrongdoing. Use exact file identifiers to inspect the record.</p><form action="'+MAIN+'/search"><label>EFTA document lookup <input name="q" placeholder="EFTA01234567" pattern="EFTA[0-9]{8}"></label><button type="submit">Find EFTA document</button></form><p><a href="'+ORIGIN+'/sitemap-efta-1.xml">Browse the public EFTA document list</a> · <a href="'+ORIGIN+'/sitemap-index.xml">All research sitemaps</a></p></section>';
  html=html.replace('</main>','<p><a href="'+MAIN+'/archive/ids">Read the published document dossiers</a> · <a href="/archive">Browse receipt cards</a></p>'+discovery+eftaSearch+'</main>');
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
