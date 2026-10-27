from pathlib import Path
from urllib.parse import urlsplit,urlunsplit,urljoin,unquote
from datetime import datetime,timezone
from concurrent.futures import ThreadPoolExecutor
from collections import Counter
from bs4 import BeautifulSoup
import subprocess,json,re,hashlib,sys,xml.etree.ElementTree as ET
repo=Path(__file__).resolve().parents[1];out=Path(sys.argv[1]);out.mkdir(parents=True,exist_ok=True);artifact=Path(sys.argv[2]) if len(sys.argv)>2 else repo
research=json.loads((repo/'content/research-route-policy.mjs').read_text().removeprefix('export const RESEARCH_ROUTES = ').strip().removesuffix(';'))
hosts={'grokarchivehub.com','wiki.grokarchivehub.com'}
ids={e['id'] for e in json.loads((repo/'content/identifier-dossiers.json').read_text())['entries'] if e['indexable']}
skipped=Counter();limit=2000
def normal(href,base='https://grokarchivehub.com/'):
 u=urlsplit(urljoin(base,href))
 if u.scheme not in ['http','https'] or u.hostname not in hosts:return None
 path=re.sub('/+','/',u.path) or '/'
 if path in ['/newsletter-unsubscribe','/newsletter/unsubscribe']:skipped['action_endpoint']+=1;return None
 if any(path.startswith(p) for p in ['/api/','/auth/','/admin/','/assets/','/pdfjs/','/evidence-data/','/source-renders/','/research-heroes/','/staging/','/frozen-assets/','/cdn-cgi/','/book-of-black/api/']):
  skipped['asset_api_or_protected_prefix']+=1;return None
 if re.search(r'\.[a-zA-Z0-9]{1,8}$',path) and not path.endswith('.html'):skipped['non_html_file']+=1;return None
 m=re.match(r'^/(?:archive|receipts)/(EFTA\d{8})/?$',path)
 if m and m[1] not in ids:skipped['unreviewed_corpus_record']+=1;return None
 return urlunsplit(('https',u.hostname,path,'',''))
seeds=set();sitemap_urls=set()
for site in ['https://grokarchivehub.com/sitemap.xml','https://grokarchivehub.com/sitemap-efta.xml','https://wiki.grokarchivehub.com/sitemap.xml']:
 xml=subprocess.check_output(['curl','-fsS','--connect-timeout','8','--max-time','30',site],text=True)
 for e in ET.fromstring(xml).iter():
  if e.tag.endswith('}loc') and e.text:sitemap_urls.add(e.text)
for u in sitemap_urls:
 if (url:=normal(u)):seeds.add(url)
for p in artifact.rglob('*.html'):
 path=p.relative_to(artifact).as_posix()
 if any(part in p.relative_to(artifact).parts for part in ['backend','docs','tests','node_modules','.git','staging','frozen-assets']):continue
 path='/' if path=='index.html' else '/'+path.removesuffix('.html')
 if (u:=normal(path)):seeds.add(u)
