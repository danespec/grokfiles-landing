from pathlib import Path
from bs4 import BeautifulSoup
from urllib.parse import urlsplit
from datetime import datetime,timezone
import json,re,sys,subprocess,xml.etree.ElementTree as ET
repo=Path(__file__).resolve().parents[1];root=Path(sys.argv[1]);rows=json.loads((root/'pages.json').read_text());fail=[];legacy={'EFTA00035147','EFTA00039025','EFTA00039356','EFTA00039416','EFTA00039660'};hashes=json.loads((repo/'tests/legacy-dossier-provenance-20261027.json').read_text());shells=[];copy_findings=[];cached=[]
pattern=re.compile(r'GAH-SEO-STORY|DOMINANCE-001|Build: GAH-|AD-EXCLUDE|noindex by route policy|GROK-037[AB]|094 closeout|Non-Competing',re.I)
for row in rows:
 if row['status']!=200 or not row['title']:continue
 soup=BeautifulSoup((root/row['html']).read_text(),'html.parser');main=soup.find('main') or soup;u=urlsplit(row['url']);identifier=u.path.rsplit('/',1)[-1]
 def bad(issue):fail.append({'url':row['url'],'issue':issue,'cache':row.get('cache'),'age':row.get('age')})
 if identifier in legacy and u.path.startswith('/archive/'):
  shells.append(identifier)
  if soup.find('link',href='/frontdoor/evidence-dossier.css') or main.select('.hero,.hero-grid,.matrix,.fact-grid,.status-row') or main.find('footer'):bad('Embedded legacy layout remains')
  source=main.find(id='source-access')
  for value in hashes[identifier]:
   if not source or value not in source.get_text():bad('Exact source hash not retained under verification')
 for node in soup.find_all(['script','style']):node.decompose()
 visible=(soup.body or soup).get_text(' ',strip=True)
 if u.hostname=='grokarchivehub.com' and pattern.search(visible):copy_findings.append(row['url']);bad('Public build/ad code remains')
 if u.path in ['/research/evidence/epstein-death','/research/evidence/mcc-epstein-control-spine'] and 'Canonical route:' in visible and 'wiki.grokarchivehub.com'+u.path in visible:bad('Displayed canonical host contradicts canonical')
 if u.path=='/archive-scope' and not all(x in visible for x in ['192','69','261','72']):bad('Archive scope snapshot does not match sitemap scopes')
 if u.path=='/barak/entities':
  headings=[h.name for h in soup.find_all(re.compile('^h[1-6]$'))]
  if headings[:3]!=['h1','h2','h3']:bad('Entity index heading hierarchy')
 if u.hostname=='wiki.grokarchivehub.com':
  if identifier in ['EFTA00035147','EFTA00039416','EFTA00039660']:
   reg=json.loads((repo/'content/identifier-dossiers.json').read_text());entry=next(e for e in reg['entries'] if e['id']==identifier)
   description=soup.find('meta',attrs={'name':'description'})
   if not description or description.get('content')!=entry['description']:cached.append(row['url']);bad('Old receipt description metadata')
  if identifier=='EFTA02858491' and 'indexable source page' in visible:cached.append(row['url']);bad('Old cached wiki wording')
  if u.path=='/archive' and any(t in visible for t in ['page 15 / footer EFTA00035161','CH0080 file windows are not video continuity','/661 - late-July psych-observation source line']):cached.append(row['url']);bad('Old cached archive labels')
p=subprocess.run(['curl','-fsS','--max-time','30','https://wiki.grokarchivehub.com/sitemap.xml'],capture_output=True,text=True);urls=[x.text for x in ET.fromstring(p.stdout).iter() if x.tag.endswith('}loc')];reg=json.loads((repo/'content/identifier-dossiers.json').read_text());expected={'https://wiki.grokarchivehub.com'+p for p in ['/','/archive','/research-index',*['/receipts/'+e['id'] for e in reg['entries'] if e['indexable']]]}
if set(urls)!=expected:fail.append({'url':'https://wiki.grokarchivehub.com/sitemap.xml','issue':'Sitemap differs from self-canonical registry routes','unexpected':sorted(set(urls)-expected),'missing':sorted(expected-set(urls))})
p=subprocess.run(['curl','-sS','--max-time','30','-D','-','https://grokarchivehub.com/search'],capture_output=True,text=True);headers,_,html=p.stdout.partition('\n\n');search=BeautifulSoup(html,'html.parser');og=search.find('meta',attrs={'property':'og:image'});search_ok=bool(og and '/assets/page-cards/' in og.get('content',''))
if not search_ok:fail.append({'url':'https://grokarchivehub.com/search','issue':'Search utility lacks page-specific social card'})
report={'checkedAt':datetime.now(timezone.utc).isoformat(),'fiveLegacyBodiesChecked':sorted(shells),'publicBuildCodeFindings':copy_findings,'wikiSitemapCount':len(urls),'wikiSitemapIncludesTopics':any(u.endswith('/topics') for u in urls),'searchSpecificImage':search_ok,'cachedWikiFailures':sorted(set(cached)),'failures':fail,'robotsFormatting':'Unchanged; accepted policy-preserving exception'}
(root/'fourth-review-checks.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2));raise SystemExit(bool(fail))
