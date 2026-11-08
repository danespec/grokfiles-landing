"""Align known identifier labels and remove exact template duplication.
Never creates source findings or changes source access/indexability/ad policy.
"""
from pathlib import Path
from bs4 import BeautifulSoup
import json,re,html
ROOT=Path(__file__).resolve().parents[1]
TITLES={"EFTA02300238":"Hoffman Travel Planning","EFTA02346686":"Summers Weekend Invitation"}
p=ROOT/'content/identifier-dossiers.json'
reg=json.loads(p.read_text())
changed=[]
for e in reg['entries']:
 if e['id'] in TITLES:
  old=e.copy();e['title']=TITLES[e['id']]
  e['description']=e['id']+': '+e['title']+'. Read the source, document context and limits of what this record establishes.'
  w=ROOT/'_worker.js';s=w.read_text()
  a=json.dumps(old,ensure_ascii=False);b=json.dumps(e,ensure_ascii=False)
  if a in s:s=s.replace(a,b);w.write_text(s)
p.write_text(json.dumps(reg,ensure_ascii=False,indent=2)+'\n')
# Identifier share cards must carry the same corrected subject as their pages.
from PIL import Image,ImageDraw,ImageFont
import textwrap
try:font=ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf',44)
except OSError:font=ImageFont.load_default(size=44)
for identifier,title in TITLES.items():
 im=Image.new('RGB',(1200,630),'#141914');draw=ImageDraw.Draw(im)
 draw.rectangle((0,0,18,630),fill='#d5b67b')
 draw.text((65,48),'GROK ARCHIVE HUB',font=font,fill='#d5b67b')
 for n,line in enumerate(textwrap.wrap(identifier+' — '+title,width=42)):
  draw.text((65,170+n*65),line,font=font,fill='#f2eadc')
 im.save(ROOT/'assets/identifier-cards'/(identifier+'.png'),optimize=True)
metadata=ROOT/'content/reader-editorial-metadata.mjs'
s=metadata.read_text();prefix=s[:s.index('{')];data=json.loads(s[s.index('{'):].strip().rstrip(';'))
for identifier,title in TITLES.items():
 key='https://grokarchivehub.com/archive/'+identifier
 data[key]['title']=identifier+': '+title
 data[key]['description']=identifier+': '+title+'. Read the source, document context and limits of what this record establishes.'
metadata.write_text(prefix+json.dumps(data,ensure_ascii=False,indent=2)+';\n')
for p in [ROOT/'archive.html',*sorted((ROOT/'archive').glob('*.html'))]:
 s=p.read_text()
 for identifier,title in TITLES.items():
  s=re.sub(r'(<a[^>]*href="/archive/'+identifier+r'"[^>]*>)[^<]*(</a>)',lambda m:m[1]+identifier+' — '+html.escape(title)+m[2],s)
 p.write_text(s)
for e in reg['entries']:
 before=len(changed)
 p=ROOT/'archive'/(e['id']+'.html');raw=p.read_text();soup=BeautifulSoup(raw,'html.parser');main=soup.find('main')
 if not main:continue
 if e['id'] in TITLES:
  main.find('h1').string=e['id']+' — '+e['title']
  soup.title.string=e['id']+': '+e['title']+' | Grok Archive Hub'
  for meta in soup.select('meta[property="og:title"],meta[name="twitter:title"]'):meta['content']=e['id']+': '+e['title']
  for meta in soup.select('meta[name="description"],meta[property="og:description"],meta[name="twitter:description"]'):meta['content']=e['description']
 context=main.find(id='document-context');support=main.find(id='record-support');receipt=main.find(id='receipt')
 if e['id']=='EFTA02346686':
  for dt in receipt.find_all('dt'):
   if dt.get_text(strip=True)=='Silence':dt.find_next_sibling('dd').string='Acceptance, travel and attendance require separate corroboration.'
  limits=main.find(id='evidence-boundaries')
  for para in limits.find_all('p'):
   if 'Cohen = Barak' in para.get_text():para.string='The invitation does not establish that Summers accepted or attended. Attendance requires separate corroboration, such as contemporaneous travel or arrival records.'
 # Remove support only when its complete prose is precisely the context prose.
 def prose(section):
  if section is None:return ''
  copy=BeautifulSoup(str(section),'html.parser')
  for node in copy.find_all(['h2','h3','h4']):node.decompose()
  for para in list(copy.find_all('p')):
   if para.find('a') and not re.sub(r'<a\b[^>]*>.*?</a>|<[^>]+>|[\s.·—|]', '', str(para), flags=re.S):para.decompose()
  return copy.get_text(' ',strip=True)
 c=prose(context);a=prose(support)
 if c and c==a and support:
  support.decompose();changed.append(e['id']+': duplicate support section')
 if receipt and c:
  for dt in list(receipt.find_all('dt')):
   dd=dt.find_next_sibling('dd')
   if dt.get_text(strip=True)=='Claim' and dd and dd.get_text(' ',strip=True)==c:
    dt.decompose();dd.decompose();changed.append(e['id']+': duplicate claim')
 updated=str(soup)
 if len(changed)>before or e['id'] in TITLES:
  if updated!=raw:p.write_text(updated)
print(json.dumps({'exactDuplicatesRemoved':len(changed),'changes':changed,'labels':TITLES},indent=2))
