from pathlib import Path
import subprocess,json,re,hashlib,concurrent.futures,xml.etree.ElementTree as ET,sys
from urllib.parse import urlsplit,urljoin
from bs4 import BeautifulSoup
repo=Path(__file__).resolve().parents[1];out=Path(sys.argv[1]).resolve();out.mkdir(parents=True,exist_ok=True)
def get(url):
 p=subprocess.run(['curl','-sS','--max-time','35','-D','-',url],capture_output=True,text=True)
 head,_,body=p.stdout.partition('\n\n')
 status=re.search(r'^HTTP/\S+ (\d+)',head,re.M)
 headers={k.lower():v.strip() for k,v in re.findall(r'^([^:\n]+):\s*(.*)$',head,re.M)}
 return int(status[1]) if status else 0,headers,body
def urls_from_sitemap(url):
 st,h,b=get(url);assert st==200,(url,st)
 return [n.text for n in ET.fromstring(b).iter() if n.tag.endswith('}loc')]
urls=[]
for u in ['https://grokarchivehub.com/sitemap.xml','https://grokarchivehub.com/sitemap-efta.xml','https://wiki.grokarchivehub.com/sitemap.xml']:urls+=urls_from_sitemap(u)
urls+=['https://wiki.grokarchivehub.com/research/evidence/black-book-epstein','https://grokarchivehub.com/archive/foo','https://grokarchivehub.com/not-a-real-gah-page','https://wiki.grokarchivehub.com/not-a-real-gah-page','https://grokarchivehub.com/sitemap-archive.xml','https://grokarchivehub.com/barak/entities']
reg=json.loads((repo/'content/identifier-dossiers.json').read_text());published={e['id'] for e in reg['entries'] if e['indexable']}
def collect(url):
 st,h,b=get(url);key=hashlib.sha256(url.encode()).hexdigest()[:20];(out/(key+'.html')).write_text(b)
 soup=BeautifulSoup(b,'html.parser');main=soup.find('main') or soup
 def meta(attr,value):
  x=soup.find('meta',attrs={attr:value});return x.get('content','') if x else ''
 canon=soup.find('link',rel='canonical')
 links=[urljoin(url,a['href']) for a in soup.find_all('a',href=True)]
 schemas=[];invalid=0
 for x in soup.find_all('script',type='application/ld+json'):
  try:
   z=json.loads(x.string or x.get_text());nodes=z if isinstance(z,list) else z.get('@graph',[z]);schemas += [n.get('@type') for n in nodes if isinstance(n,dict)]
  except Exception:invalid+=1
 visible=main.get_text(' ',strip=True);ids=set(re.findall(r'EFTA\d{8}',visible))
 linked={m[1] for link in links if (m:=re.search(r'/archive/(EFTA\d{8})(?:$|[?#])',link))}
 return {'url':url,'status':st,'cache':h.get('cf-cache-status'),'age':h.get('age'),'location':h.get('location'),'title':soup.title.get_text(strip=True) if soup.title else '', 'robots':meta('name','robots'),'robotsHeader':h.get('x-robots-tag',''),'localRobots':h.get('x-robots-tag',''),'canonical':canon.get('href','') if canon else '', 'ogTitle':meta('property','og:title'),'ogImage':meta('property','og:image'),'schemas':schemas,'invalidSchemas':invalid,'headings':[(x.name,x.get_text(' ',strip=True)) for x in main.find_all(re.compile('^h[1-6]$'))],'links':links,'idsNamed':sorted(ids),'publishedIdsWithoutLinks':sorted((ids & published)-linked),'html':key+'.html'}
with concurrent.futures.ThreadPoolExecutor(5) as pool:rows=list(pool.map(collect,dict.fromkeys(urls)))
(out/'pages.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n')
print('Captured',len(rows),'routes;',sum(bool(x['publishedIdsWithoutLinks']) for x in rows),'pages name published IDs without dossier links;',sum(x['invalidSchemas'] for x in rows),'invalid schemas.')
targets=sorted({u for x in rows for u in x['links'] if urlsplit(u).hostname in ['grokarchivehub.com','wiki.grokarchivehub.com'] and re.search(r'/archive/EFTA\d{8}',u)})
existing={x['url']:x for x in rows}
def resolve(u):
 if u in existing:
  x=existing[u];return {'url':u,'status':x['status'],'robotsHeader':x['robotsHeader']}
 st,h,b=get(u);return {'url':u,'status':st,'location':h.get('location'),'robotsHeader':h.get('x-robots-tag','')}
