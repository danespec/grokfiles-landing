import { READER_EDITORIAL_METADATA } from './content/reader-editorial-metadata.mjs';
import { UNAVAILABLE_SOURCE_PDFS } from './content/source-pdf-status.mjs';
import { READER_LINK_ALIASES } from './content/reader-link-aliases.mjs';
import { PAGE_CARDS } from './content/reader-page-cards.mjs';
export const escapeHtml=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const decode=s=>String(s).replace(/&#(x[0-9a-f]+|[0-9]+);/gi,(_,n)=>String.fromCodePoint(n[0].toLowerCase()==='x'?parseInt(n.slice(1),16):Number(n))).replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>');
export function normalizeReaderTitle(value){
 let s=decode(value).replace(/<[^>]*>/g,'').trim();
 for(let n=0;n<3;n++)s=s.replace(/\s*[|·]\s*(?:GrokArchiveHub|Grok Archive Hub|GAH)\s*$/i,'').replace(/^(?:GrokArchiveHub|Grok Archive Hub)(?:\s*[|·:—]\s*|\s+)(?=\S)/i,'').trim();
 return s||'Grok Archive Hub';
}
function meta(html,key,value,attribute='name'){
 const safe=key.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
 const pattern=new RegExp('<meta\\b(?=[^>]*'+attribute+'=["\\\']'+safe+'["\\\'])[^>]*>','gi');
 return html.replace(pattern,'').replace(/<\/head>/i,'<meta '+attribute+'="'+key+'" content="'+escapeHtml(value)+'">\n</head>');
}
function linkIdentifiers(fragment,entries,omitId=""){
 const ids=new Set(entries.filter(e=>e.indexable&&e.id!==omitId).map(e=>e.id));let depth=0;
 return fragment.replace(/<!--[\s\S]*?-->|<(?:script|style|textarea)\b[^>]*>[\s\S]*?<\/(?:script|style|textarea)>|<[^>]+>|[^<]+/gi,token=>{
  if(token.startsWith('<')){
   if(/^<(script|style|textarea)\b/i.test(token)||token.startsWith('<!--'))return token;
   if(/^<(a|pre|button|h1)\b/i.test(token)&&!token.endsWith('/>'))depth++;
   if(/^<\/(a|pre|button|h1)\b/i.test(token))depth=Math.max(0,depth-1);
   return token;
  }
  token=token.replace(/GAH-SEARCH-GUIDE/g,'Archive search guide').replace(/GAH-HO-079/g,'Financial records').replace(/GAH-COMMUNITY-001 · /g,'');
  return depth?token:token.replace(/\bEFTA\d{8}\b/g,id=>ids.has(id)?'<a class="identifier-link" href="https://grokarchivehub.com/archive/'+id+'">'+id+'</a>':id);
 });
}
const collections=new Set(['/','/archive','/archive/ids','/topics','/start','/research-index','/latest','/entities','/investigations','/dispatches','/reels','/videos']);
export function conciseText(value,limit){
 const text=decode(value).replace(/\s+/g,' ').trim();if(Array.from(text).length<=limit)return text;
 let short=Array.from(text).slice(0,limit-1).join('');short=short.replace(/\s+\S*$/,'').replace(/[\s,;:—–|.-]+$/,'');return short+'…';
}
export function qualityHtml(input,href,entries=[]){
 let html=String(input);if(!/<head\b/i.test(html))return html;
 html=html.replace(/evidence cockpit(?: V4)?/gi,'Evidence overview').replace(/staged supermatrix/gi,'reviewed flight-log index');
 const u=new URL(href);const path=u.pathname.replace(/\/+$/,'')||'/';const canonical=u.origin+(path==='/'?'/':path);
 let title=normalizeReaderTitle((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)||[])[1]||'Grok Archive Hub');
 const editorial=READER_EDITORIAL_METADATA[canonical];
 if(editorial)title=editorial.title;
 html=html.replace(/<title[^>]*>[\s\S]*?<\/title>/i,'<title>'+escapeHtml(title)+' | Grok Archive Hub</title>');
 html=meta(html,'og:title',title,'property');html=meta(html,'twitter:title',title);
 const description=path==='/investigations/new-mexico-doj-epstein-records'?'Follow New Mexico’s requests for Epstein records, DOJ’s stated legal limits, the court-order trail, and the documents that remain unavailable.':decode((html.match(/<meta\b(?=[^>]*name=["']description["'])[^>]*content=["']([^"']*)/i)||[])[1]||'');
 if(description){const text=editorial?.description||description;html=meta(html,'description',text);html=meta(html,'og:description',text,'property');html=meta(html,'twitter:description',text);}
 const card=PAGE_CARDS[canonical];
 const oldImage=decode((html.match(/<meta\b(?=[^>]*property=["']og:image["'])[^>]*content=["']([^"']*)/i)||[])[1]||'');
 if(card&&(!oldImage||/hero-hold-the-letter\.jpg|media-grokarchivehub\.png|card-pinboard\.jpg|hero-desk\.jpg/.test(oldImage))){
  html=meta(html,'og:image',card.image,'property');html=meta(html,'twitter:image',card.image);html=meta(html,'twitter:card','summary_large_image');
 }
 html=html.replace(/href=(["'])(?:https:\/\/grokarchivehub\.com)?\/(?:wiki|grok-command-v4)\1/gi,'href="https://wiki.grokarchivehub.com/"');
 html=html.replace(/href=(["'])\/research-index\1/gi,'href="https://wiki.grokarchivehub.com/research-index"');
 html=html.replace(/on this indexable page/gi,'in this source note').replace(/ASCEND evidence context/gi,'Document context').replace(/Claim-source gate/gi,'Source references reviewed').replace(/42\/42 sourced/g,'');
 html=html.replace(/A topic remains indexable here only when/gi,'This guide includes a topic only when');
 html=html.replace(/The default path for unreviewed topic material is[\s\S]*?finished landing page\./i,'Material that still needs review remains available through the research tools, with its status and limits stated.');
 html=html.replace(/<p\b[^>]*>\s*(?:<strong>)?Ad policy:(?:<\/strong>)?\s*Sensitive route; ad-excluded by worker policy\.?\s*<\/p>/gi,'');
 if(path==='/topics')html=html.replace(/strongest indexable subject lanes/g,'main subject guides').replace(/What Stays Off This Indexable Page/g,'Research material still under review').replace(/<p\b[^>]*>(?:(?!<\/p>)[\s\S])*not included in the sitemap(?:(?!<\/p>)[\s\S])*?<\/p>/g,'<p>Research directories and source collections remain available while their records receive source-specific editorial review.</p>');
 html=html.replace(/(<main\b[^>]*>)([\s\S]*?)(<\/main>)/i,(_,open,body,close)=>{
  if(path==='/barak')body="<h1>The Barak File</h1><p>Read the documented record, compare source notes and follow the limits before drawing conclusions.</p><section id=\"published-research\"><h2>Published guides and reviewed records</h2><ul><li><a href=\"https://wiki.grokarchivehub.com/research/ehud-barak-epstein-documentary-record\">Barak documentary record</a></li><li><a href=\"https://grokarchivehub.com/dispatches/how-to-read-the-barak-records\">How to read the Barak records</a></li><li><a href=\"https://grokarchivehub.com/barak/source-map\">Source map</a></li><li><a href=\"https://grokarchivehub.com/barak/receipts\">Reviewed receipts</a></li><li><a href=\"https://grokarchivehub.com/barak/entities\">People and documentary roles</a></li><li><a href=\"https://grokarchivehub.com/barak/timeline\">Timeline</a></li><li><a href=\"https://grokarchivehub.com/barak/fara-review\">FARA review and limits</a></li></ul></section><section id=\"research-tools\"><h2>Research tools</h2><p>Source browsers and finding aids; entries may still need review.</p><ul><li><a href=\"https://grokarchivehub.com/barak/search\">Search the Barak archive</a></li><li><a href=\"https://grokarchivehub.com/barak/emails\">Browse emails</a></li><li><a href=\"https://grokarchivehub.com/barak/pdfs\">Browse PDFs</a></li><li><a href=\"https://grokarchivehub.com/barak/media\">Browse media</a></li></ul></section>";
  if(/^\/barak\/(?:documents|emails|legal|media|pdfs)(?:\/|$)/.test(path))body='<section id="published-reading"><h2>Read the published Barak record</h2><ul><li><a href="https://wiki.grokarchivehub.com/research/ehud-barak-epstein-documentary-record">Barak documentary record</a></li><li><a href="https://grokarchivehub.com/dispatches/how-to-read-the-barak-records">How to read the Barak records</a></li><li><a href="https://grokarchivehub.com/barak/source-map">Source map</a></li></ul></section>'+body;
  if(path==='/barak/entities'&&!/<h1\b/i.test(body))body='<h1>Barak entities and documentary roles</h1>'+body;
  body=linkIdentifiers(body,entries,path.startsWith("/archive/")?path.slice(9):"");
  if(u.hostname==='grokarchivehub.com'){
   const published=new Set(entries.filter(e=>e.indexable).map(e=>e.id));
   const visible=body.replace(/<(?:script|style)\b[^>]*>[\s\S]*?<\/(?:script|style)>/gi,'').replace(/<[^>]+>/g,' ');
   const mentioned=new Set((visible.match(/\bEFTA\d{8}\b/g)||[]).filter(id=>published.has(id)&&path!=='/archive/'+id));
   const linked=new Set([...body.matchAll(/href=["'](?:https:\/\/grokarchivehub\.com)?\/archive\/(EFTA\d{8})(?=["'?#])/gi)].map(m=>m[1]));
   const missing=[...mentioned].filter(id=>!linked.has(id)).sort();
   if(missing.length){
    const links='<ul>'+missing.map(id=>'<li><a href="https://grokarchivehub.com/archive/'+id+'">'+id+' dossier</a></li>').join('')+'</ul>';
    if(/id=["']related-published-records["']/.test(body))body=body.replace(/(<section\b[^>]*id=["']related-published-records["'][^>]*>)([\s\S]*?)(<\/section>)/i,(_,a,b,c)=>a+b+'<p>Other dossiers referenced on this page:</p>'+links+c);
    else body+='<section class="reader-identifier-links"><h2>Document dossiers referenced here</h2>'+links+'</section>';
   }
  }

  if(u.hostname==='grokarchivehub.com'&&!/<a\b[^>]*href=["']https:\/\/wiki\.grokarchivehub\.com\/["']/i.test(body))body+='<p class="archive-navigation"><a href="https://wiki.grokarchivehub.com/">Wiki receipt cards</a> · <a href="/archive/ids">Identifier dossiers</a></p>';
  return open+body+close;
 });
 html=html.replace(/<a\b([^>]*?)href=(["'])([^"']*)\2([^>]*)>([\s\S]*?)<\/a>/gi,(all,before,q,raw,after,label)=>{
  if(/^mailto:/i.test(raw))return '<a href="https://grokarchivehub.com/contact">Contact</a>';
  let target;try{target=new URL(decode(raw),href);}catch{return all;}
  if(target.hostname==='www.grokarchivehub.com')target.hostname='grokarchivehub.com';
  if(!['grokarchivehub.com','wiki.grokarchivehub.com'].includes(target.hostname))return all;
  target.protocol='https:';
  if(UNAVAILABLE_SOURCE_PDFS.includes(target.pathname))return '<span class="source-unavailable">'+label+' — PDF unavailable</span>';
  if(target.pathname.startsWith('/cdn-cgi/l/email-protection'))return '<a href="https://grokarchivehub.com/contact">Contact</a>';
  if(target.pathname==='/api/pdf'&&!target.searchParams.get('id'))return '<a href="https://grokarchivehub.com/search">Find a document PDF</a>';
  const mapped=READER_LINK_ALIASES[target.origin+target.pathname];if(mapped){const next=new URL(mapped);next.search=target.search;next.hash=target.hash;target=next;}
  if(target.pathname.startsWith('/evidence-data/')&&target.pathname.includes('/source/html/')&&target.pathname.endsWith('.html'))target.pathname=target.pathname.slice(0,-5);
  if(target.pathname==='/api/pdf'&&target.searchParams.get('id'))target.pathname='/pdf-lite';
  if((target.pathname.startsWith('/evidence-data/book-of-black/')||target.pathname.startsWith('/book-of-black/source/'))&&target.pathname.endsWith('.pdf'))return '<a'+before+after+' href="https://grokarchivehub.com/book-of-black">'+label+'</a>';
  let attrs=before+after;
  if(target.pathname==='/auth/patreon/start'){
   const old=attrs.match(/rel=["']([^"']*)["']/i);const values=new Set((old?old[1]:'').split(/\s+/).filter(Boolean));values.add('nofollow');attrs=attrs.replace(/\s*rel=["'][^"']*["']/i,'')+' rel="'+[...values].join(' ')+'"';
  }
  return '<a'+attrs+' href="'+escapeHtml(target.href)+'">'+label+'</a>';
 });
 if(['/investigations/mcc-final-48-hours-source-chain','/dispatches/epstein-mcc-timeline','/research/evidence/mcc-epstein-control-spine'].includes(path)){
  html=html.replace(/<link\b(?=[^>]*rel=["']canonical["'])[^>]*>/ig,'').replace(/<\/head>/i,'<link rel="canonical" href="https://grokarchivehub.com/research/epstein-final-48-hours-mcc"></head>');html=meta(html,'robots','noindex,follow');
 }
 // Add a page entity alongside the existing publisher entity; retain record-specific schemas.
 if(path==='/barak/entities'){const h=html.match(/<h1\b[^>]*>[\s\S]*?<\/h1>/i);if(h){html=html.replace(h[0],'');html=html.replace(/<h[2-6]\b/i,h[0]+'<h2>People and organizations in the records</h2><h'+(html.match(/<h([2-6])\b/i)||[])[1]);}}
 const types=[...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)].flatMap(m=>{
  try{const d=JSON.parse(m[1]);return (Array.isArray(d)?d:d['@graph']||[d]).flatMap(n=>n['@type']||[]);}catch{return [];}
 });
 const wanted=collections.has(path)?'CollectionPage':'WebPage';
 if(!types.some(t=>['Article','NewsArticle','CollectionPage','WebPage','ProfilePage','VideoObject','CreativeWork'].includes(t))){
  const desc=decode((html.match(/<meta\b(?=[^>]*name=["']description["'])[^>]*content=["']([^"']*)/i)||[])[1]||'');
  const ld={'@context':'https://schema.org','@type':wanted,'@id':canonical+'#page',url:canonical,name:title,description:desc,isPartOf:{'@type':'WebSite',name:'Grok Archive Hub',url:u.origin+'/'}};
  html=html.replace(/<\/head>/i,'<script type="application/ld+json">'+JSON.stringify(ld).replace(/<\//g,'<\\/')+'</script>\n</head>');
 }
 // Preserve literal source addresses without Cloudflare generating broken utility anchors.
 html=html.replace(/<!--[\s\S]*?-->|<(?:script|style)\b[^>]*>[\s\S]*?<\/(?:script|style)>|<[^>]+>|[^<]+/gi,token=>token.startsWith('<')?token:token.replace(/[A-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[A-Z0-9-]+(?:\.[A-Z0-9-]+)+/gi,address=>'<!--email_off-->'+address+'<!--/email_off-->'));
 return html;
}
export function readerNotFoundHtml(href){
 const u=new URL(href,'https://grokarchivehub.com');
 return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Page not found | Grok Archive Hub</title><meta name="robots" content="noindex,follow"><style>body{background:#141914;color:#eee8dc;font:18px/1.7 system-ui;margin:0}main{max-width:800px;margin:8vh auto;padding:28px}a{color:#efc68b}input,button{font:inherit;padding:9px;max-width:100%;box-sizing:border-box}</style></head><body><main><a href="https://grokarchivehub.com/">Grok Archive Hub</a><h1>Page not found</h1><p>The requested page is unavailable. Search the archive or browse the published dossiers.</p><form action="https://grokarchivehub.com/search"><label>Search records <input name="q" placeholder="Name, phrase or EFTA identifier"></label><button>Search</button></form><p><a href="https://grokarchivehub.com/archive">Archive</a> · <a href="https://wiki.grokarchivehub.com/">Wiki receipt cards</a> · <a href="https://www.justice.gov/epstein/search">DOJ library</a></p></main></body></html>';
}
export async function readerQualityResponse(response,request,entries=[]){
 const u=new URL(request.url);if(!['GET','HEAD'].includes(request.method)||u.pathname.startsWith('/api/')||/\/assets\//.test(u.pathname))return response;
 const type=response.headers.get('Content-Type')||'';if(!/text\/html/i.test(type))return response;
 const headers=new Headers(response.headers);
 if(['/investigations/mcc-final-48-hours-source-chain','/dispatches/epstein-mcc-timeline','/research/evidence/mcc-epstein-control-spine'].includes(u.pathname))headers.set('X-Robots-Tag','noindex,follow');
 if(response.status===404&&/^\/(?:archive|receipts)\/efta\d/i.test(u.pathname))return response;
 if(response.status===404){
  headers.set('X-Robots-Tag','noindex,follow');headers.set('Cache-Control','no-store');headers.set('Content-Type','text/html; charset=utf-8');
  for(const n of ['Content-Length','Content-Encoding','ETag'])headers.delete(n);
  return new Response(request.method==='HEAD'?null:readerNotFoundHtml(request.url),{status:404,headers});
 }
 if(response.status!==200)return response;
 if(request.method==='HEAD')return new Response(null,{status:response.status,headers});
 let html=qualityHtml(await response.text(),request.url,entries);
 const robots=headers.get('X-Robots-Tag');if(robots)html=meta(html,'robots',robots);
 for(const n of ['Content-Length','Content-Encoding','ETag'])headers.delete(n);
 headers.set('X-GAH-Reader-Quality','20261027');
 return new Response(html,{status:response.status,headers});
}
