from pathlib import Path
import json,re,html,copy
root=Path(__file__).parent; repo=root/'repository'; esc=lambda s:html.escape(str(s),quote=True)
m=json.loads((repo/'content/media-publication.json').read_text()); metadata={r['id']:r for r in json.loads((root/'source-registry.json').read_text())}; local={r['id']:r for r in json.loads((root/'local-source-registry.json').read_text())}
worker=(repo/'_worker.js').read_text()
gaps=set(re.findall(r'"(EFTA\d{8})"',worker.split('const GAH_UNVERIFIED_ARCHIVE_SOURCE_GAPS = new Set([')[1].split(']);',1)[0]))
# Reuse already published, reviewed descriptions and their limits; no new allegations or OCR publication.
notes={}
for p in m['packages']:
 for id,summary in p['documents'].items():
  if re.fullmatch(r'EFTA\d{8}',id):
   if id not in notes or p['id'].startswith('mcc-'):notes[id]={'summary':summary,'limits':p['limits'],'questions':p.get('questions',[]),'related':p['investigation'],'subject':p['series'],'mirror':p.get('documentLinks',{}).get(id,''),'image':p['card']}
for n in notes.values():
 n['summary']=re.sub(r' (?:The GAH archive route currently returns 404|GAH’s archive locator returns 404)[^.]*\.', '',n['summary'])
# The Amador dossier is sourced from the existing brief and its exact official source manifest.
am=json.loads((repo/'evidence-data/jpmorgan-amador-forensic-report/source-manifest.json').read_text())
notes['EFTA02810827']={'summary':'Jorge Amador’s June 16, 2023 expert report was prepared for the U.S. Virgin Islands litigation against JPMorgan. The 161-page report maps transaction categories and presents the expert’s interpretation of bank records. It is an expert submission in contested civil litigation, not a criminal finding or a judicial determination.','limits':' '.join(am['evidence_boundaries']),'questions':['Check each transaction against the underlying bank record before adopting an expert interpretation.'],'related':'/evidence-briefs/efta02810827-amador-jpmorgan-forensic-report','subject':'Jorge Amador’s JPMorgan expert report','mirror':'','image':'/assets/media-grokarchivehub.png'}
# Source URL evidence: explicit published links first, dataset metadata second. Dataset-12 URLs are listed in DOJ’s official index.
alltext='\n'.join(f.read_text(errors='replace') for d in ['archive','evidence-data'] for f in (repo/d).rglob('*') if f.is_file() and f.suffix in ['.html','.json'] and f.stat().st_size<1500000)
urls={}
for u in re.findall(r'https://(?:www\.)?justice\.gov/epstein/files/[^\s"<>]+?EFTA\d{8}\.pdf',alltext):
 ident=re.search(r'EFTA\d{8}',u).group();urls.setdefault(ident,html.unescape(u.replace('\\u0026','&')))
for id in metadata:
 ds=local.get(id,{}).get('datasets') or [x[2:] for x in metadata[id]['datasets']]
 if len(ds)==1:urls.setdefault(id,f'https://www.justice.gov/epstein/files/DataSet%20{int(ds[0])}/{id}.pdf')
for id in ['EFTA02730265','EFTA02730996','EFTA02731023','EFTA02731082']:urls[id]='https://www.justice.gov/epstein/files/DataSet%2012/'+id+'.pdf'
# These release locations are recorded by the existing published source reviews and exact-ID release map.
for id,ds in {'EFTA00014374':8,'EFTA00759004':9,'EFTA01972778':10,'EFTA00695049':9,'EFTA00962798':9,'EFTA00007893':4,'EFTA00022062':8,'EFTA00016622':8}.items():urls.setdefault(id,f'https://www.justice.gov/epstein/files/DataSet%20{ds}/{id}.pdf')
urls['EFTA02810827']=am['primary_document']['url']
for ident in ['EFTA00039025','EFTA00039356','EFTA00039416','EFTA00039660','EFTA00224262','EFTA00153570','EFTA00153571','EFTA00704168','EFTA01245620']:
 urls.setdefault(ident,'https://www.justice.gov/epstein/files/DataSet%209/'+ident+'.pdf')