with concurrent.futures.ThreadPoolExecutor(5) as pool:resolved=list(pool.map(resolve,targets))
(out/'identifier-links.json').write_text(json.dumps(resolved,indent=2)+'\n')
print('Resolved',len(resolved),'identifier links;',sum(x['status']==404 for x in resolved),'404s;',sum('noindex' in x.get('robotsHeader','') for x in resolved),'noindex targets.')

# Canonical public URLs are intentional: cache-busting is not acceptance.
images=sorted({x['ogImage'] for x in rows if x['status']==200 and x['ogImage']})
def image_head(url):
 p=subprocess.run(['curl','-sS','--head','--max-time','35',url],capture_output=True,text=True)
 statuses=re.findall(r'^HTTP/\S+ (\d+)',p.stdout,re.M);ctype=re.search(r'^content-type:\s*(.*)',p.stdout,re.M|re.I)
 return {'url':url,'status':int(statuses[-1]) if statuses else 0,'type':ctype[1].strip() if ctype else ''}
with concurrent.futures.ThreadPoolExecutor(5) as pool:ir=list(pool.map(image_head,images))
(out/'image-heads.json').write_text(json.dumps(ir,indent=2)+'\n')
probes=[]
for host,path,want,location in [
 ('grokarchivehub.com','/archive/efta00013764',301,'https://grokarchivehub.com/archive/EFTA00013764'),
 ('grokarchivehub.com','/archive/EFTA13764',301,'https://grokarchivehub.com/archive/EFTA00013764'),
 ('grokarchivehub.com','/archive/Efta00013764',301,'https://grokarchivehub.com/archive/EFTA00013764'),
 ('grokarchivehub.com','/archive/EFTA00013764/',301,'https://grokarchivehub.com/archive/EFTA00013764'),
 ('wiki.grokarchivehub.com','/archive/efta00013764',301,'https://grokarchivehub.com/archive/EFTA00013764'),
 ('wiki.grokarchivehub.com','/methodology',301,'https://grokarchivehub.com/methodology'),
 ('wiki.grokarchivehub.com','/barak',301,'https://grokarchivehub.com/barak'),
 ('wiki.grokarchivehub.com','/dispatches/barak-archive',301,'https://grokarchivehub.com/barak'),
 ('grokarchivehub.com','/wiki',301,'https://wiki.grokarchivehub.com/'),
 ('grokarchivehub.com','/grok-command-v4',301,'https://wiki.grokarchivehub.com/'),
 ('wiki.grokarchivehub.com','/grok-command-v4',301,'https://wiki.grokarchivehub.com/'),
 ('grokarchivehub.com','/sitemap-archive.xml',301,'https://grokarchivehub.com/sitemap-efta.xml'),
 ('grokarchivehub.com','/research/evidence/black-book-epstein',301,'https://wiki.grokarchivehub.com/research/evidence/black-book-epstein'),
 ('grokarchivehub.com','/archive/EFTA99999999',404,None),
 ('wiki.grokarchivehub.com','/receipts/EFTA99999999',404,None)]:
 u='https://'+host+path;st,h,b=get(u);probes.append({'url':u,'status':st,'location':h.get('location'),'expectedStatus':want,'expectedLocation':location,'passed':st==want and (location is None or h.get('location')==location)})
(out/'probes.json').write_text(json.dumps(probes,indent=2)+'\n')
robots=[]
for host in ['grokarchivehub.com','wiki.grokarchivehub.com']:
 st,h,b=get('https://'+host+'/robots.txt');(out/(host+'-robots.txt')).write_text(b)
 robots.append({'host':host,'status':st,'wildcardGroups':len(re.findall(r'^User-agent:\s*\*\s*$',b,re.I|re.M)),'sitemaps':re.findall(r'^Sitemap:\s*(.*)',b,re.I|re.M)})
(out/'robots.json').write_text(json.dumps(robots,indent=2)+'\n')
print('Images',len(ir),'failed',sum(x['status']!=200 or not x['type'].startswith('image/') for x in ir),'redirect probes',len(probes),'failed',sum(not x['passed'] for x in probes),'robots',json.dumps(robots))
