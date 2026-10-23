import concurrent.futures
import json
import re
import subprocess
import sys

FRESH = '--fresh' in sys.argv

IDS = ['EFTA02237829','EFTA00083565','EFTA02235822','EFTA00108671',
       'EFTA01303204','EFTA01306219','EFTA01342387','EFTA02238307',
       'EFTA01302469','EFTA01341255']

def request(host, path):
    result = subprocess.run(['curl','-sS','--max-time','30','-D','-',
        'https://' + host + path + ('?gah_quality_check=20261023-final' if FRESH else '')], capture_output=True, text=True)
    assert result.returncode == 0, result.stderr
    headers, _, body = result.stdout.partition('\n\n')
    status = int(headers.splitlines()[0].split()[1])
    return status, headers, body

def check(item):
    host, ident = item
    status, headers, body = request(host, '/archive/' + ident)
    errors = []
    if status != 200: errors.append('status ' + str(status))
    if 'x-gah-archive-template: utility-20261023' not in headers.lower(): errors.append('old template')
    if not re.search(r'(?im)^x-robots-tag: noindex', headers): errors.append('header indexability')
    if not re.search(r'<meta\s+name="robots"\s+content="noindex', body): errors.append('HTML indexability')
    if 'x-gah-ad-eligible: false' not in headers.lower(): errors.append('ad header')
    if 'name="grok-ad-eligible" content="false"' not in body: errors.append('ad meta')
    if 'Why this record matters' in body or 'Open receipt slots' in body: errors.append('generic filler')
    if re.search(r'"@type"\s*:\s*"Article"|article:modified_time', body): errors.append('article dates/schema')
    if 'Archive Record' not in body: errors.append('record label')
    if '/pdf-lite?id=' + ident not in body: errors.append('PDF link')
    if 'class="ocr-excerpt"' not in body and 'View OCR excerpt' in body: errors.append('empty OCR link')
    return {'host':host,'id':ident,'status':status,'html_bytes':len(body),'errors':errors}

with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
    results = list(pool.map(check, [(h,i) for h in ['wiki.grokarchivehub.com','grokarchivehub.com'] for i in IDS]))

controls = []
for ident in ['EFTA00013764','EFTA00035147','EFTA00033413','EFTA00153569','EFTA02858481']:
    status, headers, body = request('grokarchivehub.com','/archive/'+ident)
    controls.append({'id':ident,'status':status,'indexable':status==200 and not re.search(r'(?im)^x-robots-tag:.*noindex',headers) and not re.search(r'<meta\s+name="robots"\s+content="noindex',body)})
status, headers, body = request('wiki.grokarchivehub.com','/archive/EFTA99999999')
report = {'utility':results, 'reviewed_controls':controls,'missing_record_status':status}
print(json.dumps(report, indent=2))
assert all(not x['errors'] for x in results), 'utility regressions'
assert all(x['indexable'] for x in controls), 'reviewed-source regression'
assert status == 404, 'missing record must remain 404'
print('PASS 20 utility pages, five reviewed indexable dossiers, and missing-record 404')
