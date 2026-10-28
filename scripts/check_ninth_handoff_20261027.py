from pathlib import Path
from bs4 import BeautifulSoup
from urllib.parse import urljoin,urlsplit,urlunsplit
from concurrent.futures import ThreadPoolExecutor
from collections import Counter
import json,re,subprocess,hashlib,sys
root=Path(sys.argv[1]);repo=Path(__file__).resolve().parents[1];rows=json.loads((root/'pages.json').read_text());by={r['url']:r for r in rows};fail=[];pdfs=set();targets=set();hubs={};jargon=[];titles=0;descriptions=0;indexed=0
hubpaths=['/research-index','/barak','/barak/receipts','/barak/timeline','/investigations/new-mexico-doj-epstein-records']
policy={'/editorial-policy','/corrections','/book-of-black/methodology','/archive-scope','/methodology','/privacy'}
for row in rows:
 if row['status']!=200 or 'html' not in row['type']:continue
 soup=BeautifulSoup((root/row['html']).read_text(),'html.parser');path=urlsplit(row['url']).path;is_index='noindex' not in row.get('robotsHeader','')+row.get('robotsMeta','')
 if is_index and row.get('canonical')==row['url']:
  indexed+=1;t=soup.title.get_text(' ',strip=True) if soup.title else '';d=soup.find('meta',attrs={'name':'description'});desc=d.get('content','') if d else ''
  if '…' in t or len(t)>70:fail.append({'url':row['url'],'issue':'title','value':t})
  if '…' in desc or not desc or len(desc)>155:fail.append({'url':row['url'],'issue':'description','value':desc})
  titles+=int('…' in t);descriptions+=int('…' in desc)
  if path not in policy:
   copy=BeautifulSoup(str(soup),'html.parser');[n.decompose() for n in copy.find_all(['script','style'])];text=copy.get_text(' ',strip=True)
   for m in re.finditer(r'Evidence cockpit|SUPERMATRIX|staged|workbench|GAH-SEO|REPAIR-|Build 20|indexable|noindex',text,re.I):jargon.append({'url':row['url'],'match':m[0],'context':text[max(0,m.start()-85):m.end()+100]})
 counts=Counter()
 for a in soup.find_all('a',href=True):
  u=urlsplit(urljoin(row['url'],a['href']));target=urlunsplit((u.scheme,u.netloc,u.path,'',''))
  if u.hostname not in ['grokarchivehub.com','wiki.grokarchivehub.com']:continue
  if u.path.endswith('.pdf'):pdfs.add(urlunsplit((u.scheme,u.netloc,u.path,u.query,'')))
  if is_index and target!=row['url'] and not u.path.startswith(('/auth/','/cdn-cgi/')):targets.add(urlunsplit((u.scheme,u.netloc,u.path,u.query,'')))
  dest=by.get(target)
  if dest and dest['status']==200:counts['noindex' if 'noindex' in dest.get('robotsHeader','')+dest.get('robotsMeta','') else 'indexable']+=1
  elif u.path.startswith('/evidence-data/'):counts['source_asset']+=1
  else:counts['other_or_action']+=1
  if u.path=='/auth/patreon/start' and 'nofollow' not in a.get('rel',[]):fail.append({'url':row['url'],'issue':'followed sign-in'})
  if u.path.startswith('/cdn-cgi/l/email-protection') or (u.path=='/api/pdf' and not u.query):fail.append({'url':row['url'],'issue':'broken utility link','target':target})
 if path in hubpaths:
  main=soup.find('main');hubs[row['url']]={'allPageOutboundLinks':dict(counts),'publishedEntry':bool(soup.find(id='published-reading') or soup.find(id='published-research')),'labelledSourceLookups':len(soup.select('.source-lookup'))}
# Check every linked internal destination, including source .html files and viewer redirects excluded by the old HTML-only graph.
def probe(url):
 h=root/('probe-'+hashlib.sha256(url.encode()).hexdigest()[:18]+'.headers');b=h.with_suffix('.body');p=subprocess.run(['curl','-sS','--connect-timeout','8','--max-time','45','-D',str(h),'-o',str(b),'-w','%{http_code}',url],capture_output=True,text=True);headers={k.lower():v.strip() for line in h.read_text(errors='replace').splitlines() if ':' in line for k,v in [line.split(':',1)]} if h.exists() else {};data=b.read_bytes() if b.exists() else b'';return {'url':url,'status':int(p.stdout) if p.stdout.isdigit() else 0,'type':headers.get('content-type',''),'location':headers.get('location'),'pdfMagic':data.startswith(b'%PDF-'),'sha256':hashlib.sha256(data).hexdigest() if data.startswith(b'%PDF-') else None}
