from pathlib import Path
from urllib.parse import urljoin,urlsplit
from concurrent.futures import ThreadPoolExecutor
from collections import defaultdict
from datetime import datetime,timezone
from bs4 import BeautifulSoup
import subprocess,json,re,hashlib,sys,xml.etree.ElementTree as ET
repo=Path(__file__).resolve().parents[1];graph=Path(sys.argv[1]);out=graph/'asset-handoff';out.mkdir(parents=True,exist_ok=True);fail=[];superseded=[]
def check(ok,why):
 if not ok and why.startswith('Hub ratio ') and '--publication-policy' in sys.argv:
  superseded.append({'check':why,'reason':'The owner replaced the prior hub-link distribution goal with noindex/consolidation of thin research inventory.'});return
 if not ok:fail.append(why)
def fetch(url,cookie=False,range_=False,refresh=False):
 key=hashlib.sha256((url+str(cookie)+str(range_)).encode()).hexdigest()[:20];h=out/(key+'.headers');b=out/(key+'.body');args=['curl','-sS','--connect-timeout','10','--max-time','65','-D',str(h),'-o',str(b)]
 if cookie:args+=['-b','gah_bob_ack=1']
 if range_:args+=['-r','0-7']
 run=None if not refresh and '--reuse-captures' in sys.argv and h.exists() and b.exists() else subprocess.run(args+[url],capture_output=True);head=h.read_text() if h.exists() else '';body=b.read_bytes() if b.exists() else b'';matches=re.findall(r'HTTP/\S+ (\d+)',head);status=int(matches[-1]) if matches else 0;headers={k.lower():v.strip() for k,v in re.findall(r'^([^:\r\n]+):\s*([^\r\n]*)',head,re.M)}
 return {'url':url,'status':status,'type':headers.get('content-type',''),'location':headers.get('location'),'firstBytes':body[:200].decode('utf8','replace'),'bytes':len(body),'sha256':hashlib.sha256(body).hexdigest(),'headers':headers,'bodyFile':str(b.relative_to(graph))},body
base='https://grokarchivehub.com';restored=json.loads((repo/'docs/reaudit-20261027/tenth-restored-assets.json').read_text());snapshots=[]
def snapshot(row):
 r,b=fetch(base+row['path']);s=BeautifulSoup(b,'html.parser');r['title']=s.title.get_text(' ',strip=True) if s.title else '';r['homepageCanonicalCount']=len(re.findall(rb'canonical["\x27]?\s+href=["\x27]https://grokarchivehub.com/["\x27]',b,re.I));check(r['status']==200 and r['homepageCanonicalCount']==0 and 'Epstein Files & Original Investigations' not in r['title'],'Snapshot '+row['path']);return r
with ThreadPoolExecutor(max_workers=8) as ex:snapshots=list(ex.map(snapshot,[r for r in restored if '/source/html/' in r['path']]))
unknown=['/evidence-data/zzz/nope'+x for x in ['.txt','.json','.tsv','.csv','.pdf','.html','.png','']]+['/evidence-data/new-mexico-doj/source/html/zzz-nope','/book-of-black/source/zzz-nope.pdf','/book-of-black/source/zzz-nope.txt','/book-of-black/source/zzz-nope.html','/book-of-black/source/zzz-nope.png'];missing=[]
unknown+=list(json.loads((repo/'docs/reaudit-20261027/tenth-source-replacements.json').read_text()))
for p in unknown:
 r,b=fetch(base+p,refresh=True);missing.append(r);check(r['status']==404,'Unknown '+p)
data=[]
for p,mime in [('/evidence-data/blanche-no-evidence/source/captions/senate-isvp-july15-combined-captions.txt','text/plain'),('/evidence-data/doj-oip-epstein-review-2026-10-09/source-manifest.json','application/json'),('/research/epstein-final-48-hours-mcc-source-ledger.tsv','text/tab-separated-values')]:
 r,b=fetch(base+p);data.append(r);check(r['status']==200 and mime in r['type'] and not b.lstrip().lower().startswith(b'<!doc'),'Data '+p)
