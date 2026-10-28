from pathlib import Path
from bs4 import BeautifulSoup
from urllib.parse import urljoin,urlsplit
import json,re,sys
repo=Path(__file__).resolve().parents[1];graph=Path(sys.argv[1])
summary=json.loads((graph/'summary.json').read_text())
assert not summary['jargonPages'] and not summary['indexableRoutesMissingFromSitemaps'] and not summary['unexpectedHttpFailures']
rows={r['url']:r for r in json.loads((graph/'pages.json').read_text())}
reg=json.loads((repo/'content/research-route-policy.mjs').read_text().removeprefix('export const RESEARCH_ROUTES = ').strip().removesuffix(';'))
ids={e['id'] for e in json.loads((repo/'content/identifier-dossiers.json').read_text())['entries'] if e['indexable']}
fail=[]
for route in reg:
 owner='https://'+('grokarchivehub.com' if route['owner']=='main' else 'wiki.grokarchivehub.com')
 other='https://'+('wiki.grokarchivehub.com' if route['owner']=='main' else 'grokarchivehub.com')
 alias=rows[other+route['path']]
 if alias['status']!=301 or alias['location']!=owner+route['path']:fail.append({'path':route['path'],'issue':'Owner alias redirect'})
 if route['owner']=='wiki':
  r=rows[owner+route['path']];expected='index,follow' if route['indexable'] else 'noindex,follow'
  if r['status']!=200 or r.get('robotsHeader')!=expected or r.get('robotsMeta')!=expected or r.get('canonical')!=owner+route['path']:fail.append({'path':route['path'],'issue':'Canonical/robots/status'})
  s=BeautifulSoup((graph/r['html']).read_text(),'html.parser')
  for a in s.find_all('a',href=True):
   m=re.search(r'/archive/(EFTA\d{8})(?:$|[?#])',a['href'])
   if m and m[1] not in ids:fail.append({'path':route['path'],'issue':'Unpublished dossier target'})
index=rows['https://wiki.grokarchivehub.com/research-index']
s=BeautifulSoup((graph/index['html']).read_text(),'html.parser');owners={r['path']:r['owner'] for r in reg}
for a in s.find_all('a',href=True):
 u=urlsplit(urljoin(index['url'],a['href']))
 if u.path in owners and u.hostname!=('grokarchivehub.com' if owners[u.path]=='main' else 'wiki.grokarchivehub.com'):fail.append({'url':a['href'],'issue':'Research index links to duplicate host'})
report={'researchRoutesChecked':len(reg),'wikiResearchIndexCache':index['cache'],'failures':fail}
(graph/'research-policy-acceptance.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2));raise SystemExit(bool(fail))
