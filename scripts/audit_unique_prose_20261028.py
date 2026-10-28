from pathlib import Path
from collections import defaultdict
from bs4 import BeautifulSoup
import json,re,sys
repo=Path(__file__).resolve().parents[1];graph=Path(sys.argv[1]);output=Path(sys.argv[2]);pages=json.loads((graph/'pages.json').read_text());docs={};owners=defaultdict(set)
for row in pages:
 if row['status']!=200 or row.get('canonical')!=row['url'] or 'noindex' in ((row.get('robotsMeta') or '')+(row.get('robotsHeader') or '')).lower():continue
 soup=BeautifulSoup((graph/row['html']).read_text(),'html.parser');main=soup.find('main') or soup.body
 for node in main.select('script,style,nav,footer,aside,form,button,pre,code,table,.route-list,.archive-navigation,.reader-identifier-links'):node.decompose()
 blocks=[]
 for p in main.select('p,li'):
  if p.find_parent(['p','li']):continue
  text=p.get_text(' ',strip=True)
  if re.match(r'^(?:Claim|Bias|Silence|Confidence|Archive ID|Source lane|Receipt link|Source access|Open receipt slots|What the record shows|What it does not prove):',text,re.I):continue
  words=re.findall(r"[\w]+(?:[’'-][\w]+)*",text.lower());blocks.append(words)
  for i in range(max(0,len(words)-11)):owners[tuple(words[i:i+12])].add(row['url'])
 docs[row['url']]=blocks
rows=[]
for url,blocks in docs.items():
 unique=total=0
 for words in blocks:
  total+=len(words);shared=set()
  for i in range(max(0,len(words)-11)):
   if len(owners[tuple(words[i:i+12])])>1:shared.update(range(i,i+12))
  unique+=len(words)-len(shared)
 rows.append({'url':url,'proseWords':total,'uniqueProseWords':unique,'under300':unique<300})
rows.sort(key=lambda x:x['uniqueProseWords']);output.write_text(json.dumps({'method':'Paragraph/list prose excluding navigation, tables, code and repeated template labels; words in 12-word sequences shared by multiple indexable pages excluded. Audit heuristic, not a Google word-count requirement.','pages':rows},indent=2)+'\n');print(json.dumps({'indexable':len(rows),'uniqueProseAtLeast300':sum(not r['under300'] for r in rows),'under300':sum(r['under300'] for r in rows)},indent=2))