book=[];p='/book-of-black/source/Book_of_Black_V6HHT.pdf'
for cookie,range_ in [(False,False),(True,True),(True,False)]:
 r,b=fetch(base+p,cookie,range_);r.update(cookie=cookie,range=range_);book.append(r)
 if not cookie:check(r['status']==403,'Book anonymous gate')
 elif range_:check(r['status']==206 and b.startswith(b'%PDF-'),'Book PDF range')
 else:check(r['status']==200 and r['sha256']=='e28da16e03c8b7e9819bf5010874ab2d5ed13564636f59a55ca1ce70fbec5eff','Book full manuscript hash')
for path in ['/status','/page/1','/page/2','/page/100','/search?q=black','/ledger']:
 r,b=fetch(base+'/api/book-of-black'+path,True);book.append(r);check(r['status']==200 and 'application/json' in r['type'],'Book API '+path)
 try:json.loads(b)
 except ValueError:check(False,'Book non-JSON '+path)
r,b=fetch(base+'/api/book-of-black/status');book.append(r);check(r['status']==200 and 'application/json' in r['type'],'Book public status')
pages=json.loads((graph/'pages.json').read_text());byurl={r['url']:r for r in pages};indexed=[];titles=defaultdict(list);descs=defaultdict(list);robots=[];ellipsis=[];typos=[];badlinks=[];asset_urls=set()
for row in pages:
 p=graph/row['html']
 if row['status']!=200 or 'text/html' not in row.get('type','') or not p.exists():continue
 soup=BeautifulSoup(p.read_text(),'html.parser');rm=soup.find('meta',attrs={'name':'robots'});rm=rm.get('content','') if rm else '';rh=row.get('robotsHeader') or '';norm=lambda x:','.join(sorted(x.lower().replace(' ','').split(',')))
 if rm and rh and norm(rm)!=norm(rh):robots.append(row['url'])
 desc=soup.find('meta',attrs={'name':'description'});desc=desc.get('content','') if desc else '';title=soup.title.get_text(' ',strip=True) if soup.title else ''
 if '…' in desc:ellipsis.append(row['url'])
 for a in soup.select('a[href]'):
  u=urlsplit(urljoin(row['url'],a['href']))
  if u.hostname=='grokarchivehub.com' and (u.path.startswith('/evidence-data/') or u.path.endswith('.tsv')):asset_urls.add(u.scheme+'://'+u.netloc+u.path+('?' + u.query if u.query else ''))
  if u.hostname not in ['grokarchivehub.com','wiki.grokarchivehub.com']:continue
  if '/cdn-cgi/l/email-protection' in u.path or u.path=='/api/pdf' or u.path.endswith('.html'):badlinks.append([row['url'],u.geturl()])
  if u.path=='/auth/patreon/start' and 'nofollow' not in a.get('rel',[]):badlinks.append([row['url'],'missing nofollow'])
 if 'ETFA' in str(soup):typos.append(row['url'])
 if 'noindex' not in (rm+rh).lower() and row.get('canonical')==row['url']:
  indexed.append(row);titles[title.casefold()].append(row['url']);descs[desc.casefold()].append(row['url']);check(bool(title) and len(title)<=70 and '…' not in title,'Indexable title '+row['url']);check(bool(desc) and len(desc)<=155 and '…' not in desc,'Indexable description '+row['url']);check(len(soup.select('h1'))==1,'H1 '+row['url'])
