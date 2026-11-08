"""Verify editorial cleanup preserves unique source prose and source access."""
from pathlib import Path
from bs4 import BeautifulSoup
import subprocess,json
root=Path(__file__).resolve().parents[1]
reg=json.loads((root/'content/identifier-dossiers.json').read_text())
for e in reg['entries']:
 p=root/'archive'/(e['id']+'.html')
 old=BeautifulSoup(subprocess.check_output(['git','show','295945d:archive/'+p.name],cwd=root,text=True),'html.parser')
 new=BeautifulSoup(p.read_text(),'html.parser')
 # Every distinct paragraph survives, except the documented wrong-person limitation.
 original={x.get_text(' ',strip=True) for x in old.find('main').find_all('p')}
 current={x.get_text(' ',strip=True) for x in new.find('main').find_all('p')}
 missing=original-current
 if e['id']=='EFTA02346686':missing={x for x in missing if 'Cohen = Barak' not in x}
 assert not missing,(e['id'],missing)
 oldlinks={a['href'] for a in old.find_all('a',href=True)}
 newlinks={a['href'] for a in new.find_all('a',href=True)}
 assert oldlinks<=newlinks,(e['id'],'lost links',oldlinks-newlinks)
 assert old.find('link',rel='canonical')['href']==new.find('link',rel='canonical')['href']
 for name in ['robots','gah-adsense-approved']:
  a=old.find('meta',attrs={'name':name});b=new.find('meta',attrs={'name':name})
  assert (a.get('content') if a else None)==(b.get('content') if b else None)
for id in ['EFTA02300238','EFTA02346686']:
 e=next(x for x in reg['entries'] if x['id']==id)
 s=BeautifulSoup((root/'archive'/(id+'.html')).read_text(),'html.parser')
 assert e['title'] in s.h1.get_text()
 for f in ['archive.html','archive/ids.html']:
  s=BeautifulSoup((root/f).read_text(),'html.parser')
  for a in s.find_all('a',href='/archive/'+id):assert e['title'] in a.get_text()
s=(root/'archive/EFTA02346686.html').read_text()
assert 'Cohen = Barak' not in s
s=(root/'archive/EFTA02730996.html').read_text()
assert s.count('DOJ-released copy of the Dechert review.')==1
print('PASS 69 dossiers preserve unique paragraphs, source links, canonical and policy metadata; corrected labels and one-copy summary')
