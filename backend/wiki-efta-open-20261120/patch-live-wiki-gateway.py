#!/usr/bin/env python3
"""Patch the existing GAH wiki gateway EFTA source indexing, keeping current analytics and privacy controls."""
from pathlib import Path
import argparse,json,re
parser=argparse.ArgumentParser()
parser.add_argument('--server',type=Path,required=True)
parser.add_argument('--host-policy',type=Path,required=True)
parser.add_argument('--output-dir',type=Path,required=True)
args=parser.parse_args()
args.output_dir.mkdir(parents=True,exist_ok=True)
catalog=Path(__file__).with_name('efta-index-eligible.json')
ids=json.loads(catalog.read_text())['ids']
assert len(ids)==12100 and all(re.fullmatch(r'EFTA\d{8}',id) for id in ids)
host=args.host_policy.read_text()
server=args.server.read_text()
def replace_once(s,old,new,desc):
 assert s.count(old)==1,(desc,s.count(old))
 return s.replace(old,new,1)
# Policy: whitelist is required on both the routing layer and the sitemap, preventing unreviewed source exposure.
host=replace_once(host,
"const entries=new Map(manifest.entries.map(e=>[e.id,e]));",
"""const entries=new Map(manifest.entries.map(e=>[e.id,e]));
// GAH-EFTA-OPEN-20261120: Public EFTA search discovery is explicit, not a raw OCR filesystem index.
const EFTA_SEARCH_CATALOG=JSON.parse(fs.readFileSync('/app/efta-index-eligible-20261120.json','utf8'));
const EFTA_INDEX_IDS=Object.freeze(EFTA_SEARCH_CATALOG.ids.filter(id=>/^EFTA\\d{8}$/.test(id)));
const EFTA_INDEX_SET=new Set(EFTA_INDEX_IDS);
const EFTA_SITEMAP_LIMIT=30000;
const EFTA_SITEMAP_COUNT=Math.ceil(EFTA_INDEX_IDS.length/EFTA_SITEMAP_LIMIT);""","evidence policy import")
host=replace_once(host,
"if(id)return redirect(req,res,MAIN+'/archive/EFTA'+id[1].padStart(8,'0')+url.search);",
"""if(id){
  const normalized='EFTA'+id[1].padStart(8,'0');
  // Existing main-site dossiers retain their selected editorial canonical.
  // Unscreened IDs retain the prior main-site source-locator redirect and never expose raw OCR here.
  if(entries.has(normalized)||!EFTA_INDEX_SET.has(normalized))return redirect(req,res,MAIN+'/archive/'+normalized+url.search);
  if(path!=='/archive/'+normalized)return redirect(req,res,ORIGIN+'/archive/'+normalized+url.search);
  return false; // Qualified canonical record is served by the existing source gateway, not a proxy.
 }""","EFTA host routing")
host=replace_once(host,
"if(path==='/robots.txt')return send(req,res,200,'User-agent: *\\nAllow: /\\nDisallow: /api/\\nDisallow: /pdf-viewer\\nDisallow: /pdf-viewer.html\\nSitemap: '+ORIGIN+'/sitemap.xml\\n','text/plain; charset=utf-8','index,follow');",
"""if(path==='/robots.txt')return send(req,res,200,'User-agent: *\\nAllow: /\\nDisallow: /api/\\nDisallow: /pdf-viewer\\nDisallow: /pdf-viewer.html\\nSitemap: '+ORIGIN+'/sitemap-index.xml\\n','text/plain; charset=utf-8','index,follow');
 if(path==='/sitemap-index.xml'){
  const locs=[ORIGIN+'/sitemap.xml',...Array.from({length:EFTA_SITEMAP_COUNT},(_,i)=>ORIGIN+'/sitemap-efta-'+(i+1)+'.xml')];
  const xml='<?xml version="1.0" encoding="UTF-8"?>\\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\\n'+locs.map(loc=>'<sitemap><loc>'+loc+'</loc></sitemap>').join('\\n')+'\\n</sitemapindex>\\n';
  return send(req,res,200,xml,'application/xml; charset=utf-8','index,follow');
 }
 if(path==='/sitemap-archive-1.xml')return redirect(req,res,ORIGIN+'/sitemap-efta-1.xml');
 const eftaSitemap=path.match(/^\\/sitemap-efta-(\\d+)\\.xml$/);
 if(eftaSitemap){
  const page=Number(eftaSitemap[1]);
  if(!Number.isInteger(page)||page<1||page>EFTA_SITEMAP_COUNT)return send(req,res,404,'Not Found','text/plain; charset=utf-8','noindex,follow');
  const records=EFTA_INDEX_IDS.slice((page-1)*EFTA_SITEMAP_LIMIT,page*EFTA_SITEMAP_LIMIT);
  const xml='<?xml version="1.0" encoding="UTF-8"?>\\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\\n'+records.map(id=>'<url><loc>'+ORIGIN+'/archive/'+id+'</loc><lastmod>'+EFTA_SEARCH_CATALOG.date+'</lastmod></url>').join('\\n')+'\\n</urlset>\\n';
  return send(req,res,200,xml,'application/xml; charset=utf-8','index,follow');
 }""","robots and new EFTA sitemaps")