new=[]; entries={}; wiki=root/'backend/identifier-receipts';wiki.mkdir(parents=True,exist_ok=True)
basecss=':root{color-scheme:dark}body{margin:0;background:#141914;color:#e9e6dc;font:16px/1.7 system-ui,sans-serif}main,header,footer{max-width:960px;margin:auto;padding:24px}a{color:#efc68b}h1{font-size:clamp(28px,5vw,44px);line-height:1.2}h2{line-height:1.3}section{margin:30px 0}dl{display:grid;grid-template-columns:minmax(90px,140px) 1fr;gap:12px}dt{font-weight:bold}dd{margin:0;overflow-wrap:anywhere}.panel{padding:20px;border:1px solid #536052;border-radius:10px}.lede{font-size:20px}nav{display:flex;flex-wrap:wrap;gap:16px}li{margin:10px 0}code{overflow-wrap:anywhere}@media(max-width:500px){dl{display:block}dd{margin:0 0 18px}}'
def plain(s):return html.unescape(re.sub('<[^>]+>',' ',s)).strip()
def meta(s,name,value,property=False):
 attr='property' if property else 'name';tag=f'<meta {attr}="{name}" content="{esc(value)}">';pat=rf'<meta\b(?=[^>]*\b{attr}=["\']{re.escape(name)}["\'])[^>]*>'
 return re.sub(pat,lambda _:tag,s,flags=re.I) if re.search(pat,s,re.I) else s.replace('</head>',tag+'\n</head>',1)
def receipt(id,n,url):
 summary=re.sub(r' The GAH archive route currently returns 404;[^.]*\.| GAH’s archive locator returns 404;[^.]*\.', '',n['summary'])
 summary=summary.replace('This link uses','The prior source review used')
 bias='Read this record as its author’s account or stated position. Correspondence, schedules, expert opinions and commissioned reviews require independent corroboration; they are not judicial findings.'
 silence=' '.join(n.get('questions',[])) or 'The underlying record does not establish every surrounding event. Missing corroboration remains an open question, not a finding.'
 return f'<section class="panel" id="receipt"><h2>Receipt card</h2><dl><dt>Claim</dt><dd>{esc(summary)}</dd><dt>Source</dt><dd><a href="{esc(url)}">{id} — DOJ PDF</a>. The official site may require age verification.</dd><dt>Bias</dt><dd>{esc(bias)}</dd><dt>Silence</dt><dd>{esc(silence)}</dd><dt>Confidence</dt><dd>Limited to the document description in the cited GAH source review; no new byte comparison with DOJ is claimed.</dd><dt>Status</dt><dd>Source note published; original-file comparison and unresolved questions remain explicitly open.</dd></dl></section>'
def shell(title,desc,url,body,robots='index,follow',image=''):
 return f'<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{esc(title)} | Grok Archive Hub</title><meta name="description" content="{esc(desc)}"><meta name="robots" content="{robots}"><link rel="canonical" href="{esc(url)}"><meta property="og:title" content="{esc(title)}"><meta property="og:description" content="{esc(desc)}"><meta property="og:url" content="{esc(url)}"><meta property="og:image" content="{esc(image or 'https://grokarchivehub.com/assets/media-grokarchivehub.png')}"><style>{basecss}</style></head><body><header><a href="https://grokarchivehub.com/">Grok Archive Hub</a><nav aria-label="Archive navigation"><a href="https://grokarchivehub.com/archive">Dossiers</a><a href="https://wiki.grokarchivehub.com/">Receipt cards (wiki)</a><a href="https://grokarchivehub.com/methodology">Methodology</a><a href="https://grokarchivehub.com/search">Search</a></nav></header><main id="main">{body}</main><footer><a href="https://grokarchivehub.com/archive/ids">Browse identifier pages</a> · <a href="https://grokarchivehub.com/corrections">Corrections</a></footer></body></html>\n'
