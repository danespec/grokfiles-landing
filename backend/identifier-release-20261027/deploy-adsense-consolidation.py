from pathlib import Path
import json,subprocess,http.client,socket,copy,re,sys,time,hashlib
root=Path(__file__).parent;D='/usr/local/bin/docker';live='grok_wiki_gateway';preview='gah_adsense_consolidation_eleventh_preview_20261027';backup='grok_wiki_gateway_before_adsense_consolidation_eleventh_20261027';image='gah-wiki-gateway:adsense-consolidation-eleventh-20261027';baseline='1e311e2089ff74aca72579c712991ac3f2a4a188971fc9fa7b1de7667159abd8'
guards=['wiki-security-guard.cjs','wiki-service-auth.cjs','wiki-request-limit.cjs']
codefiles=['content/publication-policy.mjs','pdf-lite.html','server.js', 'identifier-host-policy.mjs', 'reader-quality.mjs','content/reader-editorial-metadata.mjs','content/source-pdf-status.mjs','content/reader-link-aliases.mjs', 'content/reader-page-cards.mjs', 'content/research-route-policy.mjs','topic-pages/sdny-epstein-maxwell-court-filings.html','topic-pages/epstein-victim-services-doj-coordination.html','topic-pages/maxwell-prosecution.html','topic-pages/epstein-victim-notification-vns-sdny-outreach.html', 'research-pages/ehud-barak-epstein-documentary-record.html', 'research-pages/epstein-final-48-hours-mcc.html', 'research-pages/evidence-types.html', 'research-pages/evidence/aircraft-tail-number-epstein.html', 'research-pages/evidence/alias-passenger-epstein.html', 'research-pages/evidence/assistant-travel-schedule-epstein.html', 'research-pages/evidence/bank-records-epstein.html', 'research-pages/evidence/black-book-epstein.html', 'research-pages/evidence/calendar-epstein.html', 'research-pages/evidence/deposition-epstein.html', 'research-pages/evidence/deutsche-bank-epstein.html', 'research-pages/evidence/doj-victim-services.html', 'research-pages/evidence/doj-victim-services-epstein.html', 'research-pages/evidence/driver-transport-epstein.html', 'research-pages/evidence/efta.html', 'research-pages/evidence/ehud-barak.html', 'research-pages/evidence/epstein-death.html', 'research-pages/evidence/fbi-epstein.html', 'research-pages/evidence/flight-logs-epstein.html', 'research-pages/evidence/ghislaine-maxwell.html', 'research-pages/evidence/grand-jury-epstein.html', 'research-pages/evidence/great-saint-james.html', 'research-pages/evidence/invoice-epstein.html', 'research-pages/evidence/jean-luc-brunel.html', 'research-pages/evidence/jeffrey-epstein.html', 'research-pages/evidence/josh-lucas.html', 'research-pages/evidence/jpmorgan-epstein.html', 'research-pages/evidence/leon-black-epstein.html', 'research-pages/evidence/lesley-groff.html', 'research-pages/evidence/leslie-wexner.html', 'research-pages/evidence/little-saint-james.html', 'research-pages/evidence/manhattan-epstein.html', 'research-pages/evidence/maxwell-prosecution.html', 'research-pages/evidence/mc2-epstein.html', 'research-pages/evidence/mcc-epstein-control-spine.html', 'research-pages/evidence/metadata-epstein.html', 'research-pages/evidence/missing-names-phonebook-epstein.html', 'research-pages/evidence/nadia-marcinkova.html', 'research-pages/evidence/new-albany-epstein.html', 'research-pages/evidence/non-prosecution-agreement-epstein.html', 'research-pages/evidence/palm-beach-epstein.html', 'research-pages/evidence/paris-epstein.html', 'research-pages/evidence/phone-message-epstein.html', 'research-pages/evidence/phonebook-alias-epstein.html', 'research-pages/evidence/property-records-epstein.html', 'research-pages/evidence/redacted-epstein.html', 'research-pages/evidence/redacted-names-epstein.html', 'research-pages/evidence/sarah-kellen.html', 'research-pages/evidence/sdny.html', 'research-pages/evidence/sdny-epstein.html', 'research-pages/evidence/sdny-epstein-maxwell-court-filings.html', 'research-pages/evidence/sealed-redacted-epstein.html', 'research-pages/evidence/sharepoint-coordination.html', 'research-pages/evidence/sharepoint-coordination-epstein.html', 'research-pages/evidence/sharepoint-epstein-support.html', 'research-pages/evidence/shell-company-epstein.html', 'research-pages/evidence/source-card-efta00067364-calendar-epstein.html', 'research-pages/evidence/source-card-efta00082040-black-book-epstein.html', 'research-pages/evidence/source-card-efta00095936.html', 'research-pages/evidence/suppression-redaction-epstein.html', 'research-pages/evidence/tel-aviv-epstein.html', 'research-pages/evidence/unredacted-flight-log-epstein.html', 'research-pages/evidence/verified-source-cards.html', 'research-pages/evidence/victim-notification.html', 'research-pages/evidence/victim-notification-epstein.html', 'research-pages/evidence/victim-services-coordination-epstein.html', 'research-pages/evidence/vns-sdny-outreach-epstein.html', 'research-pages/evidence/vns-victim-notification.html', 'research-pages/evidence/vns-victim-notification-epstein.html', 'research-pages/evidence/wire-transfer-epstein.html', 'research-pages/evidence/zorro-ranch.html', 'research-pages/financial-logistics.html', 'research-pages/legal-records.html', 'research-pages/open-leads.html', 'research-pages/organizations.html', 'research-pages/people.html', 'research-pages/places.html', 'research-pages/trump-epstein-documented-timeline.html']
def run(a,timeout=90):
 p=subprocess.run([D,*a],capture_output=True,text=True,timeout=timeout)
 if p.returncode:raise RuntimeError('docker '+a[0]+' failed: '+p.stderr[-200:])
 return p.stdout.strip()
