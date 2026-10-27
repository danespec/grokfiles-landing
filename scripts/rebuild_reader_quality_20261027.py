from pathlib import Path
from bs4 import BeautifulSoup
import json,re,html,hashlib,textwrap,subprocess,os
from urllib.parse import urlsplit
from PIL import Image,ImageDraw,ImageFont
repo=Path(__file__).resolve().parents[1];root=repo/'docs/reaudit-20261027';esc=lambda s:html.escape(str(s),quote=True)
reg=json.loads((repo/'content/identifier-dossiers.json').read_text());entries={e['id']:e for e in reg['entries']};sources=json.loads((repo/'content/identifier-source-links.json').read_text())
baseline=json.loads((root/'source-route-baseline.json').read_text())
BASE_COMMIT='d5e2a9f'
def baseline_html(p):
 return subprocess.check_output(['git','show',BASE_COMMIT+':'+str(p.relative_to(repo))],cwd=repo,text=True)
def clean_title(t):
 for _ in range(3):
  t=re.sub(r'\s*[|·]\s*(?:GrokArchiveHub|Grok Archive Hub|GAH)\s*$','',t,flags=re.I)
  t=re.sub(r'^(?:GrokArchiveHub|Grok Archive Hub)(?:\s*[|·:—]\s*|\s+)(?=\S)','',t,flags=re.I)
 return t.strip()
def replace_main(p,inner):
 s=p.read_text();s,n=re.subn(r'(<main\b[^>]*>)[\s\S]*?</main>',lambda m:m[1]+inner+'</main>',s,count=1,flags=re.I);assert n,p;p.write_text(s)
refs={id:[] for id in entries}
for row in baseline:
 u=urlsplit(row['url']);parts=u.path.strip('/').split('/')
 if u.hostname!='grokarchivehub.com' or len(parts)<2 or parts[0] in ['archive','assets']:continue
 for id in row['idsNamed']:
  if id in refs:refs[id].append({'path':u.path,'title':clean_title(row['title'])})
for id in refs:
 refs[id]=list({x['path']:x for x in sorted(refs[id],key=lambda x:(not x['path'].startswith('/reels/'),x['path']))}.values())
flagships=['EFTA00013764','EFTA00035147','EFTA00039025','EFTA00039356','EFTA00039416','EFTA00039660']
def listing(ids):
 return '<ul>'+''.join('<li><a href="/archive/'+id+'">'+id+' — '+esc(entries[id]['title'])+'</a></li>' for id in ids)+'</ul>'
archive='<section class="page-hero"><p class="eyebrow">Document dossiers</p><h1>Explore the evidence archive</h1><p class="lede">Start with a reviewed record, open its source, and read the limits before drawing conclusions.</p></section><section class="content wide" id="flagship-dossiers"><h2>Start with these six records</h2>'+listing(flagships)+'</section><section class="content wide" id="all-published-dossiers"><h2>All '+str(len(entries))+' published dossiers</h2><p>Every entry links an exact identifier, source access, document context and a reciprocal wiki receipt card. A published note does not establish wrongdoing.</p>'+listing(sorted(entries))+'</section><section class="content wide"><h2>Continue your research</h2><p><a href="https://wiki.grokarchivehub.com/">Wiki receipt cards</a> · <a href="https://wiki.grokarchivehub.com/research-index">Research index</a> · <a href="/search">Search records</a> · <a href="/banking-records">Banking records</a> · <a href="/photos">Photos and screenshots</a> · <a href="/barak">Barak records</a> · <a href="/methodology">Methodology</a></p><p>The research index, curated proof layer and published dossiers describe separate scopes. <a href="/archive-scope#search-discovery">Read how the archive counts are defined</a>.</p></section>'
replace_main(repo/'archive.html',archive)
# The complete index is generated from the same register as routing and sitemaps.
replace_main(repo/'archive/ids.html','<h1>Identifier pages</h1><p>Reviewed source notes, exact EFTA identifiers and documentary limits.</p><h2>Start with these records</h2>'+listing(flagships)+'<h2>All published dossiers</h2>'+listing(sorted(entries))+'<p><a href="https://wiki.grokarchivehub.com/">Wiki receipt cards</a> · <a href="/archive">Archive guide</a></p>')
# Repair the primary/mirror source order on social source-note pages.
social_count=0
for folder in ['reels','videos']:
 for p in (repo/folder).glob('*.html'):
  s=baseline_html(p);soup=BeautifulSoup(s,'html.parser');changed=False
  for li in soup.select('li[id^="source-EFTA"]'):
   id=li.get('id','').removeprefix('source-')
   if id not in sources:continue
   heading=li.find(re.compile('^h[2-4]$'));anchor=heading.find('a') if heading else None
   mirror=anchor.get('href','') if anchor else ''
   if not heading:continue
   heading.clear();a=soup.new_tag('a',href=sources[id]);a.string=id+' — official DOJ PDF';heading.append(a)
   if mirror and 'justice.gov/' not in mirror:
    para=soup.new_tag('p');a=soup.new_tag('a',href=mirror);a.string='Secondary mirror of '+id;para.append(a);para.append(' (access copy; not byte-verified against DOJ).');heading.insert_after(para)
   changed=True
  if changed:
   main=soup.find('main');body=str(main)
   body=re.sub(r'The GAH archive route currently returns 404;[^.]*mirror\.','The reviewed dossier is available through the identifier links below.',body)
   body=re.sub(r'GAH[’\x27]s archive locator returns 404;[^.]*\.','The reviewed dossier is available through the identifier links below.',body)
   s,n=re.subn(r'<main\b[^>]*>[\s\S]*?</main>',lambda m:body,s,count=1,flags=re.I);assert n
   p.write_text(s);social_count+=1