dupT={k:v for k,v in titles.items() if len(v)>1};dupD={k:v for k,v in descs.items() if len(v)>1};check(not dupT,'Duplicate titles');check(not dupD,'Duplicate descriptions');check(not robots,'Mixed robots');check(not ellipsis,'Noindex description truncations');check(not badlinks,'Indirect or utility links');check(not typos,'ETFA editorial HTML')
# Content links only: inside main, exclude same-page fragments and sitewide navigation/footer/template route lists.
hubs={}
for path in ['/barak/receipts','/barak/timeline']:
 row=byurl[base+path];soup=BeautifulSoup((graph/row['html']).read_text(),'html.parser');main=soup.find('main');targets=set()
 template=set()
 for a in soup.select('header a[href],footer a[href]'):
  u=urlsplit(urljoin(base+path,a['href']));template.add(u.scheme+'://'+u.netloc+u.path)
 for node in main.select('nav,footer'):node.decompose()
 for a in main.select('a[href]'):
  u=urlsplit(urljoin(base+path,a['href']));target=u.scheme+'://'+u.netloc+u.path
  if u.hostname in ['grokarchivehub.com','wiki.grokarchivehub.com'] and target!=base+path and target not in template and not re.search(r'\.[a-z0-9]{1,8}$',u.path,re.I):targets.add(target)
 noindex=[];unclassified=[]
 for target in sorted(targets):
  r=byurl.get(target)
  if not r:unclassified.append(target)
  elif 'noindex' in ((r.get('robotsMeta') or '')+(r.get('robotsHeader') or '')).lower():noindex.append(target)
 hubs[path]={'noindex':len(noindex),'contentLinks':len(targets),'templateExclusions':len(template),'noindexTargets':noindex,'unclassified':unclassified,'allTargets':sorted(targets)};check(not unclassified and len(noindex)*2<=len(targets),'Hub ratio '+path)
# All sitemap identities, all linked PDFs and DOI/source references remain independently recorded.
sitemaps={};listed=set()
for url in [base+'/sitemap.xml',base+'/sitemap-efta.xml','https://wiki.grokarchivehub.com/sitemap.xml']:
 r,b=fetch(url);urls=[e.text for e in ET.fromstring(b).iter() if e.tag.endswith('}loc')];sitemaps[url]=len(urls);listed.update(urls)
 for u in urls:row=byurl.get(u);check(row is not None and row['status']==200 and row['canonical']==u and 'noindex' not in ((row.get('robotsMeta') or '')+(row.get('robotsHeader') or '')).lower(),'Sitemap identity '+u)
check(not ({r['url'] for r in indexed}-listed),'Indexable sitemap omissions')
# Check every evidence asset actually linked from the crawled HTML, including noindex tools.
expected_pdfs={base+r['path']:r for r in json.loads((repo/'docs/reaudit-20261027/ninth-pdf-inventory.json').read_text())['verified']}
asset_urls.update(expected_pdfs)
def asset(url):
 r,b=fetch(url);check(r['status']==200,'Linked asset HTTP '+url);check(not re.search(rb'canonical[^>]+href=["\x27]https://grokarchivehub.com/["\x27]',b[:65536],re.I),'Linked asset homepage '+url)
 path=urlsplit(url).path
 if path.endswith('.pdf'):check(b.startswith(b'%PDF-') and 'application/pdf' in r['type'],'Linked PDF bytes/type '+url)
 if path.endswith('.json'):
  try:json.loads(b)
  except ValueError:check(False,'Linked JSON data '+url)
 if url in expected_pdfs:check(r['sha256']==expected_pdfs[url]['sha256'],'Linked PDF hash '+url)
 return r