for id,n in notes.items():
 f=repo/'archive'/f'{id}.html'
 if f.exists():continue
 if id not in urls:continue
 name=n['subject'];title=f'{id} — {name}'
 body=f'<h1>{esc(title)}</h1><p class="lede">{esc(n["summary"])}</p><p><a href="{esc(urls[id])}">Open original DOJ PDF</a></p>'+receipt(id,n,urls[id])+f'<section id="limits"><h2>What this record cannot establish</h2><p>{esc(n["limits"])}</p></section><p><a href="{esc(n["related"])}">Read the source review and its context</a></p>'
 mirror=n['mirror']
 if mirror.startswith('https://media-cdn.rollcall.com/'):body+=f'<p><a href="{esc(mirror)}">Secondary mirror (not byte-verified against DOJ)</a>. A mirror is an access copy, not independent confirmation.</p>'
 f.write_text(shell(title,n['summary'][:230],'https://grokarchivehub.com/archive/'+id,body));new.append(id)
# Keep previously withheld pages withheld; reviewed mirror descriptions do not silently override old original-source gaps.
for f in sorted((repo/'archive').glob('EFTA*.html')):
 id=f.stem;s=f.read_text();n=notes.get(id);url=urls.get(id,'');gated=id in gaps
 h=re.search(r'<h1\b[^>]*>([\s\S]*?)</h1>',s,re.I);name=plain(h.group(1)) if h else id
 name=re.sub(r'^EFTA(?:\d{8}|\[ending \d+\])\s*[:—-]?\s*','',name).strip() or (n['subject'] if n else 'Source record')
 title=f'{id} — {name}';s=re.sub(r'<h1\b[^>]*>[\s\S]*?</h1>',lambda _:f'<h1>{esc(title)}</h1>',s,count=1,flags=re.I);s=re.sub(r'<title[^>]*>[\s\S]*?</title>',lambda _:f'<title>{esc(title)} | Grok Archive Hub</title>',s,count=1,flags=re.I)
 # Keep record-specific analysis, hashes, page footers and provenance intact.
 if not n:
  paragraphs=re.findall(r'<p\b[^>]*>([\s\S]*?)</p>',re.search(r'<main\b[^>]*>([\s\S]*?)</main>',s,re.I).group(1),re.I)
  summary=next((plain(p) for p in paragraphs if len(plain(p))>100),name)
  n={'summary':summary,'limits':'Consult the record-specific limits below. Presence does not establish conduct; chronology does not establish causation.','questions':[],'image':'/assets/media-grokarchivehub.png'}
 desc=f'{id}: {name}. Read the source, document context and limits of what this record establishes.'
 s=meta(s,'description',desc);s=meta(s,'og:title',title,True);s=meta(s,'og:description',desc,True);s=meta(s,'twitter:title',title)
 image='https://grokarchivehub.com'+notes.get(id,{}).get('image','/assets/media-grokarchivehub.png')
 # Give each ID its own share image, generated from exact editorial fields, with no source imagery.
 image='https://grokarchivehub.com/assets/identifier-cards/'+id+'.png'
 s=meta(s,'og:image',image,True);s=meta(s,'twitter:image',image)
 if url and 'id="receipt"' not in s:s=s.replace('</h1>','</h1><p class="source-first"><a href="'+esc(url)+'">Open original DOJ PDF</a></p>'+receipt(id,n,url),1)
 limits='<section id="evidence-boundaries"><h2>Reading limits</h2><p><a href="/methodology#presence-not-conduct">Presence ≠ conduct</a>; <a href="/methodology#chronology-not-causation">chronology ≠ causation</a>; <a href="/methodology#open-slots-not-findings">open slots ≠ findings</a>.</p></section>'
 s=s.replace('</main>',limits+f'<p><a href="https://wiki.grokarchivehub.com/receipts/{id}">Receipt card for {id}</a> · <a href="/archive/ids">Browse identifier pages</a></p></main>',1)
 # Correct a masked public identifier and small public-copy errors without touching financial IDs.
 s=s.replace('Important dossier; indexable; ad-excluded source page','Source dossier; see verification and limits').replace('Important dossier; indexable; ad-excluded autopsy-source page','Exhibit-list source dossier; underlying medical material is not reproduced').replace('ASCEND evidence context','Document context')
 s=s.replace('A account statement','An account statement').replace('ad-excluded source page','source page').replace('ASCEND evidence context','Document context').replace('Original GAH source reader returned 404','The original source copy is not yet verified')
 ld={'@context':'https://schema.org','@type':'Article','headline':title,'identifier':id,'mainEntityOfPage':'https://grokarchivehub.com/archive/'+id,'isBasedOn':url or 'https://www.justice.gov/epstein/search','about':{'@type':'Thing','name':name},'dateModified':'2026-10-27','publisher':{'@type':'Organization','name':'Grok Archive Hub'}}
 oldld=re.findall(r'<script\b[^>]*type=["\']application/ld\+json["\'][^>]*>([\s\S]*?)</script>',s,re.I)
 for raw in oldld:
  try:
   d=json.loads(raw)
   if isinstance(d,dict) and d.get('datePublished'):ld['datePublished']=d['datePublished'];break
  except Exception:pass
 ld.setdefault('datePublished','2026-10-27' if id in new else '2026-10-21')
 s=re.sub(r'<script\b[^>]*type=["\']application/ld\+json["\'][^>]*>[\s\S]*?</script>','',s,flags=re.I)
 s=s.replace('</head>','<script type="application/ld+json">'+json.dumps(ld,ensure_ascii=False).replace('</','<\\/')+'</script></head>',1)
 f.write_text(s)
 entries[id]={'id':id,'title':name,'description':desc,'source':url,'indexable':not gated and bool(url),'new':id in new,'dateModified':'2026-10-27','image':image}
 cardbody=f'<h1>{id} — receipt card</h1>'+receipt(id,n,url or 'https://www.justice.gov/epstein/search')+f'<section><h2>Limits</h2><p>{esc(n["limits"])}</p></section><p><a href="https://grokarchivehub.com/archive/{id}">Read the dossier for {id}</a></p>'
 card=shell(id+' — receipt card',desc,'https://wiki.grokarchivehub.com/receipts/'+id,cardbody,'index,follow' if entries[id]['indexable'] else 'noindex,follow',image)
 (wiki/(id+'.html')).write_text(card)
