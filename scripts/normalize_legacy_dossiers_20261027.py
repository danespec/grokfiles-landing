from pathlib import Path
from bs4 import BeautifulSoup
repo=Path(__file__).resolve().parents[1]
for identifier in ['EFTA00035147','EFTA00039025','EFTA00039356','EFTA00039416','EFTA00039660']:
 p=repo/'archive'/ (identifier+'.html');soup=BeautifulSoup(p.read_text(),'html.parser');main=soup.find('main');source=main.find(id='source-access');limits=main.find(id='evidence-boundaries');support=main.find(id='record-support')
 for link in soup.find_all('link',href='/frontdoor/evidence-dossier.css'):link.decompose()
 for nav in list(main.select('#document-context nav.crumbs')):nav.decompose()
 for hero in list(main.select('.hero')):
  facts=hero.select('.fact')
  if facts:
   heading=soup.new_tag('h3');heading.string='Source identification';source.append(heading);dl=soup.new_tag('dl')
   for fact in facts:
    label=fact.find('strong');value=fact.find(['span','code'])
    if not label or not value:continue
    dt=soup.new_tag('dt');dt.string=label.get_text(' ',strip=True);dd=soup.new_tag('dd')
    for child in list(value.contents):dd.append(child.extract())
    dl.append(dt);dl.append(dd)
   source.append(dl)
  hero.decompose()
 for matrix in list(main.select('.matrix')):
  container=matrix.parent
  for row in matrix.find_all('div',recursive=False):
   label=row.find('strong');value=row.find('span')
   if not label or not value:continue
   key=label.get_text(' ',strip=True);target=source if key=='Source' else support if key=='Claim' else limits
   para=soup.new_tag('p');strong=soup.new_tag('strong');strong.string=key+': ';para.append(strong)
   for child in list(value.contents):para.append(child.extract())
   target.append(para)
  container.decompose()
 for grid in list(main.select('.fact-grid')):
  dl=soup.new_tag('dl')
  for fact in grid.select('.fact'):
   label=fact.find('strong');value=fact.find(['span','code'])
   if not label or not value:continue
   dt=soup.new_tag('dt');dt.string=label.get_text(' ',strip=True);dd=soup.new_tag('dd')
   for child in list(value.contents):dd.append(child.extract())
   dl.append(dt);dl.append(dd)
  grid.replace_with(dl)
 for node in main.select('.hero-grid,.status-row'):node.attrs.pop('class',None)
 main['class']=['identifier-dossier','shell']
 assert not main.select('.hero,.hero-grid,.matrix,.fact-grid,.status-row')
 p.write_text(str(soup).rstrip()+'\n')
print('Normalized five dossier bodies; source details retained under source verification')
