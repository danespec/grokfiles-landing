from pathlib import Path
from bs4 import BeautifulSoup
from urllib.parse import urlsplit,urljoin
import json,re,collections,sys
root=Path(sys.argv[1]).resolve();repo=Path(__file__).resolve().parents[1];rows=json.loads((root/'pages.json').read_text());reg=json.loads((repo/'content/identifier-dossiers.json').read_text());ids={e['id'] for e in reg['entries']};fail=[];checked=0;sequences=collections.Counter();source_pages=0;generic_images=0
expected=('Receipt card','Document context','What the record supports','Source access and verification','Limits and open questions','Where this ID appears','Related published records')
for row in rows:
 p=root/row['html']
 if row.get('status')!=200 or not row.get('title'):continue
 if not p.exists():continue
 checked+=1;u=urlsplit(row['url']);s=p.read_text();soup=BeautifulSoup(s,'html.parser');main=soup.find('main') or soup
 def bad(reason):fail.append({'url':row['url'],'issue':reason})
 def meta(attr,key):
  x=soup.find('meta',attrs={attr:key});return x.get('content','') if x else ''
 if row['canonical']!=row['url']:bad('Non-self canonical')
 if u.path!='/research/evidence/black-book-epstein' and ('noindex' in row['robots'] or 'noindex' in row['robotsHeader']):bad('Sitemap page is noindex')
 title=soup.title.get_text() if soup.title else '';og=meta('property','og:title');image=meta('property','og:image')
 if title!=og+' | Grok Archive Hub':bad('Title/OG brand mismatch: '+title+' / '+og)
 if re.match(r'^GrokArchiveHub\b',title):bad('Repeated brand prefix')
 if not image:bad('Missing OG image')
 if 'hero-hold-the-letter.jpg' in image:generic_images+=1;bad('Shared generic hero remains')
 if image.startswith('https://grokarchivehub.com/assets/page-cards/') and not (repo/urlsplit(image).path.lstrip('/')).exists():bad('Missing page-card file')
 types=[]
 for script in soup.find_all('script',type='application/ld+json'):
  try:
   d=json.loads(script.string or script.get_text());nodes=d if isinstance(d,list) else d.get('@graph',[d]);types.extend(n.get('@type') for n in nodes if isinstance(n,dict))
  except Exception:bad('Invalid JSON-LD')
 if not types:bad('Missing JSON-LD')
 txt=main.get_text(' ',strip=True)
 for term in ['on this indexable page','ASCEND evidence context','Claim-source gate','Sensitive route; ad-excluded by worker policy','A topic remains indexable']:
  if term in txt:bad('Public jargon: '+term)
 named=set(re.findall(r'EFTA\d{8}',txt)) & ids
 linked=set()
 for a in main.find_all('a',href=True):
  link=urljoin(row['url'],a['href']);m=re.search(r'/archive/(EFTA\d{8})(?:$|[?#])',link)
  if m:linked.add(m[1])
  if a['href'] in ['/wiki','/grok-command-v4']:bad('Redirect-hop link')
  if re.search(r'Read the (?:related )?source (?:review|notes)',a.get_text(),re.I) and (link==row['url'] or 'rollcall.com/' in link):bad('Self-loop or mirror-bound review link')
 self_id=u.path.rsplit('/',1)[-1];named.discard(self_id)
 if u.hostname=='grokarchivehub.com' and named-linked:bad('Published IDs named without dossier links: '+', '.join(sorted(named-linked)))
 if u.hostname=='grokarchivehub.com' and not any(a.get('href')=='https://wiki.grokarchivehub.com/' for a in main.find_all('a')):bad('No direct wiki link')
 if re.fullmatch(r'/archive/EFTA\d{8}',u.path):
  seq=tuple(h.get_text(' ',strip=True) for h in main.find_all('h2'));sequences[seq]+=1
  if seq!=expected:bad('Dossier section order differs')
  if not soup.find(id='where-cited'):bad('Missing citation section')
 if u.hostname=='grokarchivehub.com' and u.path.startswith('/reels/'):
  source_pages+=1
  receipt=main.find(id='receipts')
  if receipt:
   links=[a['href'] for a in receipt.find_all('a',href=True) if '.pdf' in a['href']]
   if links and (set(re.findall(r'EFTA\d{8}',txt)) & ids) and 'justice.gov/' not in links[0]:bad('Mirror precedes official PDF')
 if u.path=='/barak/entities' and not main.find('h1'):bad('Missing H1')
 if row['url']=='https://grokarchivehub.com/archive':
  allsec=main.find(id='all-published-dossiers')
  if not allsec or len(allsec.find_all('li'))!=69:bad('Archive full list is not 69')
  if 'Source locators awaiting verification' in txt:bad('Stale pending-locator copy')
  if main.find('h2').get_text(strip=True)!='Start with these six records':bad('Flagships do not lead')
 if u.hostname=='wiki.grokarchivehub.com' and u.path in ['/','/archive','/research-index']:
  if 'CollectionPage' not in types:bad('Missing collection schema')
 if u.path=='/research/evidence/black-book-epstein':
  if meta('name','robots')!='noindex,follow' or row['localRobots']!='noindex,follow':bad('Black-book robots mismatch')
  if len(re.findall(r'Official DOJ PDF',s))!=80:bad('Black-book source link count')
  if any('/archive/EFTA' in a['href'] for a in main.find_all('a',href=True)):bad('Black-book still links noindex locators')
if checked!=334:fail.append({'issue':'Expected 334 accepted HTML pages','actual':checked})
for row in rows:
 if row.get('status')==200 and row.get('title') and '/black-book-epstein' not in row['url'] and row['robots']!='index,follow':fail.append({'url':row['url'],'issue':'Missing explicit index,follow meta'})
 if row['url'].endswith('/archive/foo') or row['url'].endswith('/not-a-real-gah-page'):
  if row['status']!=404 or 'Page not found | Grok Archive Hub' not in row['title']:fail.append({'url':row['url'],'issue':'Generic 404 not branded/status 404'})
for n in ['identifier-links.json','image-heads.json','probes.json']:
 for x in json.loads((root/n).read_text()):
  problem = (x['status']==404) if n=='identifier-links.json' else (not x.get('passed')) if n=='probes.json' else (x['status']!=200 or not x['type'].startswith('image/'))
  if problem:fail.append({'url':x['url'],'issue':n+' failed','detail':x})
report={'checkedPages':checked,'dossierSectionVariants':len(sequences),'publishedReelPagesChecked':source_pages,'sharedHeroImages':generic_images,'failures':fail}
(root/'acceptance.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps({k:v for k,v in report.items() if k!='failures'}));print(json.dumps(fail[:30],indent=2));raise SystemExit(bool(fail))