with ThreadPoolExecutor(max_workers=6) as pool:pdf_results=list(pool.map(probe,sorted(pdfs)));link_results=list(pool.map(probe,sorted(targets)))
expected={r['path']:r['sha256'] for r in json.loads((repo/'docs/reaudit-20261027/ninth-pdf-inventory.json').read_text())['verified']}
for r in pdf_results:
 if r.get('sha256')!=expected.get(urlsplit(r['url']).path):fail.append({'issue':'source PDF hash mismatch',**r})
 if r['status']!=200 or 'application/pdf' not in r['type'] or not r['pdfMagic']:fail.append({'issue':'linked PDF failed',**r})
for r in link_results:
 if r['status'] in [301,302,303,307,308] and urlsplit(urljoin(r['url'],r['location'] or '')).hostname in ['grokarchivehub.com','wiki.grokarchivehub.com']:fail.append({'issue':'internal redirect',**r})
fakes=[probe('https://grokarchivehub.com'+p) for p in ['/evidence-data/zzz/nope.pdf','/nonexistent-source-check.pdf']]
for r in fakes:
 if r['status']!=404:fail.append({'issue':'fake PDF not 404',**r})
book=probe('https://grokarchivehub.com/book-of-black/source/Book_of_Black_V6HHT.pdf');assert book['status']==403
primary='https://grokarchivehub.com/research/epstein-final-48-hours-mcc'
for p in ['/investigations/mcc-final-48-hours-source-chain','/dispatches/epstein-mcc-timeline','/research/evidence/mcc-epstein-control-spine']:
 r=by['https://grokarchivehub.com'+p]
 if r.get('canonical')!=primary or r.get('robotsHeader')!='noindex,follow' or r.get('robotsMeta')!='noindex,follow':fail.append({'issue':'MCC companion policy','url':r['url']})
# Outbound counts exclude same-page anchors; source files are not HTML landing pages.
for url,hub in hubs.items():
 counts=Counter();soup=BeautifulSoup((root/by[url]['html']).read_text(),'html.parser')
 for a in soup.find_all('a',href=True):
  u=urlsplit(urljoin(url,a['href']));target=urlunsplit((u.scheme,u.netloc,u.path,'',''))
  if u.hostname not in ['grokarchivehub.com','wiki.grokarchivehub.com'] or (target==url and not u.query):continue
  exact=urlunsplit((u.scheme,u.netloc,u.path,u.query,''));h=root/('probe-'+hashlib.sha256(exact.encode()).hexdigest()[:18]+'.headers');headers={k.lower():v.strip() for line in h.read_text(errors='replace').splitlines() if ':' in line for k,v in [line.split(':',1)]} if h.exists() else {};dest=by.get(target);mime=headers.get('content-type',dest.get('type','') if dest else '');robots=headers.get('x-robots-tag',dest.get('robotsHeader','') if dest else '')
  if 'text/html' in mime:counts['noindexHTML' if 'noindex' in robots else 'indexableHTML']+=1
  elif mime and not u.path.startswith('/auth/'):counts['sourceFilesOrData']+=1
  else:counts['actionsOrUnclassified']+=1
 hub['outboundLinksExcludingInPageAnchors']=dict(counts);hub.pop('allPageOutboundLinks',None)
if jargon:fail.append({'issue':'indexable jargon review','matches':jargon})
report={'indexablePagesChecked':indexed,'ellipsisTitles':titles,'ellipsisDescriptions':descriptions,'linkedPdfs':pdf_results,'outboundDestinationsChecked':len(link_results),'internalRedirects':[r for r in link_results if r['status'] in [301,302,303,307,308]],'fakePdfs':fakes,'bookPdf':book,'hubs':hubs,'jargonMatches':jargon,'failures':fail};(root/'ninth-handoff-acceptance.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps({k:v for k,v in report.items() if k not in ['linkedPdfs','jargonMatches','failures']},indent=2));print('Failures:',json.dumps(fail[:30],indent=2));raise SystemExit(bool(fail))