def inspect(n):return json.loads(run(['inspect',n]))[0]
def fingerprints(name,files):return {f:run(['exec',name,'sha256sum','/app/'+f]).split()[0] for f in files}
def exists(name):return subprocess.run([D,'inspect',name],capture_output=True).returncode==0
class Docker(http.client.HTTPConnection):
 def __init__(self):super().__init__('localhost',timeout=30)
 def connect(self):self.sock=socket.socket(socket.AF_UNIX,socket.SOCK_STREAM);self.sock.settimeout(30);self.sock.connect('/var/run/docker.sock')
def api(method,path,data=None):
 c=Docker();c.request(method,'/v1.41'+path,body=json.dumps(data) if data is not None else None,headers={'Content-Type':'application/json'});r=c.getresponse();b=r.read();status=r.status;c.close()
 if status>=300:raise RuntimeError('Docker API '+method+' '+str(status))
 return json.loads(b) if b else None
def clone(old,name,port,temporary):
 c=copy.deepcopy(old['Config']);c['Image']=image;c['Hostname']='adsense-consolidation-eleventh';c['Labels']={k:v for k,v in c.get('Labels',{}).items() if not k.startswith('com.docker.compose.')}
 h=copy.deepcopy(old['HostConfig'])
 for bindings in h['PortBindings'].values():
  for item in bindings:assert item['HostIp']=='127.0.0.1' and item['HostPort']=='3015';item['HostPort']=str(port)
 if temporary:h['RestartPolicy']={'Name':'no','MaximumRetryCount':0}
 c['HostConfig']=h;net=list(old['NetworkSettings']['Networks']);assert len(net)==1
 c['NetworkingConfig']={'EndpointsConfig':{net[0]:{'Aliases':[name] if temporary else old['NetworkSettings']['Networks'][net[0]].get('Aliases',[])}}}
 return api('POST','/containers/create?name='+name,c)['Id']
def get(port,path,method='GET'):
 c=http.client.HTTPConnection('127.0.0.1',port,timeout=65);c.request(method,path,headers={'Host':'wiki.grokarchivehub.com'});r=c.getresponse();b=r.read();s=r.status;h=dict(r.getheaders());c.close();return s,{k.lower():v for k,v in h.items()},b.decode('utf8',errors='replace')
def ready(port):
 for attempt in range(20):
  try:
   if get(port,'/')[0]==200:return
  except (OSError,http.client.HTTPException):pass
  time.sleep(.5)
 raise RuntimeError('Gateway did not become ready')
