from pathlib import Path
from urllib.parse import urljoin,urlsplit,urlunsplit
from bs4 import BeautifulSoup
from collections import Counter
import json,re,sys
root=Path(sys.argv[1]);rows=json.loads((root/'pages.json').read_text());by={r['url']:r for r in rows};fail=[];checked=0;redirects=[];noindex_links={};signins=0
for row in rows:
 if row['status']!=200 or 'text/html' not in row['type']:continue
 checked+=1;s=BeautifulSoup((root/row['html']).read_text(),'html.parser');title=s.title.get_text(' ',strip=True) if s.title else '';d=s.find('meta',attrs={'name':'description'});desc=d.get('content','') if d else ''
 if len(title)>70:fail.append({'url':row['url'],'issue':'long title','length':len(title)})
 if len(desc)>155:fail.append({'url':row['url'],'issue':'long description','length':len(desc)})
 for node in s.find_all(['script','style']):node.decompose()
 if re.search(r'evidence cockpit|staged supermatrix',s.get_text(' ',strip=True),re.I):fail.append({'url':row['url'],'issue':'jargon'})
 for a in s.find_all('a',href=True):
  u=urlsplit(urljoin(row['url'],a['href']));target=urlunsplit((u.scheme,u.netloc,u.path,'',''))
  if u.hostname not in ['grokarchivehub.com','wiki.grokarchivehub.com','www.grokarchivehub.com']:continue
  if u.path.startswith('/cdn-cgi/l/email-protection') or (u.path=='/api/pdf' and not u.query):fail.append({'url':row['url'],'issue':'invalid utility link','target':a['href']})
  if u.path=='/auth/patreon/start':
   signins+=1
   if 'nofollow' not in a.get('rel',[]):fail.append({'url':row['url'],'issue':'followed sign-in'})
  if target in by and by[target]['status']==301:redirects.append({'url':row['url'],'target':target,'location':by[target].get('location')})
 if row['url'] in ['https://wiki.grokarchivehub.com/research-index','https://grokarchivehub.com/barak']:
  pub=s.find(id='published-research');tools=s.find(id='research-tools');assert pub and tools,row['url'];p=s.find('main');anchors=p.find_all('a',href=True);pub_links=pub.find_all('a',href=True);tool_links=tools.find_all('a',href=True)
  if len(tool_links)>4:fail.append({'url':row['url'],'issue':'tool block too large'})
  if anchors.index(pub_links[0])>anchors.index(tool_links[0]):fail.append({'url':row['url'],'issue':'tools precede publications'})
  for a in pub_links:
   dest=urljoin(row['url'],a['href']);r=by.get(dest)
   if not r or r['status']!=200 or 'noindex' in (r.get('robotsHeader','')+r.get('robotsMeta','')):fail.append({'url':row['url'],'issue':'unpublished priority link','target':dest})
  noindex_links[row['url']]={'publishedLinks':len(pub_links),'toolLinks':len(tool_links)}
primary='https://grokarchivehub.com/research/epstein-final-48-hours-mcc';secondary='https://grokarchivehub.com/investigations/mcc-final-48-hours-source-chain';r=by[secondary]
if r.get('canonical')!=primary or r.get('robotsHeader')!='noindex,follow' or r.get('robotsMeta')!='noindex,follow':fail.append({'url':secondary,'issue':'primary MCC policy'})
# Confirm sitemap inventory separately; a secondary companion remains accessible but is not a landing-page candidate.
if redirects:fail.append({'issue':'internal redirect links','links':redirects})
report={'htmlPagesChecked':checked,'longTitles':sum(x.get('issue')=='long title' for x in fail),'longDescriptions':sum(x.get('issue')=='long description' for x in fail),'internalRedirectLinks':len(redirects),'nofollowSignIns':signins,'hubs':noindex_links,'failures':fail};(root/'eighth-polish-acceptance.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2));raise SystemExit(bool(fail))
