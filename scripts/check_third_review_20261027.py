from pathlib import Path
from bs4 import BeautifulSoup
from urllib.parse import urlsplit,urljoin
import sys,json,re,subprocess
repo=Path(__file__).resolve().parents[1];root=Path(sys.argv[1]);rows=json.loads((root/'pages.json').read_text());entries={e['id']:e for e in json.loads((repo/'content/identifier-dossiers.json').read_text())['entries']};fail=[];shells=0;generic=0;unlinked=0
legacy={'EFTA00035147','EFTA00039025','EFTA00039356','EFTA00039416','EFTA00039660'}
changed={'EFTA00035147','EFTA00039416','EFTA00039660'}
copy_paths={'/topics','/investigations','/investigations/new-mexico-doj-epstein-records','/research/evidence/epstein-death','/research/evidence/mcc-epstein-control-spine','/archive/EFTA00033413','/archive/EFTA02858491','/receipts/EFTA02858491'}
for row in rows:
 if row['status']!=200 or not row['title']:continue
 u=urlsplit(row['url']);soup=BeautifulSoup((root/row['html']).read_text(),'html.parser');main=soup.find('main') or soup
 def bad(issue):fail.append({'url':row['url'],'issue':issue,'cache':row.get('cache'),'age':row.get('age')})
 image=soup.find('meta',attrs={'property':'og:image'})
 if image and any(x in image.get('content','') for x in ['card-pinboard.jpg','hero-desk.jpg']):generic+=1;bad('Remaining generic social image')
 id=u.path.rsplit('/',1)[-1]
 if u.path.startswith('/archive/') and id in legacy:
  shells+=1
  if not {'identifier-dossier','shell'}<=set(main.get('class',[])) or main.find('footer') or soup.find(id='ask-gah-panel'):bad('Legacy shell/footer module remains')
 if id in changed and u.path.startswith(('/archive/','/receipts/')):
  if entries[id]['title'] not in soup.title.get_text():bad('Old abbreviated title remains')
 if u.path=='/archive/EFTA00035147' and 'PDF page 15 / footer EFTA00035161' not in main.get_text(' ',strip=True):bad('Exact page/footer label missing')
 if u.path=='/barak/entities':
  h=soup.find(re.compile('^h[1-6]$'))
  if not h or h.name!='h1':bad('H1 does not precede first section heading')
 for t in soup.find_all(['script','style']):t.decompose()
 visible=(soup.body or soup).get_text(' ',strip=True)
 if u.path in copy_paths and re.search(r'indexable|noindex|AD-EXCLUDE by|Ad policy:',visible,re.I):bad('Public operational jargon remains')
 if u.hostname=='grokarchivehub.com':
  named=set(re.findall(r'\bEFTA\d{8}\b',visible))&set(entries);named.discard(id)
  linked={m[1] for a in soup.find_all('a',href=True) if (m:=re.search(r'/archive/(EFTA\d{8})(?:$|[?#])',urljoin(row['url'],a['href'])))}
  missing=named-linked
  if missing:unlinked+=len(missing);bad('Published IDs missing links anywhere in body: '+','.join(sorted(missing)))
p=subprocess.run(['curl','-sS','--max-time','30','-D','-','https://wiki.grokarchivehub.com/topics'],capture_output=True,text=True);h,_,b=p.stdout.partition('\n\n');topic_ok=bool(re.search(r'^HTTP/\S+ 301',h,re.M) and re.search(r'^location: https://grokarchivehub.com/topics\s*$',h,re.M|re.I))
if not topic_ok:fail.append({'url':'https://wiki.grokarchivehub.com/topics','issue':'Canonical topics redirect not publicly current'})
report={'checkedHtmlPages':sum(x['status']==200 and bool(x['title']) for x in rows),'legacyShellsChecked':shells,'genericShareImages':generic,'publishedIdsMissingLinksAcrossFullBody':unlinked,'wikiTopicsRedirect':topic_ok,'failures':fail,'physicalRobotsConsolidated':False,'robotsDisposition':'Explicit formatting exception; preserve owner Bot Preference Sync and Training policies.'}
(root/'third-review-checks.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2));raise SystemExit(bool(fail))