reg=json.loads((root/'identifier-dossiers.json').read_text())
publication=json.loads((root/'content/publication-policy.mjs').read_text().split('=',1)[1].strip().rstrip(';'))
def check(port):
 ready(port)
 for e in reg['entries']:
  s,h,b=get(port,'/receipts/'+e['id']);assert s==200,e['id'];assert h['x-robots-tag']=='noindex,follow';assert 'content="noindex,follow"' in b;assert e['id'] in b
  assert '<link rel="canonical" href="'+publication['https://wiki.grokarchivehub.com/receipts/'+e['id']]['canonical']+'">' in b
  if e.get('sourceSha256'):assert e['sourceSha256'] in b
 for path in ['/','/archive','/research-index']:
  s,h,b=get(port,path);assert s==200;assert '"CollectionPage"' in b;assert 'property="og:image"' in b;assert 'href="/grok-command-v4"' not in b;assert '<meta name="robots" content="noindex,follow">' in b;assert 'https://wiki.grokarchivehub.com'+path in b
 s,h,b=get(port,'/research/evidence/black-book-epstein');assert s==200;assert h['x-robots-tag']=='noindex,follow';assert '<meta name="robots" content="noindex,follow">' in b;assert b.count('Official DOJ PDF')==80;assert b.count('<strong>EFTA')==83;assert not re.search(r'href="[^"]*/archive/EFTA',b);assert not any(x in b for x in ['ASCEND','Meili status','Audit Metadata']);assert 'Epstein contact-book source guide | Grok Archive Hub' in b
 for path in ['/archive/foo','/not-a-real-gah-page']:
  s,h,b=get(port,path);assert s==404,(path,s);assert 'Page not found | Grok Archive Hub' in b;assert 'Semantic AI' not in b;assert h.get('x-robots-tag')=='noindex,follow'
 s,h,b=get(port,'/pdf-lite?id=ZZZ');assert s==404
 s,h,b=get(port,'/pdf-lite?id=EFTA00356456');assert s==200;assert not re.search(r'<!--[\s\S]*?GROK_',b)
 s,h,b=get(port,'/sitemap.xml');assert s==200;assert b.count('<loc>')==2;assert '/receipts/EFTA' not in b
 for route in json.loads((root/'research-routes.json').read_text()):
  status,headers,body=get(port,route['path'])
  if route['owner']=='main':
   assert status==301 and headers.get('location')=='https://grokarchivehub.com'+route['path'],route['path']
  else:
   assert status==200,route['path']
   expected='index,follow' if route['indexable'] else 'noindex,follow'
   assert headers.get('x-robots-tag')==expected,route['path']
   assert '<meta name="robots" content="'+expected+'">' in body,route['path']
   visible=re.sub(r'<(?:script|style)\b[^>]*>[\s\S]*?</(?:script|style)>','',body,flags=re.I)
   visible=re.sub(r'<[^>]+>',' ',visible)
   assert not re.search(r'GAH-SEO|DOMINANCE-\d|REPAIR-\d|TASK-TRUMP|ASCEND|Build marker|Build: GAH',visible,re.I),route['path']
 for slug in ['maxwell-prosecution','epstein-victim-services-doj-coordination','epstein-victim-notification-vns-sdny-outreach','sdny-epstein-maxwell-court-filings']:
  status,headers,body=get(port,'/topics/'+slug);assert status==200 and headers.get('x-robots-tag')=='noindex,follow';assert 'content="noindex,follow"' in body
 body=get(port,'/research/trump-epstein-documented-timeline')[2]
 assert not re.search(r'SUPERMATRIX|row_4679|R00[1-9]|C00[1-3]|SILENCE_MAP|FLIGHT_COUNT|repaired TSV',body)
 assert get(port,'/api/search','POST')[0]==401
 assert get(port,'/api/resolve?id=EFTA00000468')[0]==200
 assert get(port,'/topics')[1].get('location')=='https://grokarchivehub.com/topics'
 assert 'indexable source page' not in get(port,'/receipts/EFTA02858491')[2]
 for id in ['EFTA00035147','EFTA00039416','EFTA00039660']:
  e=next(e for e in reg['entries'] if e['id']==id);assert id in re.search(r'<h1[^>]*>([\s\S]*?)</h1>',get(port,'/receipts/'+id)[2])[1]
 return {'receiptCards':69,'wikiHubSchemas':3,'blackBookIds':83,'blackBookOfficialLinks':80,'blackBookUnconfirmedIds':3,'blackBookNoindexConsistent':True,'generic404sBranded':2,'sitemapUrls':2,'protectedApi':401,'publicResolver':200}
