from pathlib import Path
import json,subprocess,http.client,socket,copy,re,sys,time,hashlib
root=Path(__file__).parent;D='/usr/local/bin/docker';live='grok_wiki_gateway';preview='gah_full_reaudit_preview_20261027';backup='grok_wiki_gateway_before_full_reaudit_20261027';image='gah-wiki-gateway:full-reaudit-20261027';baseline='8738e90b8cc7a8fbbb938729f76359c77b860bcaa83abad96faf0655ba2e8ba9'
guards=['wiki-security-guard.cjs','wiki-service-auth.cjs','wiki-request-limit.cjs']
codefiles=['server.js','identifier-host-policy.mjs','reader-quality.mjs','content/reader-page-cards.mjs']
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
 c=copy.deepcopy(old['Config']);c['Image']=image;c['Hostname']='full-reaudit';c['Labels']={k:v for k,v in c.get('Labels',{}).items() if not k.startswith('com.docker.compose.')}
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
def check(port):
 ready(port)
 for e in reg['entries']:
  s,h,b=get(port,'/receipts/'+e['id']);assert s==200,e['id'];assert ('noindex' in h['x-robots-tag'])!=e['indexable'];assert ('content="noindex,follow"' in b)!=e['indexable'];assert 'https://grokarchivehub.com/archive/'+e['id'] in b
  if e.get('sourceSha256'):assert e['sourceSha256'] in b
 for path in ['/','/archive','/research-index']:
  s,h,b=get(port,path);assert s==200;assert '"CollectionPage"' in b;assert 'property="og:image"' in b;assert 'href="/grok-command-v4"' not in b;assert '<meta name="robots" content="index,follow">' in b;assert 'https://wiki.grokarchivehub.com'+path in b
 s,h,b=get(port,'/research/evidence/black-book-epstein');assert s==200;assert h['x-robots-tag']=='noindex,follow';assert '<meta name="robots" content="noindex,follow">' in b;assert b.count('Official DOJ PDF')==80;assert b.count('<strong>EFTA')==83;assert not re.search(r'href="[^"]*/archive/EFTA',b);assert not any(x in b for x in ['ASCEND','Meili status','Audit Metadata']);assert 'Epstein contact-book source guide | Grok Archive Hub' in b
 for path in ['/archive/foo','/not-a-real-gah-page']:
  s,h,b=get(port,path);assert s==404,(path,s);assert 'Page not found | Grok Archive Hub' in b;assert 'Semantic AI' not in b;assert h.get('x-robots-tag')=='noindex,follow'
 s,h,b=get(port,'/sitemap.xml');assert s==200;assert b.count('<loc>')==72
 assert get(port,'/api/search','POST')[0]==401
 assert get(port,'/api/resolve?id=EFTA00000468')[0]==200
 return {'receiptCards':69,'wikiHubSchemas':3,'blackBookIds':83,'blackBookOfficialLinks':80,'blackBookUnconfirmedIds':3,'blackBookNoindexConsistent':True,'generic404sBranded':2,'sitemapUrls':72,'protectedApi':401,'publicResolver':200}
if sys.argv[1]=='prepare':
 assert not exists(preview)
 old=inspect(live);assert old['State']['Running'];assert fingerprints(live,['server.js'])['server.js']==baseline
 before=fingerprints(live,guards);snap='gah-wiki-gateway:before-full-reaudit-20261027';run(['commit','--pause=false',live,snap])
 (root/'Dockerfile').write_text('FROM '+snap+'\nCOPY server.js identifier-host-policy.mjs identifier-dossiers.json wiki-home-identifiers.html black-book-source-guide.html research-index.html reader-quality.mjs /app/\nCOPY content/reader-page-cards.mjs /app/content/reader-page-cards.mjs\nCOPY identifier-receipts/ /app/identifier-receipts/\n')
 run(['build','--network=none','-t',image,str(root)],180);newId=clone(old,preview,3019,True);api('POST','/containers/'+newId+'/start');proof=check(3019)
 assert before==fingerprints(preview,guards)
 after=fingerprints(preview,codefiles)
 for f,v in after.items():assert hashlib.sha256((root/f).read_bytes()).hexdigest()==v
 new=inspect(preview);assert old['Config']['Env']==new['Config']['Env'];assert old['Mounts']==new['Mounts']
 record={'oldImage':old['Image'],'newImage':new['Image'],'snapshot':snap,'guards':before,'sourceBefore':baseline,'codeAfter':after,'preview':proof};(root/'prepared.json').write_text(json.dumps(record,indent=2)+'\n');print(json.dumps(record))
elif sys.argv[1]=='cutover':
 old=inspect(live);proof=json.loads((root/'prepared.json').read_text());assert old['Image']==proof['oldImage'];assert check(3019);assert not exists(backup)
 assert fingerprints(live,guards)==proof['guards'];assert fingerprints(live,['server.js'])['server.js']==baseline
 name='gah_full_reaudit_candidate_20261027';assert not exists(name);newId=clone(old,name,3015,False);candidate=inspect(name)
 assert candidate['HostConfig']==old['HostConfig'];assert candidate['Config']['Env']==old['Config']['Env'];assert candidate['Mounts']==old['Mounts']
 compose=Path('/volume1/docker/gah-wiki-gateway/compose.yaml');original=compose.read_bytes();(root/'compose.before.yaml').write_bytes(original);text,n=re.subn(r'(?m)^(\s*image:\s*)gah-wiki-gateway:final-holds-20261027\s*$',lambda m:m[1]+image,original.decode());assert n==1
 swapped=False
 try:
  run(['rename',live,backup]);run(['stop',backup]);run(['rename',name,live]);swapped=True;run(['start',live]);actual=check(3015);compose.write_text(text)
  assert fingerprints(live,guards)==proof['guards'];assert fingerprints(live,codefiles)==proof['codeAfter']
  record={'image':proof['newImage'],'tag':image,'rollbackContainer':backup,'production':actual,'securityAuthRateLimitGuardsUnchanged':True,'codeAfter':proof['codeAfter']};(root/'production.json').write_text(json.dumps(record,indent=2)+'\n');run(['stop',preview]);print(json.dumps(record))
 except Exception:
  compose.write_bytes(original)
  if swapped:run(['stop',live]);run(['rename',live,name+'_failed'])
  run(['rename',backup,live]);run(['start',live]);raise
