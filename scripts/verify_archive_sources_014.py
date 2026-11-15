"""Read already-published source URLs; hash bytes only. Never admits a record."""
import pathlib,json,subprocess,tempfile,hashlib,os,urllib.parse,sys
from archive_admission_014 import ROOT,write_private
PUBLIC_HOSTS={'www.justice.gov','justice.gov','media-cdn.rollcall.com','storage.courtlistener.com'}
def approved_url(url):
 try:
  u=urllib.parse.urlsplit(url)
  return u.scheme=='https' and u.hostname in PUBLIC_HOSTS and u.port in [None,443] and not u.username and not u.password and not u.fragment
 except (ValueError,TypeError):return False
def objects(v):
 if isinstance(v,dict):
  yield v
  for x in v.values():yield from objects(x)
 elif isinstance(v,list):
  for x in v:yield from objects(x)
def main():
 ev=pathlib.Path(sys.argv[1]).resolve()
 if ev==ROOT or ROOT in ev.parents:raise ValueError('Use private evidence outside checkout')
 ledger=json.loads((ev/'archive-fingerprint-reconciliation.private.json').read_text())
 rows=[]
 for item in ledger['records']:
  if not item['fingerprints']:continue
  refs=item['fingerprints'];hashes={x['sha256'] for x in refs}
  if len(hashes)!=1:rows.append({'id':item['id'],'status':'conflict_hold'});continue
  ref=refs[0];manifest=(ROOT/ref['manifest']).resolve()
  if ROOT not in manifest.parents:raise ValueError('Manifest outside checkout')
  choices=[x for x in objects(json.loads(manifest.read_text())) if x.get('id')==ref['source_id'] and x.get('sha256')==ref['sha256']]
  if len(choices)!=1:rows.append({'id':item['id'],'status':'ambiguous_source_hold'});continue
  url=choices[0].get('url','')
  if not url:rows.append({'id':item['id'],'status':'missing_source_url_hold'});continue
  u=urllib.parse.urlsplit(url)
  if not approved_url(url):rows.append({'id':item['id'],'status':'source_not_allowlisted_hold'});continue
  with tempfile.NamedTemporaryFile(dir=ev) as f:
   os.chmod(f.name,0o600)
   cmd=['curl','-sS','--max-time','25','--max-filesize','25000000','--proto','=https','--max-redirs','0','-w','%{http_code}','-o',f.name,url]
   r=subprocess.run(cmd,capture_output=True,text=True);b=pathlib.Path(f.name).read_bytes();h=hashlib.sha256(b).hexdigest();pdf=b.startswith(b'%PDF-')
   rows.append({'id':item['id'],'source_host':u.hostname,'redirects_followed':False,'http':r.stdout[-3:],'curl_exit':r.returncode,'bytes':len(b),'pdf':pdf,'sha256':h if pdf else None,'expected_sha256':ref['sha256'],'matches':r.returncode==0 and r.stdout.endswith('200') and pdf and h==ref['sha256'],'admission':'HOLD: byte comparison is not privacy/publication approval or a registered child/page mapping'})
 out={'scope':'Fresh normal HTTPS source byte comparisons; no authentication bypass, redirects, retries, OCR, text export or admissions','rows':rows,'new_admissions':0};write_private(ev/'fresh-source-byte-checks.private.json',out);print(json.dumps({'candidates':len(rows),'matched':sum(r.get('matches',False) for r in rows),'outcomes':[{'id':r['id'],'http':r.get('http'),'matched':r.get('matches',False),'status':r.get('status')} for r in rows],'new_admissions':0}))
if __name__=='__main__':main()
