#!/usr/bin/env python3
"""Manually notify IndexNow of GAH's newly updated apex URLs; dry-run by default.
Does not affect Google Search indexing or guarantee visibility.
"""
import argparse, subprocess, xml.etree.ElementTree as ET, json, pathlib, re, sys
BASE='https://grokarchivehub.com'
ENDPOINT='https://api.indexnow.org/indexnow'
p=argparse.ArgumentParser()
p.add_argument('--date', required=True, help='Sitemap lastmod date YYYY-MM-DD')
p.add_argument('--send',action='store_true',help='Submit batch to IndexNow; default dry run')
a=p.parse_args()
if not re.fullmatch(r'\d{4}-\d{2}-\d{2}',a.date):raise SystemExit('Bad YYYY-MM-DD date')
repo=pathlib.Path(__file__).resolve().parent.parent
worker=(repo/'_worker.js').read_text()
keys=[f.stem for f in repo.glob('*.txt') if re.fullmatch('[A-Za-z0-9-]{8,128}',f.stem) and f.read_text().strip()==f.stem and ('path === "/'+f.name+'"') in worker]
if len(keys)!=1:raise SystemExit('Expected exactly one published public IndexNow verification key')
key=keys[0]
def fetch(url):
 return subprocess.run(['curl','-sSL','--max-time','16','-w','\nGAH_HTTP:%{http_code}','--',url],capture_output=True,text=True)
r=fetch(BASE+'/sitemap.xml')
if '\nGAH_HTTP:200' not in r.stdout:raise SystemExit('Live sitemap unreachable')
xml=r.stdout.split('\nGAH_HTTP:',1)[0]
urls=[]
for item in ET.fromstring(xml):
 loc=next((e.text for e in item if e.tag.endswith('loc')),None)
 mod=next((e.text for e in item if e.tag.endswith('lastmod')),None)
 if mod==a.date and loc and loc.startswith(BASE+'/'):urls.append(loc)
if not 1<=len(urls)<=100:raise SystemExit('No eligible changed URLs or unexpected batch size')
print('IndexNow candidate count',len(urls),'lastmod',a.date)
for url in urls:
 r=fetch(url)
 if '\nGAH_HTTP:200' not in r.stdout:raise SystemExit('Not HTTP200: '+url)
 body=r.stdout.split('\nGAH_HTTP:',1)[0]
 if re.search(r'<meta\s+name="robots"\s+content="[^"]*noindex',body,re.I):
  raise SystemExit('Noindex page excluded: '+url)
 if ('href="'+url+'"') not in body:raise SystemExit('Expected self canonical absent: '+url)
 print('ELIGIBLE',url)
if not a.send:
 print('DRY RUN: no submission. Specify --send after deployment.')
 sys.exit(0)
key_url=BASE+'/'+key+'.txt'
v=fetch(key_url)
if '\nGAH_HTTP:200' not in v.stdout or v.stdout.split('\nGAH_HTTP:',1)[0].strip()!=key:
 raise SystemExit('Verification key is not publicly accessible, aborting')
payload={'host':'grokarchivehub.com','key':key,'keyLocation':key_url,'urlList':urls}
result=subprocess.run(['curl','-sS','--max-time','35','-X','POST',ENDPOINT,'-H',
 'Content-Type: application/json; charset=utf-8','--data-binary','@-','-w','\nINDEXNOW_HTTP:%{http_code}'],
 input=json.dumps(payload),capture_output=True,text=True)
if 'INDEXNOW_HTTP:' not in result.stdout:raise SystemExit('Transport failure '+result.stderr[:180])
body,code=result.stdout.rsplit('INDEXNOW_HTTP:',1)
print('Endpoint',ENDPOINT,'HTTP status',code.strip(),'detail',body[:180])
if code.strip() not in ('200','202'):raise SystemExit('IndexNow did not accept the batch')
print('NOTIFICATION ACCEPTED: This is receipt only, not an indexing guarantee.')
