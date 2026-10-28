from pathlib import Path
from bs4 import BeautifulSoup
import subprocess,re,json,sys
out=Path(sys.argv[1]);out.mkdir(parents=True,exist_ok=True)
topics=['maxwell-prosecution','epstein-victim-services-doj-coordination','epstein-victim-notification-vns-sdny-outreach','sdny-epstein-maxwell-court-filings']
urls=['https://wiki.grokarchivehub.com/research/'+p for p in ['trump-epstein-documented-timeline','ehud-barak-epstein-documentary-record']]+['https://wiki.grokarchivehub.com/topics/'+p for p in topics]+['https://grokarchivehub.com'+p for p in ['/research/epstein-final-48-hours-mcc','/research/evidence/epstein-death','/barak/receipts','/barak/timeline','/redacted-files','/visual-evidence']]+['https://wiki.grokarchivehub.com/research-index']
rows=[];fail=[]
for i,url in enumerate(urls):
 h=out/f'{i}.headers';b=out/f'{i}.html';subprocess.run(['curl','-fsS','--max-time','30','-D',str(h),'-o',str(b),url],check=True)
 headers={k.lower():v.strip() for line in h.read_text().splitlines() if ':' in line for k,v in [line.split(':',1)]};s=BeautifulSoup(b.read_text(),'html.parser');meta=s.find('meta',attrs={'name':'robots'});robots=meta.get('content','') if meta else '';[n.decompose() for n in s.find_all(['script','style'])];text=s.get_text(' ',strip=True)
 hits=re.findall(r'SUPERMATRIX|row_4679|\b[RCU]00\d\b|FLIGHT_COUNT|SILENCE_MAP|local repaired|public-safe build|factual anchor in this build|Member-supported workbench|Internal review queue|Build 2026-|Word counts are validated at build time|Evidence cockpit',text,re.I)
 if hits:fail.append({'url':url,'jargon':hits})
 if '/topics/' in url:
  if robots!='noindex,follow' or headers.get('x-robots-tag')!='noindex,follow':fail.append({'url':url,'robots':'mismatch'})
  if any(re.search(r'^(?:https://wiki.grokarchivehub.com)?/archive/EFTA',a['href']) for a in s.find_all('a',href=True)):fail.append({'url':url,'links':'wiki alias'})
 if url.endswith('/research-index') and re.search(r'GAH-EPSTEIN-DEATH-DOMINANCE|GROK_RESEARCH_INDEX_',b.read_text()):fail.append({'url':url,'comments':'markers'})
 rows.append({'url':url,'cache':headers.get('cf-cache-status'),'metaRobots':robots,'headerRobots':headers.get('x-robots-tag'),'jargonMatches':hits})
report={'checkedPages':len(rows),'pages':rows,'failures':fail};(out/'acceptance.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2));raise SystemExit(bool(fail))