# Give all dossiers the same top-level section order, preserving source-specific material.
section_order=['Receipt card','Document context','What the record supports','Source access and verification','Limits and open questions','Where this ID appears','Related published records']
for id,e in entries.items():
 p=repo/'archive'/f'{id}.html';raw=baseline_html(p);soup=BeautifulSoup(raw,'html.parser');main=soup.find('main');assert main,id
 h1=main.find('h1');assert h1,id;h1=h1.extract();h1.string=id+' — '+e['title']
 receipt=main.find(id='receipt');assert receipt,id;receipt=receipt.extract()
 for h in receipt.find_all('h2'):h.string='Receipt card'
 for old in list(main.select('#where-cited, #related-published-records, .archive-navigation')):old.decompose()
 first=main.find('p',class_='source-first');first=first.extract() if first else None
 groups={'context':[],'analysis':[],'source':[],'limits':[]}
 # Preserve the heading's following prose and split paired grid panels by their own subjects.
 nodes=[]
 for node in list(main.contents):
  if getattr(node,'name',None) and 'grid' in node.get('class',[]):
   nodes.extend(x for x in node.contents if str(x).strip())
  else:nodes.append(node)
 current='context'
 for node in nodes:
  if not str(node).strip():continue
  if getattr(node,'name',None) in ['script','style']:groups['context'].append(str(node));continue
  direct=getattr(node,'name',None) in ['h2','h3','h4']
  heading=node if direct else node.find(re.compile('^h[2-4]$')) if getattr(node,'name',None) else None
  label=heading.get_text(' ',strip=True) if heading else ''
  ident=node.get('id','') if getattr(node,'name',None) else ''
  if re.search(r'nearby|neighbou?r',label,re.I):continue
  if heading:
   if ident in ['evidence-boundaries','limits'] or re.search(r'cannot|does not|do not|not establish|limits|privacy|editorial.*boundary|open (?:questions|receipt)|competing|counterevidence',label,re.I):current='limits'
   elif re.search(r'source.*(?:identity|availability|verification)|retrieve|provenance|custody|document references|original source|reading.*source|exact source|source render',label,re.I) or ident in ['source-verification','mirror-provenance']:current='source'
   elif re.search(r'what (?:this|the) record is|document context|research purpose|published, updated',label,re.I):current='context'
   else:current='analysis'
  if getattr(node,'name',None):
   if node.name=='h2':node.name='h3'
   for h in node.find_all('h2'):h.name='h3'
  groups[current].append(str(node))
 # Correct falsely self-referential and mirror-bound links without inventing another review.
 for key in groups:
  chunk=BeautifulSoup(''.join(groups[key]),'html.parser')
  for a in chunk.find_all('a',href=True):
   if re.search(r'Read the source review',a.get_text(),re.I):
    ref=next((r for r in refs[id] if r['path']!='/archive/'+id),None)
    a['href']=ref['path'] if ref else '/archive/ids';a.string='Read the related source notes' if ref else 'Browse published dossiers'
  groups[key]=str(chunk)
 context=groups['context'] or '<p>'+esc(e['description'])+'</p>'
 claim=receipt.find('dd')
 analysis=groups['analysis'] or '<p>'+esc(claim.get_text(' ',strip=True) if claim else e['description'])+'</p>'
 source='<p><a href="'+esc(e['source'])+'">Official DOJ PDF for '+id+'</a>. The official site may require age verification.</p>'+groups['source']
 limits=groups['limits'] or '<p>A source record preserves its author’s statements. It is not independent proof of every event described.</p>'
 where='<ul>'+''.join('<li><a href="'+esc(x['path'])+'">'+esc(x['title'])+'</a></li>' for x in refs[id])+'</ul>' if refs[id] else '<p>No separate article citation is recorded for this ID in the current public article index. The dossier and linked receipt card preserve its source context.</p>'
 dataset=re.search(r'DataSet%20(\d+)',e['source']);near=[x for x in entries if x!=id and dataset and ('DataSet%20'+dataset[1]+'/') in entries[x]['source']];near=sorted(near,key=lambda x:abs(int(x[4:])-int(id[4:])))[:4]
 related='<p>Other published records from this dataset; this is a selected list.</p>'+listing(near)+'<p><a href="https://wiki.grokarchivehub.com/receipts/'+id+'">Receipt card for '+id+'</a> · <a href="/archive/ids">All identifier pages</a></p>'
 body=str(h1)+(str(first) if first else '<p class="source-first"><a href="'+esc(e['source'])+'">Open original DOJ PDF</a></p>')+str(receipt)
 for sid,title,content in [('document-context','Document context',context),('record-support','What the record supports',analysis),('source-access','Source access and verification',source),('evidence-boundaries','Limits and open questions',limits),('where-cited','Where this ID appears',where),('related-published-records','Related published records',related)]:
  body+='<section id="'+sid+'"><h2>'+title+'</h2>'+content+'</section>'
 replace_main(p,body)
