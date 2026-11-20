#!/usr/bin/env python3
"""Add compact full-volume EFTA exact-identifier lookup and media-aware discovery to the wiki host."""
from pathlib import Path
import argparse,json
parser=argparse.ArgumentParser()
parser.add_argument('--input',type=Path,required=True)
parser.add_argument('--output',type=Path,required=True)
args=parser.parse_args()
s=args.input.read_text()
def replace1(a,b,tag):
 global s
 assert s.count(a)==1,tag+' expected once, found '+str(s.count(a))
 s=s.replace(a,b,1)
src=Path(__file__).with_name('efta-unified-public-summary-v1.json')
summary=json.loads(src.read_text())
assert summary['records']==870835
anchor="const entries=new Map(manifest.entries.map(e=>[e.id,e]));"
inject="""// GAH-UNIFIED-EFTA-20261120 — File-format metadata is strictly separate from publication approval.
const { createHash } = requireDynamicNone();
"""
# ESM imports can use node:crypto (no CommonJS require).
replace1("import fs from 'node:fs';","import fs from 'node:fs';\nimport crypto from 'node:crypto';",'crypto import')
binary_code="""
const EFTA_UNIFIED_CATALOG_SUMMARY=JSON.parse(fs.readFileSync('/app/efta-unified-summary-v1.json','utf8'));
const EFTA_UNIFIED_CATALOG_BUF=fs.readFileSync('/app/efta-unified-ids-v1.bin');
if(EFTA_UNIFIED_CATALOG_BUF.length!==EFTA_UNIFIED_CATALOG_SUMMARY.records*5 || crypto.createHash('sha256').update(EFTA_UNIFIED_CATALOG_BUF).digest('hex')!==EFTA_UNIFIED_CATALOG_SUMMARY.bin_sha256)throw Error('GAH EFTA catalog integrity gate failed');
const EFTA_UNIFIED_FLAG={original:1,ocr:2,pdf:4,video:8,audio:16,image:32};
function eftaCatalogFlags(id){
 const m=String(id||'').match(/^EFTA(\\d{8})$/);
 if(!m)return 0;
 const n=Number(m[1]);let low=0,hi=EFTA_UNIFIED_CATALOG_SUMMARY.records-1;
 while(low<=hi){
  const mid=(low+hi)>>>1,offset=mid*5,value=EFTA_UNIFIED_CATALOG_BUF.readUInt32BE(offset);
  if(value===n)return EFTA_UNIFIED_CATALOG_BUF.readUInt8(offset+4);
  if(value<n)low=mid+1;else hi=mid-1;
 }
 return 0;
}
const eftaCatalogNum=n=>Number(n).toLocaleString('en-US');
function eftaCatalogPage(path,h1,dek,inside,robots='index,follow'){
 const canonical=ORIGIN+path;
 return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+esc(h1)+' | Grok Archive Hub</title><meta name="description" content="'+esc(dek)+'"><meta name="robots" content="'+robots+'"><link rel="canonical" href="'+esc(canonical)+'"><meta name="grok-ad-policy" content="ad-excluded-public-research-navigation"></head><body><main style="max-width:820px;margin:30px auto;padding:20px;font:16px/1.55 system-ui,Arial,sans-serif"><p><a href="/">Wiki home</a> · <a href="/research-index">Research index</a> · <a href="/catalog/media">Media inventory</a></p><h1>'+esc(h1)+'</h1><p>'+esc(dek)+'</p>'+inside+'<p>Source identifiers describe records, not evidence of wrongdoing. Preserve published redactions and verify interpretations against primary materials. Report corrections through <a href="https://grokarchivehub.com/corrections">GAH corrections</a>.</p></main></body></html>';
}
function eftaLookupForm(){
 return '<form action="/catalog/lookup" method="get"><label for="efta-lookup">Exact EFTA identifier</label> <input id="efta-lookup" name="id" autocomplete="off" placeholder="EFTA00039884" pattern="EFTA[0-9]{8}" maxlength="12" required> <button type="submit">Inspect source formats</button></form>';
}
function eftaCatalogOverviewPage(){
 const c=EFTA_UNIFIED_CATALOG_SUMMARY;
 const body='<h2>Unified source holdings</h2><p>Across original file collections and OCR derivatives, '+eftaCatalogNum(c.records)+' distinct EFTA identifiers have been reconciled. These are identifiers, not the count of Google-indexed webpages.</p><table><caption>Source-file availability by identifier; categories overlap</caption><tbody><tr><th scope="row">Original source identifiers</th><td>'+eftaCatalogNum(c.source_ids)+'</td></tr><tr><th scope="row">PDF source</th><td>'+eftaCatalogNum(c.pdf_ids)+'</td></tr><tr><th scope="row">OCR text</th><td>'+eftaCatalogNum(c.ocr_ids)+'</td></tr><tr><th scope="row">Identified video files</th><td>'+eftaCatalogNum(c.video_ids)+'</td></tr><tr><th scope="row">Identified audio files</th><td>'+eftaCatalogNum(c.audio_ids)+'</td></tr></tbody></table><h2>Look up a source</h2>'+eftaLookupForm()+'<h2>Publication and search indexing</h2><p>Search engines are invited to the published source-record sitemap, which is separate from the full source inventory. Raw OCR, metadata-only records, and media files that need source or identity review do not acquire an indexable article simply because they are present. The exact-ID lookup discloses only source types and document availability.</p><p><a href="/sitemap-index.xml">Research and EFTA sitemaps</a> · <a href="/catalog/media">Media-aware source inventory</a> · <a href="/research-index">Find research guides</a></p>';
 return eftaCatalogPage('/catalog','EFTA document inventory and source lookup','Search the complete on-disk EFTA identifier inventory, including PDF, OCR, video and audio classifications, without publishing protected raw content.',body);
}
function eftaCatalogMediaPage(){
 const c=EFTA_UNIFIED_CATALOG_SUMMARY;
 const body='<h2>Evidence formats</h2><p>The file inventory confirms '+eftaCatalogNum(c.video_ids)+' EFTA identifiers with video assets and '+eftaCatalogNum(c.audio_ids)+' with audio. These are distinct identifiers, not verified unique recordings. Individual media files can be duplicated between data-set collections.</p><p>Photographs and scans are frequently embedded in PDFs rather than represented by standalone image extensions. The embedded-image and audiovisual transcript counts have <strong>not</strong> been established. No photograph, video or audio has been automatically published or embedded by this catalog.</p><h2>Search by exact record</h2>'+eftaLookupForm()+'<h2>Research workflow</h2><p>Use the identifier to determine whether a source record exists and which media formats are present. Verify the original file, redactions, provenance and any applicable access restriction before publication. A record appearing in a data set does not establish its authenticity, context or a particular allegation.</p><p><a href="/catalog">All source types</a></p>';
 return eftaCatalogPage('/catalog/media','Media-aware EFTA source catalog','Find EFTA source formats, including video, audio, OCR and PDF availability; media exposure remains subject to the existing source restrictions.',body);
}
function eftaCatalogExactIdPage(id,flags){
 const fields=[['Original collection',(flags&EFTA_UNIFIED_FLAG.original)?'record found':'not confirmed'],['PDF source',(flags&EFTA_UNIFIED_FLAG.pdf)?'recorded':'not recorded'],['OCR text',(flags&EFTA_UNIFIED_FLAG.ocr)?'present':'not recorded'],['Video',(flags&EFTA_UNIFIED_FLAG.video)?'present':'not recorded'],['Audio',(flags&EFTA_UNIFIED_FLAG.audio)?'present':'not recorded'],['Standalone image',(flags&EFTA_UNIFIED_FLAG.image)?'present':'not recorded']];
 const eligible=EFTA_INDEX_SET.has(id);
 const body='<h2>File availability</h2><dl>'+fields.map(([k,v])=>'<dt><strong>'+esc(k)+'</strong></dt><dd>'+esc(v)+'</dd>').join('')+'</dl><h2>Search publication status</h2><p>'+ (eligible?'This identifier is admitted to the public EFTA source-record sitemap.':'This identifier is not in the reviewed public EFTA sitemap. Its metadata lookup is intentionally noindex; this does not imply that the underlying source is false or missing.')+'</p><p>'+(eligible?'<a href="/archive/'+id+'">Open the published EFTA source page</a>':'<a href="https://grokarchivehub.com/archive/'+id+'">Check available source access on the main archive</a>')+'</p><p><a href="/catalog">Search another exact ID</a></p>';
 return eftaCatalogPage('/catalog/'+id,id+' source-format record','Source-format inventory for '+id+'; a metadata record is not an allegation or a verified transcript.',body,'noindex,follow');
}
"""
replace1(anchor,anchor+'\n'+binary_code,'catalog inject')
# Handler order immediately after path canonicalization and before research/redirect cases.
key=" const id=path.match(/^\\/archive\\/efta(\\d{1,8})(?:\\.html)?$/i);"
handlers=""" if(path==='/catalog')return send(req,res,200,eftaCatalogOverviewPage(),'text/html; charset=utf-8','index,follow');
 if(path==='/catalog/media')return send(req,res,200,eftaCatalogMediaPage(),'text/html; charset=utf-8','index,follow');
 if(path==='/catalog/lookup'){
  const raw=String(url.searchParams.get('id')||'').trim().toUpperCase();
  if(!/^EFTA\\d{8}$/.test(raw))return send(req,res,400,'Invalid exact EFTA identifier','text/plain; charset=utf-8','noindex,follow');
  return redirect(req,res,ORIGIN+'/catalog/'+raw);
 }
 const eftaCatalogRecord=path.match(/^\\/catalog\\/(EFTA\\d{8})$/);
 if(eftaCatalogRecord){
  const id=eftaCatalogRecord[1];
  const flags=eftaCatalogFlags(id);
  if(!flags)return send(req,res,404,'Record identifier not found','text/plain; charset=utf-8','noindex,follow');
  return send(req,res,200,eftaCatalogExactIdPage(id,flags),'text/html; charset=utf-8','noindex,follow');
 }
 """
