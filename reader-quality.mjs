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
  return depth?token:token.replace(/\bEFTA\d{8}\b/g,id=>ids.has(id)?'<a class="identifier-link" href="https://grokarchivehub.com/archive/'+id+'">'+id+'</a>':id);
 });
}
const collections=new Set(['/','/archive','/archive/ids','/topics','/start','/research-index','/latest','/entities','/investigations','/dispatches','/reels','/videos']);
export function qualityHtml(input,href,entries=[]){
 let html=String(input);if(!/<head\b/i.test(html))return html;
 const u=new URL(href);const path=u.pathname.replace(/\/+$/,'')||'/';const canonical=u.origin+(path==='/'?'/':path);
 let title=normalizeReaderTitle((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)||[])[1]||'Grok Archive Hub');
 html=html.replace(/<title[^>]*>[\s\S]*?<\/title>/i,'<title>'+escapeHtml(title)+' | Grok Archive Hub</title>');
 html=meta(html,'og:title',title,'property');html=meta(html,'twitter:title',title);
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
 html=html.replace(/(<main\b[^>]*>)([\s\S]*?)(<\/main>)/i,(_,open,body,close)=>{
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
 // Add a page entity alongside the existing publisher entity; retain record-specific schemas.
 if(path==='/barak/entities'){const h=html.match(/<h1\b[^>]*>[\s\S]*?<\/h1>/i);if(h){html=html.replace(h[0],'');html=html.replace(/<h[2-6]\b/i,h[0]+'<h'+(html.match(/<h([2-6])\b/i)||[])[1]);}}
 const types=[...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)].flatMap(m=>{
  try{const d=JSON.parse(m[1]);return (Array.isArray(d)?d:d['@graph']||[d]).flatMap(n=>n['@type']||[]);}catch{return [];}
 });
 const wanted=collections.has(path)?'CollectionPage':'WebPage';
 if(!types.some(t=>['Article','NewsArticle','CollectionPage','WebPage','ProfilePage','VideoObject','CreativeWork'].includes(t))){
  const desc=decode((html.match(/<meta\b(?=[^>]*name=["']description["'])[^>]*content=["']([^"']*)/i)||[])[1]||'');
  const ld={'@context':'https://schema.org','@type':wanted,'@id':canonical+'#page',url:canonical,name:title,description:desc,isPartOf:{'@type':'WebSite',name:'Grok Archive Hub',url:u.origin+'/'}};
  html=html.replace(/<\/head>/i,'<script type="application/ld+json">'+JSON.stringify(ld).replace(/<\//g,'<\\/')+'</script>\n</head>');
 }
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
 if(response.status===404&&/^\/(?:archive|receipts)\/efta\d/i.test(u.pathname))return response;
 if(response.status===404){
  headers.set('X-Robots-Tag','noindex,follow');headers.set('Cache-Control','no-store');headers.set('Content-Type','text/html; charset=utf-8');
  for(const n of ['Content-Length','Content-Encoding','ETag'])headers.delete(n);
  return new Response(request.method==='HEAD'?null:readerNotFoundHtml(request.url),{status:404,headers});
 }
 if(response.status!==200||request.method==='HEAD')return response;
 let html=qualityHtml(await response.text(),request.url,entries);
 const robots=headers.get('X-Robots-Tag');if(robots)html=meta(html,'robots',robots);
 for(const n of ['Content-Length','Content-Encoding','ETag'])headers.delete(n);
 headers.set('X-GAH-Reader-Quality','20261027');
 return new Response(html,{status:response.status,headers});
}
