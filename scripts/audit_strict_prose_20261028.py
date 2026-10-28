"""Strict whole-block prose screen for the supplied final review.
Only paragraph/list blocks of at least 20 words, occurring on one indexable
page, count. Repeated boilerplate labels and non-editorial UI are excluded.
This is an audit heuristic, not a Google content rule.
"""
from pathlib import Path
from collections import defaultdict
from bs4 import BeautifulSoup
import json,re,sys
graph=Path(sys.argv[1]);pages=json.loads((graph/'pages.json').read_text());docs={};owners=defaultdict(set)
for row in pages:
 if row['status']!=200 or row.get('canonical')!=row['url'] or 'noindex' in ((row.get('robotsMeta') or '')+(row.get('robotsHeader') or '')).lower():continue
 soup=BeautifulSoup((graph/row['html']).read_text(),'html.parser');main=soup.find('main') or soup.body
 for node in main.select('script,style,nav,footer,aside,form,button,pre,code,table,.route-list,.archive-navigation,.reader-identifier-links'):node.decompose()
 blocks=[]
 for p in main.select('p,li'):
  if p.find_parent(['p','li']):continue
  text=p.get_text(' ',strip=True)
  if re.match(r'^(?:Claim|Bias|Silence|Confidence|Archive ID|Source lane|Receipt link|Source access|Open receipt slots|What the record shows|What it does not prove):',text,re.I):continue
  words=tuple(re.findall(r"[\w]+(?:[’'-][\w]+)*",text.lower()))
  if len(words)>=20:blocks.append(words);owners[words].add(row['url'])
 docs[row['url']]=blocks
rows=[]
for url,blocks in docs.items():
 count=sum(len(b) for b in set(blocks) if len(owners[b])==1)
 rows.append({'url':url,'uniqueProseWords':count,'under300':count<300})
rows.sort(key=lambda r:r['uniqueProseWords'])
result={'method':'Paragraph/list blocks of at least 20 words, counted once, occurring on only one indexable page; excludes navigation, tables, code, UI and repeated claim/bias/silence/confidence labels. Reproduction of the stated strict whole-block method; independent counts can differ.','pages':rows,'under300':[r for r in rows if r['under300']]}
(graph/'strict-prose.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps({'indexable':len(rows),'minimum':min(r['uniqueProseWords'] for r in rows),'under300':result['under300']},indent=2))
