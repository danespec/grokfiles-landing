"""Patch only receipt/title data in the existing wiki gateway; preserve guards/config."""
import argparse,ast,copy,hashlib,html,io,json,pathlib,shlex,subprocess,tarfile,time
from bs4 import BeautifulSoup
ROOT=pathlib.Path(__file__).resolve().parents[1]
SSH=['ssh','-o','BatchMode=yes','-o','ConnectTimeout=10','grok-nas'];DOCKER='/usr/local/bin/docker';LIVE='grok_wiki_gateway';STAGE='gah_intel_title_fix_stage_016';PORT=3036
def run(args,data=None,timeout=90):
 r=subprocess.run(SSH+[shlex.join(args)],input=data,capture_output=True,timeout=timeout)
 if r.returncode:raise RuntimeError('Remote operation failed: '+r.stderr.decode(errors='replace')[-400:])
 return r.stdout
def docker(*args,data=None,timeout=90):return run([DOCKER,*args],data,timeout)
def remote(code,data):return json.loads(run(['python3','-c',code],json.dumps(data).encode()))
REMOTE_API="""import sys,json,socket,http.client
x=json.load(sys.stdin)
class C(http.client.HTTPConnection):
 def connect(self):self.sock=socket.socket(socket.AF_UNIX,socket.SOCK_STREAM);self.sock.connect('/var/run/docker.sock')
c=C('localhost',timeout=45);c.request(x['method'],'/v1.41'+x['path'],json.dumps(x['data']).encode() if x.get('data') is not None else None,{'Content-Type':'application/json'});r=c.getresponse();b=r.read();print(json.dumps({'status':r.status,'body':json.loads(b) if b else None}))
"""
def api(method,path,data=None):
 r=remote(REMOTE_API,{'method':method,'path':path,'data':data})
 if r['status']>=300:raise RuntimeError('Docker operation rejected: '+str(r['status']))
 return r['body']
def checked(port,titles):
 code="""import sys,json,urllib.request,html,re,time
x=json.load(sys.stdin);base='http://127.0.0.1:'+str(x['port']);rows=[]
def get(p):
 q=urllib.request.Request(base+p,headers={'Host':'wiki.grokarchivehub.com'})
 with urllib.request.urlopen(q,timeout=30) as r:return r.status,dict(r.headers),r.read().decode()
for n in range(15):
 try:
  status,h,b=get('/');break
 except Exception:
  if n==14:raise
  time.sleep(.5)
for i,t in x['titles'].items():
 status,h,b=get('/receipts/'+i);text=html.unescape(b);assert status==200 and t in text,(i,status);assert 'https://grokarchivehub.com/archive/'+i in b;rows.append({'id':i,'http':status,'corrected_title':True})
status,h,b=get('/');text=html.unescape(b);assert all(t in text for t in x['titles'].values());assert 'no-store' in h.get('Cache-Control','');print(json.dumps({'receipts':rows,'home_labels_correct':True,'private_source_data_exported':False}))
"""
 return remote(code,{'port':port,'titles':titles})
def patch_receipt(text,i,title):
 s=BeautifulSoup(text,'html.parser');s.title.string=i+': '+title+' | Grok Archive Hub';h=s.find('h1')
 if h:h.string=i+' — '+title
 for m in s.select('meta[property="og:title"],meta[name="twitter:title"]'):m['content']=i+' — '+title
 for m in s.select('meta[name="description"],meta[property="og:description"]'):m['content']=i+': '+title+'. Read the source, document context and limits of what this record establishes.'
 for ld in s.select('script[type="application/ld+json"]'):
  try:d=json.loads(ld.string or ld.get_text())
  except (ValueError,TypeError):continue
  if d.get('@type')=='Article':d['headline']=i+' — '+title;d['about']={'@type':'Thing','name':title};ld.string=json.dumps(d,ensure_ascii=False)
 return str(s)