host=replace_once(host,
"if(['/sitemap.xml','/sitemap-index.xml','/sitemap-global.xml','/sitemap-archive-1.xml'].includes(path)){",
"if(['/sitemap.xml','/sitemap-global.xml'].includes(path)){","duplicate legacy sitemap aliases")
# Add EFTA document discovery to the wiki research hub for visitor/robot internal links.
host=replace_once(host,
"  html=html.replace('</main>','<p><a href=\"'+MAIN+'/archive/ids\">Read the published document dossiers</a> · <a href=\"/archive\">Browse receipt cards</a></p>'+discovery+'</main>');",
"""  const eftaSearch='<section id="wiki-efta-open-catalog"><h2>Open EFTA source record collection ('+EFTA_INDEX_IDS.length.toLocaleString('en-US')+')</h2><p>Source-backed document records with meaningful OCR excerpts and screening for identity or contact-detail markers. The archive records show what files contain, not a finding of wrongdoing. Use exact file identifiers to inspect the record.</p><form action="'+MAIN+'/search"><label>EFTA document lookup <input name="q" placeholder="EFTA01234567" pattern="EFTA[0-9]{8}"></label><button type="submit">Find EFTA document</button></form><p><a href="'+ORIGIN+'/sitemap-efta-1.xml">Browse the public EFTA document list</a> · <a href="'+ORIGIN+'/sitemap-index.xml">All research sitemaps</a></p></section>';
  html=html.replace('</main>','<p><a href="'+MAIN+'/archive/ids">Read the published document dossiers</a> · <a href="/archive">Browse receipt cards</a></p>'+discovery+eftaSearch+'</main>');""","wiki research directory enhanced")
# Server: independent gate makes it impossible to change a page to indexable just by supplying an ID.
server=replace_once(server,
"function archivePageHtmlV1(id, profile) {",
"""// GAH-EFTA-OPEN-20261120 — preserve runtime source access, improve SEARCH discovery only for vetted candidates.
const EFTA_SEARCH_INDEX_MANIFEST=JSON.parse(fs.readFileSync('/app/efta-index-eligible-20261120.json','utf8'));
const EFTA_SEARCH_INDEX_IDS=new Set(EFTA_SEARCH_INDEX_MANIFEST.ids);
const EFTA_INDEX_PRIVACY_EMAIL=/[a-z0-9_.+-]+@[a-z0-9_.-]+\\.[a-z]{2,}/i;
const EFTA_INDEX_PRIVACY_PHONE=/\\b(?:\\+?1[.\\- ])?\\(?\\d{3}\\)?[.\\- ]\\d{3}[.\\- ]\\d{4}\\b/;
const EFTA_INDEX_PRIVACY_ID=/\\b(?:social security (?:number|#)|ssn|passport number|driver(?:'s)? licen[sc]e|routing number|account number|\\d{3}-\\d{2}-\\d{4})\\b/i;
const EFTA_INDEX_PRIVACY_SENSITIVE=/\\b(?:victim(?:s)?|survivor(?:s)?|underage|minor(?:s)?|juvenile|traffick(?:ing|ed)|sexual abuse|sex abuse|sexual assault|rape|Jane Doe|John Doe|complainant|witness identity|confidential informant|sealed identity|redacted names|protected identity|contact book|black book|address book)\\b/i;
const EFTA_INDEX_PRIVACY_ADDRESS=/\\b\\d{1,5}\\s+[A-Za-z0-9 .-]{3,35}\\s+(?:street|st\\.?|avenue|ave\\.?|road|rd\\.?|drive|dr\\.?|blvd\\.?|boulevard|lane|ln\\.?|court|ct\\.?|way|apartment|apt\\.?)\\b/i;
function archiveEftaIndexEligibleV1(profile){
  if(!profile?.resolvable||!EFTA_SEARCH_INDEX_IDS.has(profile.clean))return false;
  const x=String(profile.ocrExcerpt||'');
  if(x.length<800||(x.match(/[A-Za-z]/g)||[]).length<300)return false;
  if([EFTA_INDEX_PRIVACY_EMAIL,EFTA_INDEX_PRIVACY_PHONE,EFTA_INDEX_PRIVACY_ID,EFTA_INDEX_PRIVACY_SENSITIVE,EFTA_INDEX_PRIVACY_ADDRESS].some(re=>re.test(x)))return false;
  try{const bank=bankingRecordFor(profile.clean);if(bank?.indexing_policy&&bank.indexing_policy!=='indexable')return false;}catch(e){}
  return true;
}
function archivePageHtmlV1(id, profile) {""","archive publication eligibility")
server=replace_once(server,"  const robotsMeta = 'noindex,follow';",
"  const robotsMeta = archiveEftaIndexEligibleV1(profile) ? 'index,follow' : 'noindex,follow';","archive rendered robots")
needle="""        res.setHeader('X-GAH-Ad-Eligible', 'false');
        res.setHeader('X-Robots-Tag', 'noindex,follow');
        res.setHeader('X-GAH-Archive-Template', 'utility-20261023');
        res.setHeader('X-GAH-ASCEND-002', 'archive-source-record');
        res.setHeader('X-GAH-SEO-SOFT404', '002');"""
replacement="""        res.setHeader('X-GAH-Ad-Eligible', 'false');
        const eligibleEfta = archiveEftaIndexEligibleV1(profile);
        res.setHeader('X-Robots-Tag', eligibleEfta ? 'index,follow' : 'noindex,follow');
        res.setHeader('X-GAH-Archive-Template', eligibleEfta ? 'source-index-20261120' : 'utility-20261023');
        res.setHeader('X-GAH-ASCEND-002', 'archive-source-record');
        if(!eligibleEfta)res.setHeader('X-GAH-SEO-SOFT404', '002');"""
server=replace_once(server,needle,replacement,"archive response robots")
(args.output_dir/'identifier-host-policy.mjs').write_text(host)
(args.output_dir/'server.js').write_text(server)
print(json.dumps({'patched':True,'catalog_eligible':len(ids),'server_bytes':len(server),'host_policy_bytes':len(host),'preserves_live_analytics':('res.gahPublicAnalytics' in host),'privacy_gate':True},indent=2))