# New curated IDs have explicit route and index gates. Existing source-gap decisions remain unchanged.
curated=[id for id,e in entries.items() if e['indexable']]
extra=[id for id in new if entries[id]['indexable']]
(repo/'content/identifier-dossiers.json').write_text(json.dumps({'updated':'2026-10-27','entries':list(entries.values())},ensure_ascii=False,indent=2)+'\n')
# Capture mentions from public editorial text, excluding scripts/style and raw source artifacts.
mentions={id:[] for id in entries}
editorial=[]
for d in ['investigations','evidence-briefs','dispatches','reels','videos','news','internet-vs-receipts','topics']:
 for f in (repo/d).glob('*.html'):
  s=f.read_text();main=re.search(r'<main\b[^>]*>([\s\S]*?)</main>',s,re.I)
  if not main:continue
  visible=re.sub(r'<(?:script|style)\b[^>]*>[\s\S]*?</(?:script|style)>','',main.group(1),flags=re.I)
  ids=sorted(set(x.upper() for x in re.findall(r'EFTA\d{8}',plain(visible),re.I)))
  route='/'+str(f.relative_to(repo))[:-5]
  title=plain(re.search(r'<title[^>]*>([\s\S]*?)</title>',s,re.I).group(1))
  editorial.append((f,ids,route,title))
  for id in ids:
   if id in mentions:mentions[id].append({'route':route,'title':title})