replace1(key,handlers+key,'catalog handlers')
# Index both substantive directory pages as original research metadata hubs.
replace1("const paths=['/','/archive','/research-index',","const paths=['/','/archive','/research-index','/catalog','/catalog/media',",'sitemap extension')
# Improve wiki homepage research visibility without changing the HTML template.
needle="  return send(req,res,200,html,'text/html; charset=utf-8','index,follow');\n }"
assert s.count(needle)>=1
needle_context=" if(path==='/'||path==='/archive'){"
section="""  const catalogNav='<section id="efta-source-inventory" aria-label="Full EFTA source inventory"><h2>Full EFTA source inventory</h2><p>Search '+eftaCatalogNum(EFTA_UNIFIED_CATALOG_SUMMARY.records)+' distinct EFTA records by exact identifier, and identify PDF, OCR, video and audio availability without assuming media content or exposing unreviewed personal details.</p><p><a href="/catalog">Explore the complete source catalog</a> · <a href="/catalog/media">Media-aware source inventory</a></p></section>';
  html=html.replace('</main>',catalogNav+'</main>');
"""
before,sep,after=s.partition(needle_context)
assert sep,'wiki homepage handler'
after=after.replace(needle,section+needle,1)
s=before+sep+after
# Research directory link points to full source inventory, avoids enumerating protected media IDs.
needle="  const eftaSearch='<section id=\"wiki-efta-open-catalog\">"
assert s.count(needle)==1
s=s.replace("  html=html.replace('</main>','<p><a href=\"'+MAIN+'/archive/ids\">Read the published document dossiers</a> · <a href=\"/archive\">Browse receipt cards</a></p>'+discovery+eftaSearch+'</main>');",
            "  html=html.replace('</main>','<p><a href=\"'+MAIN+'/archive/ids\">Read the published document dossiers</a> · <a href=\"/archive\">Browse receipt cards</a> · <a href=\"/catalog\">Look up all EFTA source formats</a></p>'+discovery+eftaSearch+'</main>');")
args.output.parent.mkdir(parents=True,exist_ok=True)
args.output.write_text(s)
print(json.dumps({'patch':'unified-exact-efta-lookup','catalog_count':summary['records'],'media_video':summary['video_ids'],'media_audio':summary['audio_ids'],'base_sitemap_count':89,'code_bytes':len(s),'source_analytics_preserved':('res.gahPublicAnalytics' in s)},indent=2))