# Remove operational copy from public prose, keeping machine policy metadata intact.
for p in repo.rglob('*.html'):
 if any(x in p.parts for x in ['node_modules','.git','staging','frozen-assets','evidence-data']):continue
 s=p.read_text(errors='replace');s=s.replace('on this indexable page','in this source note').replace('ASCEND evidence context','Document context').replace('Claim-source gate','Source references reviewed').replace('42/42 sourced','')
 s=s.replace('indexable summary','published summary').replace('indexable source page','source note')
 s=s.replace('<div><strong>Ad policy</strong><span>Sensitive route; ad-excluded by worker policy</span></div>','').replace('<div><strong>Source references reviewed</strong><span></span></div>','')
 s=re.sub(r'<p\b[^>]*>\s*(?:<strong>)?Ad policy:(?:</strong>)?\s*Sensitive route; ad-excluded by worker policy\.?\s*</p>','',s,flags=re.I)
 if p==repo/"investigations/efta-compliance-tracker.html":s="\n".join(x.rstrip() for x in s.splitlines())+"\n"
 p.write_text(s)
# Deterministic, page-specific share cards for all editorial sitemap routes and wiki hubs.
cards={};out=repo/'assets/page-cards';out.mkdir(exist_ok=True);font=os.environ.get('GAH_CARD_FONT') or next((p for p in ['/System/Library/Fonts/Supplemental/Arial.ttf','/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'] if Path(p).exists()),None);assert font,'Set GAH_CARD_FONT to a readable TrueType font'
rows=[r for r in baseline if urlsplit(r['url']).hostname=='grokarchivehub.com' and r['url'] not in ['https://grokarchivehub.com/sitemap-archive.xml'] and r['status']==200 and not re.search(r'/archive/EFTA\d{8}$',r['url'])]
rows += [r for r in baseline if r['url'] in ['https://wiki.grokarchivehub.com/','https://wiki.grokarchivehub.com/archive','https://wiki.grokarchivehub.com/research-index','https://wiki.grokarchivehub.com/research/evidence/black-book-epstein']]
for r in rows:
 u=r['url'];title=clean_title(r['title']);name=hashlib.sha256(u.encode()).hexdigest()[:20]+'.png';im=Image.new('RGB',(1200,630),'#141914');d=ImageDraw.Draw(im);d.rectangle((0,0,18,630),fill='#d5b67b');d.text((65,48),'GROK ARCHIVE HUB',font=ImageFont.truetype(font,28),fill='#d5b67b')
 if u.endswith('/black-book-epstein'):title='Epstein contact-book source guide'
 for n,line in enumerate(textwrap.wrap(title,width=42)[:5]):d.text((65,135+n*61),line,font=ImageFont.truetype(font,43),fill='#f2eadc')
 d.line((65,490,1135,490),fill='#56634f',width=2);d.text((65,530),urlsplit(u).path[:74] or '/',font=ImageFont.truetype(font,24),fill='#d5b67b');im.save(out/name,optimize=True);cards[u]={'title':title,'image':'https://grokarchivehub.com/assets/page-cards/'+name}
(repo/'content/reader-page-cards.mjs').write_text('export const PAGE_CARDS = '+json.dumps(cards,ensure_ascii=False,indent=2)+';\n')
(root/'build-result.json').write_text(json.dumps({'dossiers':len(entries),'sectionOrder':section_order,'socialSourcePagesUpdated':social_count,'shareCards':len(cards)},indent=2)+'\n')
print('Rebuilt archive and',len(entries),'dossiers;',social_count,'social source pages repaired;',len(cards),'page-specific cards.')