for f,ids,route,title in editorial:
 s=f.read_text()
 # No dead or unpublished internal identifier targets. Keep the ID and exact source access when known.
 def fixhref(match):
  id=match.group(2).upper()
  if id in entries:return match.group(0)
  source=urls.get(id)
  return '<span class="identifier-pending">'+match.group(3)+'</span> <span>Identifier page pending</span>'+(' <a href="'+esc(source)+'">DOJ PDF</a>' if source else ' <a href="https://www.justice.gov/epstein/search">Find '+id+' in the DOJ library</a>')
 s=re.sub(r'<a\b([^>]*?)href=["\'](?:https://grokarchivehub\.com)?/archive/(EFTA\d{8})["\'][^>]*>([\s\S]*?)</a>',fixhref,s,flags=re.I)
 if ids:
  items=[]
  for id in ids:
   if id in entries:items.append(f'<li><a href="/archive/{id}">{id}</a>'+(' — source verification pending' if not entries[id]['indexable'] else '')+'</li>')
   else:items.append('<li>'+id+' — Identifier page pending'+(' · <a href="'+esc(urls[id])+'">DOJ PDF</a>' if id in urls else ' · <a href="https://www.justice.gov/epstein/search">DOJ library search</a>')+'</li>')
  s=s.replace('</main>','<section class="identifier-citations" aria-label="Identifier pages cited in this story"><h2>Identifier pages cited in this story</h2><ul>'+''.join(items)+'</ul></section></main>',1)
 f.write_text(s)
for id,refs in mentions.items():
 f=repo/'archive'/f'{id}.html';s=f.read_text();body='<section id="where-cited"><h2>Where this ID appears</h2><ul>'+''.join('<li><a href="'+esc(r['route'])+'">'+esc(r['title'])+'</a></li>' for r in refs)+'</ul></section>' if refs else ''
 f.write_text(s.replace('</main>',body+'</main>',1))
# Crawlable complete index with a separate pending list.
def idlist(ids,wikihost=False):
 return '<ul>'+''.join('<li><a href="'+('https://wiki.grokarchivehub.com/receipts/' if wikihost else '/archive/')+id+'">'+id+' — '+esc(entries[id]['title'])+'</a> · <time datetime="2026-10-27">Updated October 27, 2026</time></li>' for id in ids)+'</ul>'
flagship=[x for x in ['EFTA00013764','EFTA00035147','EFTA00039025','EFTA00039356','EFTA00039416','EFTA00039660'] if x in curated]
indexbody='<h1>Identifier pages</h1><p>Curated document dossiers with source context and limits. The 1.38M+ research index and the 3,628-record curated proof layer describe separate scopes and must not be added together.</p><h2>Start with these records</h2>'+idlist(flagship)+'<h2>All published dossiers</h2>'+idlist(sorted(curated))+'<h2>Verification pending</h2>'+idlist(sorted(set(entries)-set(curated)))
(repo/'archive/ids.html').write_text(shell('Identifier pages','Browse EFTA document dossiers, original-source links and evidentiary limits.','https://grokarchivehub.com/archive/ids',indexbody))
f=repo/'archive.html';s=f.read_text();s=s.replace('</main>','<section><h2>Published identifier dossiers</h2><p><a href="/archive/ids">Browse every identifier page</a> · <a href="https://wiki.grokarchivehub.com/">Receipt cards (wiki)</a></p>'+idlist(flagship)+'<h2>All dossiers, by identifier</h2>'+idlist(sorted(curated))+'</section></main>',1);s=s.replace('The raw-record layer.','The document dossier layer.');f.write_text(s)
# Persistent, crawlable cross-host navigation on locally authored public pages.
for f in repo.glob('**/*.html'):
 if any(x in f.parts for x in ['evidence-data','frozen-assets','staging','.git','node_modules']):continue
 s=f.read_text(errors='replace')
 if '<main' not in s:continue
 if 'Receipt cards (wiki)' not in s:s=s.replace('</main>','<p class="archive-navigation"><a href="https://wiki.grokarchivehub.com/">Receipt cards (wiki)</a> · <a href="/archive/ids">Identifier pages</a></p></main>',1)
 s=s.replace('Primary documents only','Primary documents first').replace('Primary Documents Only','Primary documents first')
 # Shared head titles and social titles use the same editorial string.
 t=re.search(r'<title[^>]*>([\s\S]*?)</title>',s,re.I)
 if t:
  title=re.sub(r'\s*(?:\||·)\s*(?:GAH|GrokArchiveHub|Grok Archive Hub)\s*$','',plain(t.group(1)),flags=re.I)
  s=s[:t.start()]+'<title>'+esc(title)+' | Grok Archive Hub</title>'+s[t.end():];s=meta(s,'og:title',title,True)
 f.write_text(s)