if sys.argv[1]=='prepare':
 assert not exists(preview)
 old=inspect(live);assert old['State']['Running'];assert fingerprints(live,['server.js'])['server.js']==baseline
 before=fingerprints(live,guards);snap='gah-wiki-gateway:before-adsense-consolidation-eleventh-20261027';
 with (root/'running-filesystem.tar').open('wb') as output:
  exported=subprocess.run([D,'export',live],stdout=output,stderr=subprocess.PIPE);assert exported.returncode==0,exported.stderr[-300:]
 run(['import',str(root/'running-filesystem.tar'),snap],180)
 (root/'Dockerfile').write_text('FROM '+snap+'\nCOPY server.js identifier-host-policy.mjs identifier-dossiers.json wiki-home-identifiers.html black-book-source-guide.html research-index.html reader-quality.mjs /app/\nCOPY content/reader-page-cards.mjs /app/content/reader-page-cards.mjs\nCOPY identifier-receipts/ /app/identifier-receipts/\n')
 import tarfile,io
 replacements={('app/'+f):root/f for f in ['server.js','identifier-host-policy.mjs','identifier-dossiers.json','wiki-home-identifiers.html','black-book-source-guide.html','research-index.html','reader-quality.mjs','content/reader-page-cards.mjs']}
 replacements.update({('app/identifier-receipts/'+p.name):p for p in (root/'identifier-receipts').glob('*.html')})
 replacements.update({('app/'+f):root/f for f in codefiles})
 with tarfile.open(root/'running-filesystem.tar','r') as src,tarfile.open(root/'patched-filesystem.tar','w') as dst:
  for member in src:
   key=member.name.lstrip('./')
   if key in replacements:
    data=replacements.pop(key).read_bytes();member.size=len(data);dst.addfile(member,io.BytesIO(data))
   else:dst.addfile(member,src.extractfile(member) if member.isfile() else None)
  for name,p in replacements.items():
   data=p.read_bytes();member=tarfile.TarInfo(name);member.size=len(data);member.mode=0o644;dst.addfile(member,io.BytesIO(data))
 run(['import',str(root/'patched-filesystem.tar'),image],180);newId=clone(old,preview,3019,True);api('POST','/containers/'+newId+'/start');proof=check(3019)
 assert before==fingerprints(preview,guards)
 after=fingerprints(preview,codefiles)
 for f,v in after.items():assert hashlib.sha256((root/f).read_bytes()).hexdigest()==v
 new=inspect(preview);assert old['Config']['Env']==new['Config']['Env'];assert old['Mounts']==new['Mounts']
 record={'oldImage':old['Image'],'newImage':new['Image'],'snapshot':snap,'guards':before,'sourceBefore':baseline,'codeAfter':after,'preview':proof};(root/'prepared.json').write_text(json.dumps(record,indent=2)+'\n');print(json.dumps(record))
elif sys.argv[1]=='cutover':
 old=inspect(live);proof=json.loads((root/'prepared.json').read_text());assert old['Image']==proof['oldImage'];assert check(3019);assert not exists(backup)
 assert fingerprints(live,guards)==proof['guards'];assert fingerprints(live,['server.js'])['server.js']==baseline
 name='gah_adsense_consolidation_eleventh_candidate_20261027';assert not exists(name);newId=clone(old,name,3015,False);candidate=inspect(name)
 assert candidate['HostConfig']==old['HostConfig'];assert candidate['Config']['Env']==old['Config']['Env'];assert candidate['Mounts']==old['Mounts']
 compose=Path('/volume1/docker/gah-wiki-gateway/compose.yaml');original=compose.read_bytes();(root/'compose.before.yaml').write_bytes(original);text,n=re.subn(r'(?m)^(\s*image:\s*)gah-wiki-gateway:asset-identity-tenth-20261027\s*$',lambda m:m[1]+image,original.decode());assert n==1
 swapped=False
 try:
  run(['rename',live,backup]);run(['stop',backup]);run(['rename',name,live]);swapped=True;run(['start',live]);actual=check(3015);compose.write_text(text)
  assert fingerprints(live,guards)==proof['guards'];assert fingerprints(live,codefiles)==proof['codeAfter']
  record={'image':proof['newImage'],'tag':image,'rollbackContainer':backup,'production':actual,'securityAuthRateLimitGuardsUnchanged':True,'codeAfter':proof['codeAfter']};(root/'production.json').write_text(json.dumps(record,indent=2)+'\n');run(['stop',preview]);print(json.dumps(record))
 except Exception:
  compose.write_bytes(original)
  if swapped:run(['stop',live]);run(['rename',live,name+'_failed'])
  run(['rename',backup,live]);run(['start',live]);raise