with ThreadPoolExecutor(max_workers=8) as ex:linkedAssets=list(ex.map(asset,sorted(asset_urls)))
dossierChecks=[]
for e in json.loads((repo/'content/identifier-dossiers.json').read_text())['entries']:
 if not e['indexable']:continue
 u=base+'/archive/'+e['id'];row=byurl[u];soup=BeautifulSoup((graph/row['html']).read_text(),'html.parser');h1=soup.find('h1').get_text(' ',strip=True);main=soup.find('main');external=[a['href'] for a in main.select('a[href]') if a['href'].startswith('https://') and not any(h in urlsplit(a['href']).hostname for h in ['grokarchivehub.com'])];check(e['id'] in row['title'] and e['id'] in h1,'Dossier ID '+u);check(bool(external) and urlsplit(external[0]).hostname in ['justice.gov','www.justice.gov'] and '.pdf' in external[0].lower(),'Dossier first source '+u);check(any(a['href']=='https://wiki.grokarchivehub.com/receipts/'+e['id'] for a in soup.select('a[href]')),'Dossier reciprocal link '+u);dossierChecks.append({'url':u,'idInTitleAndH1':e['id'] in row['title'] and e['id'] in h1,'firstOutsideLink':external[0] if external else None})
routeChecks=[]
for url,status,location in [(base+'/archive/efta00013764',301,base+'/archive/EFTA00013764'),(base+'/archive/EFTA13764',301,base+'/archive/EFTA00013764'),(base+'/archive/efta13764',301,base+'/archive/EFTA00013764'),('https://wiki.grokarchivehub.com/receipts/efta00013764',301,'https://wiki.grokarchivehub.com/receipts/EFTA00013764'),('https://www.grokarchivehub.com/',301,base+'/')]+[(host+p,404,None) for host,paths in [(base,['/zzz-nonexistent-page','/research/zzz-nope','/investigations/zzz-nope','/archive/EFTA99999999','/pdf-lite?id=ZZZ']),('https://wiki.grokarchivehub.com',['/zzz-nope','/research/zzz-nope','/receipts/EFTA99999999','/pdf-lite?id=ZZZ'])] for p in paths]:
 r,b=fetch(url);routeChecks.append(r);check(r['status']==status and (not location or r['location']==location),'Route regression '+url)
robotsChecks=[]
for host in [base,'https://wiki.grokarchivehub.com']:
 r,b=fetch(host+'/robots.txt');text=b.decode();check(r['status']==200 and 'User-agent: *' in text and 'Allow: /' in text,'Robots public search '+host);check(not re.search(r'User-agent: (?:Googlebot|Bingbot)\s+Disallow: /(?:\s|$)',text,re.I),'Robots blocked search '+host);robotsChecks.append({'url':host+'/robots.txt','status':r['status'],'body':text})
for path in ['/dispatches/epstein-mcc-timeline','/research/evidence/mcc-epstein-control-spine','/investigations/mcc-final-48-hours-source-chain']:
 row=byurl[base+path];check(row['status']==200 and 'noindex' in (row.get('robotsHeader') or '') and 'noindex' in (row.get('robotsMeta') or '') and row['canonical']==base+'/research/epstein-final-48-hours-mcc' and base+path not in listed,'MCC primary '+path)
prior=json.loads((out/'acceptance.json').read_text()) if '--reuse-captures' in sys.argv and (out/'acceptance.json').exists() else {}
result={'checkedAt':prior.get('checkedAt',datetime.now(timezone.utc).isoformat()),'analysisAt':datetime.now(timezone.utc).isoformat(),'snapshots':snapshots,'missing':missing,'dataFiles':data,'book':book,'indexableCount':len(indexed),'duplicateTitleGroups':dupT,'duplicateDescriptionGroups':dupD,'robotsMismatches':robots,'descriptionEllipses':ellipsis,'ETFApages':typos,'badLinks':badlinks,'hubs':hubs,'sitemaps':sitemaps,'linkedAssets':linkedAssets,'dossierChecks':dossierChecks,'routeChecks':routeChecks,'robotsChecks':robotsChecks,'supersededHubRatioChecks':superseded,'failures':fail}
(out/'acceptance.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps({k:v for k,v in result.items() if k not in ['snapshots','missing','dataFiles','book','linkedAssets','dossierChecks','routeChecks','robotsChecks']},indent=2));assert not fail,fail