# Method anchors point readers to actual definitions, rather than pipeline jargon.
f=repo/'methodology.html';s=f.read_text();defs=[('presence-not-conduct','Presence does not establish conduct','A name, address, invitation or scheduled appointment is not proof of attendance, knowledge or wrongdoing.'),('chronology-not-causation','Chronology does not establish causation','Sequence and proximity in time do not identify a cause without supporting evidence.'),('open-slots-not-findings','Open slots are questions','Missing extraction or corroboration remains an open question, not a finding.'),('confidence-labels','Confidence labels','Confidence describes the support for a particular statement. Original-file identity, content and interpretation require separate checks.'),('receipt-discipline','Receipt discipline','Each receipt names the claim, source, bias, silence, confidence and status.'),('index-vs-proof-layer','Research index and proof layer','The 1.38M+ research index and the 3,628 curated proof-layer records have separate scopes and are not additive.')]
for anchor,title,desc in defs:
 if f'id="{anchor}"' not in s:s=s.replace('</main>',f'<section id="{anchor}"><h2>{title}</h2><p>{desc}</p></section></main>',1)
s=s.replace('</main>','<section id="identifier-glossary"><h2>Identifier glossary</h2><dl><dt>Bates number</dt><dd>A stamped identifier used to locate a page in a document production. An interior page number need not be a separate PDF.</dd><dt>EFTA number</dt><dd>The EFTA prefix followed by eight digits, used to identify a released document or stamped page. Check the parent document and page footer.</dd></dl></section></main>',1);f.write_text(s)
f=repo/'dispatches/efta-files-guide.html';s=f.read_text();s=s.replace('</main>','<section><h2>Follow one record from ID to source</h2><p>Start with <a href="/archive/EFTA00013764">EFTA00013764</a>, read its <a href="https://wiki.grokarchivehub.com/receipts/EFTA00013764">receipt card</a>, then open the <a href="https://www.justice.gov/epstein/files/DataSet%208/EFTA00013764.pdf">DOJ PDF</a>. Check the full identifier, date and stated limits before citing it.</p><p><a href="/archive/ids">Browse the identifier index</a>.</p></section></main>',1);f.write_text(s)
# Build a truthful wiki front door and compact receipt pages from the same register.
wbody='<h1>Receipt cards and research index</h1><p>Check each claim against its source, limits and open questions. <a href="https://grokarchivehub.com/archive">Main-site dossiers</a> provide the full document context.</p><p>The 1.38M+ research index is separate from the 3,628 curated proof-layer records; these are not additive counts.</p><p><a href="/research-index">Open the research index</a> · <a href="https://grokarchivehub.com/membership">Membership information</a></p><h2>Published receipt cards</h2>'+idlist(sorted(curated),True)+'<h2>Source verification pending</h2>'+idlist(sorted(set(entries)-set(curated)),True)+'<p>Last updated October 27, 2026.</p>'
(root/'backend/wiki-home.html').write_text(shell('Receipt cards and research index','Document receipt cards, source checks and the Grok Archive Hub research index.','https://wiki.grokarchivehub.com/',wbody))
# Record exact source links and source-gated IDs for routers and tests.
(repo/'content/identifier-source-links.json').write_text(json.dumps(urls,indent=2)+'\n')
(root/'build-result.json').write_text(json.dumps({'newDossiers':new,'indexable':curated,'withheld':sorted(set(entries)-set(curated)),'editorialPages':len(editorial)},indent=2)+'\n')
print('Prepared',len(new),'new source dossiers;',len(curated),'indexable dossiers;',len(entries)-len(curated),'withheld;',len(editorial),'editorial pages linked.')