for route in research:seeds.update('https://'+host+route['path'] for host in hosts)
policy={'/editorial-policy','/corrections','/book-of-black','/book-of-black/methodology','/privacy'}
pattern=re.compile(r'GAH-(?:SEO|EPSTEIN|GROK|COMMUNITY|[A-Z]+-REPAIR)|DOMINANCE-\d|REPAIR-\d|DEPLOYED_PASS|Manifest build|Build marker|Build:\s*GAH|TASK-\d|TASK-TRUMP|ASCEND|noindex|indexable|closeout',re.I)
def fetch(url):
 key=hashlib.sha256(url.encode()).hexdigest()[:20];header=out/(key+'.headers');body=out/(key+'.html')
 p=subprocess.run(['curl','-sS','--connect-timeout','8','--max-time','30','--max-filesize','4000000','-D',str(header),'-o',str(body),'-w','%{http_code}',url],capture_output=True,text=True)
 raw=header.read_text(errors='replace') if header.exists() else '';h={k.strip().lower():v.strip() for line in raw.splitlines() if ':' in line for k,v in [line.split(':',1)]}
 row={'url':url,'status':int(p.stdout) if p.stdout.isdigit() else 0,'type':h.get('content-type',''),'cache':h.get('cf-cache-status'),'age':h.get('age'),'robotsHeader':h.get('x-robots-tag',''),'location':h.get('location'),'html':body.name,'links':[],'jargon':[],'error':p.stderr.strip()}
 if row['location']:
  if (u:=normal(row['location'],url)):row['links'].append(u)
 if 'text/html' in row['type'] and body.exists() and row['status']==200:
  s=BeautifulSoup(body.read_text(errors='replace'),'html.parser');row['title']=s.title.get_text(' ',strip=True) if s.title else ''
  can=s.find('link',rel='canonical');row['canonical']=urljoin(url,can.get('href','')) if can else None
  rob=s.find('meta',attrs={'name':'robots'});row['robotsMeta']=rob.get('content','') if rob else ''
  row['links']=sorted({x for a in s.find_all('a',href=True) if (x:=normal(a['href'],url))})
  for n in s.find_all(['script','style','textarea','pre']):n.decompose()
  text=(s.body or s).get_text(' ',strip=True)
  text+=' '+' '.join(n.get('content','') for n in s.find_all('meta') if (n.get('name') or n.get('property')) in ['description','og:description','twitter:description','og:title','twitter:title'])
  if urlsplit(url).path not in policy:row['jargon']=sorted(set(m[0] for m in pattern.finditer(text)))
 return row
seen=set();pending=seeds;rows=[]
while pending:
 batch=sorted(pending-seen)
 if len(seen)+len(batch)>limit:raise RuntimeError('Graph exceeded explicit limit; inspect frontier rather than claiming completion')
 if not batch:break
 with ThreadPoolExecutor(max_workers=8) as pool:results=list(pool.map(fetch,batch))
 rows.extend(results);seen.update(batch);pending={u for r in results for u in r['links'] if u not in seen}
 (out/'pages.json').write_text(json.dumps(sorted(rows,key=lambda r:r['url']),indent=2)+'\n')
 print(json.dumps({'checked':len(seen),'frontier':len(pending),'unexpectedJargon':sum(bool(r['jargon']) for r in rows)}),flush=True)
missing=[r['url'] for r in rows if r['status']==200 and 'text/html' in r['type'] and r.get('canonical')==r['url'] and 'noindex' not in (r.get('robotsMeta','')+r.get('robotsHeader','')).lower() and r['url'] not in sitemap_urls]
http_failures=[{'url':r['url'],'status':r['status']} for r in rows if r['status'] not in [200,301,302] and urlsplit(r['url']).path not in ['/archive/foo','/not-a-real-gah-page']]
report={'checkedAt':datetime.now(timezone.utc).isoformat(),'sitemapRoutes':len(sitemap_urls),'indexableRoutesMissingFromSitemaps':missing,'unexpectedHttpFailures':http_failures,'seedRoutes':len(seeds),'checkedRoutes':len(rows),'html200':sum(r['status']==200 and 'text/html' in r['type'] for r in rows),'jargonPages':[{k:r[k] for k in ['url','jargon','canonical','robotsHeader','robotsMeta']} for r in rows if r['jargon']],'responseCounts':dict(Counter(r['status'] for r in rows)),'skipped':dict(skipped),'scope':'Main and wiki HTML linked graph plus deployed HTML and the complete research-route registry; APIs, authentication/unsubscribe actions, assets, protected staging, non-HTML files and unreviewed corpus-record URLs excluded.'}
(out/'summary.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps({k:v for k,v in report.items() if k!='jargonPages'},indent=2))
raise SystemExit(bool(report['jargonPages'] or missing or http_failures))