def main():
 p=argparse.ArgumentParser();p.add_argument('--evidence',type=pathlib.Path,required=True);p.add_argument('--promote',action='store_true');p.add_argument('--promote-staged',action='store_true');a=p.parse_args();a.evidence.mkdir(mode=0o700,parents=True,exist_ok=True);a.evidence.chmod(0o700)
 tree=ast.parse((ROOT/'scripts/apply_intel_fix_pack_016.py').read_text());titles=next(ast.literal_eval(n.value) for n in tree.body if isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='TITLES' for t in n.targets))
 files=['identifier-dossiers.json','wiki-home-identifiers.html','content/reader-editorial-metadata.mjs']+['identifier-receipts/'+i+'.html' for i in titles]
 if a.promote_staged:
  before=(a.evidence/'wiki-before.tar').read_bytes();patched=(a.evidence/'wiki-after.tar').read_bytes()
  def members(b):
   with tarfile.open(fileobj=io.BytesIO(b)) as t:return {m.name:hashlib.sha256(t.extractfile(m).read()).hexdigest() for m in t.getmembers() if m.isfile()}
  assert members(docker('exec',LIVE,'tar','-C','/app','-cf','-',*files))==members(before),'Live title data changed since staging; inspect before promotion'
  guards=['server.js','wiki-security-guard.cjs','wiki-service-auth.cjs','wiki-request-limit.cjs','identifier-host-policy.mjs'];guard_before=docker('exec',LIVE,'sha256sum',*['/app/'+g for g in guards]);assert docker('exec',STAGE,'sha256sum',*['/app/'+g for g in guards])==guard_before;checked(PORT,titles);old=json.loads(docker('inspect',LIVE))[0]
  try:
   docker('exec','-i',LIVE,'tar','-C','/app','-xf','-',data=patched);docker('restart',LIVE);result={'live_checks':checked(3015,titles),'guard_files_unchanged':True,'promoted':True,'rollback_tar':'wiki-before.tar'};current=json.loads(docker('inspect',LIVE))[0];assert current['Config']==old['Config'] and current['HostConfig']==old['HostConfig'];assert docker('exec',LIVE,'sha256sum',*['/app/'+g for g in guards])==guard_before;result['deployed_image']=docker('commit','--pause=false',LIVE,'gah-wiki-gateway:intel-title-fixes-20261116',timeout=180).decode().strip()
  except Exception:
   docker('exec','-i',LIVE,'tar','-C','/app','-xf','-',data=before);docker('restart',LIVE);raise
  finally:docker('stop',STAGE)
  (a.evidence/'wiki-release-receipt.json').write_text(json.dumps(result,indent=2));print(json.dumps(result));return
 before=docker('exec',LIVE,'tar','-C','/app','-cf','-',*files);(a.evidence/'wiki-before.tar').write_bytes(before);(a.evidence/'wiki-before.tar').chmod(0o600)
 payload={m.name:tar.extractfile(m).read() for tar in [tarfile.open(fileobj=io.BytesIO(before))] for m in tar.getmembers() if m.isfile()}
 assert set(files)==set(payload)
 reg=json.loads(payload['identifier-dossiers.json'])
 for row in reg['entries']:
  if row['id'] in titles:row['title']=titles[row['id']];row['description']=row['id']+': '+row['title']+'. Read the source, document context and limits of what this record establishes.';row['dateModified']='2026-11-16'
 payload['identifier-dossiers.json']=(json.dumps(reg,ensure_ascii=False,indent=2)+'\n').encode()
 s=BeautifulSoup(payload['wiki-home-identifiers.html'],'html.parser')
 for a1 in s.select('a[href]'):
  for i,t in titles.items():
   if a1['href'].rstrip('/').endswith('/receipts/'+i):a1.string=i+' — '+t
 payload['wiki-home-identifiers.html']=str(s).encode()
 raw=payload['content/reader-editorial-metadata.mjs'].decode();prefix=raw[:raw.index('{')];meta=json.loads(raw[raw.index('{'):].strip().rstrip(';'))
 for i,t in titles.items():
  for url in ['https://wiki.grokarchivehub.com/receipts/'+i]:
   if url in meta:meta[url]['title']=i+': '+t;meta[url]['description']=i+': '+t+'. Read the source, document context and limits of what this record establishes.'
 payload['content/reader-editorial-metadata.mjs']=(prefix+json.dumps(meta,ensure_ascii=False,indent=2)+';\n').encode()
 for i,t in titles.items():payload['identifier-receipts/'+i+'.html']=patch_receipt(payload['identifier-receipts/'+i+'.html'].decode(),i,t).encode()
 out=io.BytesIO()
 with tarfile.open(fileobj=out,mode='w') as tar:
  for name,b in payload.items():m=tarfile.TarInfo(name);m.size=len(b);m.mode=0o644;tar.addfile(m,io.BytesIO(b))
 patched=out.getvalue();(a.evidence/'wiki-after.tar').write_bytes(patched)
 guards=['server.js','wiki-security-guard.cjs','wiki-service-auth.cjs','wiki-request-limit.cjs','identifier-host-policy.mjs']
 guard_before=docker('exec',LIVE,'sha256sum',*['/app/'+g for g in guards]).decode()
 old=json.loads(docker('inspect',LIVE))[0];baseline='gah-wiki-gateway:intel-title-baseline-20261116';docker('commit','--pause=false',LIVE,baseline,timeout=180)
 if subprocess.run(SSH+[shlex.join([DOCKER,'inspect',STAGE])],capture_output=True).returncode==0:raise ValueError('Stage already exists; inspect before reusing')
 c=copy.deepcopy(old['Config']);c['Image']=baseline;c['Hostname']='gah-intel-title-stage';c['Labels']={k:v for k,v in c.get('Labels',{}).items() if not k.startswith('com.docker.compose.')};host=copy.deepcopy(old['HostConfig'])
 assert len(host['PortBindings'])==1
 for bindings in host['PortBindings'].values():
  for b in bindings:assert b['HostIp']=='127.0.0.1';b['HostPort']=str(PORT)
 host['RestartPolicy']={'Name':'no','MaximumRetryCount':0};c['HostConfig']=host;net=list(old['NetworkSettings']['Networks']);assert len(net)==1;c['NetworkingConfig']={'EndpointsConfig':{net[0]:{'Aliases':[STAGE]}}}
 api('POST','/containers/create?name='+STAGE,c);docker('start',STAGE);docker('exec','-i',STAGE,'tar','-C','/app','-xf','-',data=patched);docker('restart',STAGE);stage=checked(PORT,titles)
 assert docker('exec',STAGE,'sha256sum',*['/app/'+g for g in guards]).decode()==guard_before
 result={'stage_checks':stage,'guard_files_unchanged':True,'promoted':False,'rollback_tar':'wiki-before.tar','baseline_image':baseline}
 if a.promote:
  try:
   docker('exec','-i',LIVE,'tar','-C','/app','-xf','-',data=patched);docker('restart',LIVE);result['live_checks']=checked(3015,titles)
   current=json.loads(docker('inspect',LIVE))[0];assert current['Config']==old['Config'] and current['HostConfig']==old['HostConfig'];assert docker('exec',LIVE,'sha256sum',*['/app/'+g for g in guards]).decode()==guard_before
   result['deployed_image']=docker('commit','--pause=false',LIVE,'gah-wiki-gateway:intel-title-fixes-20261116',timeout=180).decode().strip();result['promoted']=True
  except Exception:
   docker('exec','-i',LIVE,'tar','-C','/app','-xf','-',data=before);docker('restart',LIVE);raise
  finally:docker('stop',STAGE)
 (a.evidence/'wiki-release-receipt.json').write_text(json.dumps(result,indent=2));print(json.dumps(result))
if __name__=='__main__':main()
