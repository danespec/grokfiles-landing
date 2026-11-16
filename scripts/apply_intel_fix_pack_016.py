"""Apply the owner's November 16 corrections; no reviewer approvals are created."""
from pathlib import Path
from bs4 import BeautifulSoup
from PIL import Image,ImageDraw,ImageFont
import json,re,html,textwrap
ROOT=Path(__file__).resolve().parents[1]
TITLES={
'EFTA00000468':'Evidence Photograph: Desk with Framed Photos',
'EFTA00016622':'FAA Aircraft-Records Compilation (Shmitka Air)',
'EFTA00034221':'July 30, 2019 Donation-Solicitation Letter (Farley to Epstein)',
'EFTA00088020':'June 18, 2020 DOJ Internal Email on the Andrew MLAT Request',
'EFTA00176507':'Composite File: July 2007 Lefcourt Letter with Unrelated AI Papers and News Clippings',
'EFTA01972778':'MC2 Account Correspondence: $4,380 Refund (Kahn Forward, Dec 5, 2012)',
'EFTA02213201':'Kahn: May 2017 Island-Flight Coordination (JFK–St. Thomas, June 4)',
'EFTA02240144':"Epstein's March 21–26, 2018 Schedule (Bannon Entries, Mar 22)",
'EFTA02262778':'Davos Accommodation Marketing Forward (Nov 22, 2018)',
'EFTA02332402':'Maxwell–Attaway Trip Rescheduling (September 2002)',
'EFTA02656769':'Epstein to Thiel: Carbyne Meeting Note (May 21, 2018)',
'EFTA02662212':'Richardson Callback Heads-Up (Feb 1, 2017)'}
EXCEPTIONS={'EFTA01972778','EFTA02332402'}
SEO_TITLES={'EFTA00000468': 'Desk with Framed Photos', 'EFTA00016622': 'Shmitka Air FAA Records', 'EFTA00034221': 'Farley Donation Letter', 'EFTA00088020': 'DOJ Email on Andrew MLAT', 'EFTA00176507': 'Lefcourt Composite File', 'EFTA02213201': 'Kahn Flight Coordination', 'EFTA02240144': 'Epstein’s March 2018 Schedule', 'EFTA02262778': 'Davos Marketing Forward', 'EFTA02656769': 'Epstein’s Carbyne Note to Thiel', 'EFTA02662212': 'Richardson Callback Heads-Up'}
def load_module(p):
 s=p.read_text();return s[:s.index('{')],json.loads(s[s.index('{'):].strip().rstrip(';'))
prefix,metadata=load_module(ROOT/'content/reader-editorial-metadata.mjs')
page_titles={i:(metadata['https://grokarchivehub.com/archive/'+i]['title'].removeprefix(i+': ').removeprefix(i+' — ') if i in EXCEPTIONS else t) for i,t in TITLES.items()}
worker=ROOT/'_worker.js';source=worker.read_text();registry=ROOT/'content/identifier-dossiers.json';reg=json.loads(registry.read_text())
for row in reg['entries']:
 i=row['id']
 if i not in TITLES:continue
 old=dict(row);row['title']=TITLES[i];row['description']=i+': '+TITLES[i]+'. Read the source, document context and limits of what this record establishes.';row['dateModified']='2026-11-16'
 source=source.replace(json.dumps(old,ensure_ascii=False),json.dumps(row,ensure_ascii=False))
 if i not in EXCEPTIONS:
  m=metadata['https://grokarchivehub.com/archive/'+i];m['title']=i+': '+SEO_TITLES[i];m['description']=i+': '+SEO_TITLES[i]+'. Open the DOJ source and read its document context, provenance and limits.'
registry.write_text(json.dumps(reg,ensure_ascii=False,indent=2)+'\n')
(ROOT/'content/reader-editorial-metadata.mjs').write_text(prefix+json.dumps(metadata,ensure_ascii=False,indent=2)+';\n')
for i,title in TITLES.items():
 p=ROOT/'archive'/(i+'.html');s=BeautifulSoup(p.read_text(),'html.parser');display=page_titles[i];headline=i+' — '+display;s.title.string=i+': '+display+' | Grok Archive Hub';s.find('h1').string=headline
 for m in s.select('meta[property="og:title"],meta[name="twitter:title"]'):m['content']=headline
 description=metadata['https://grokarchivehub.com/archive/'+i]['description']
 for m in s.select('meta[name="description"],meta[property="og:description"],meta[name="twitter:description"]'):m['content']=description
 for ld in s.select('script[type="application/ld+json"]'):
  try:d=json.loads(ld.string or ld.get_text())
  except (ValueError,TypeError):continue
  if d.get('@type')=='Article':d['headline']=headline;d['about']={'@type':'Thing','name':display};d['dateModified']='2026-11-16';ld.string=json.dumps(d,ensure_ascii=False)
 if i=='EFTA00000468' and not s.find(id='release-provenance-note'):
  n=s.new_tag('p',id='release-provenance-note');n.string='Provenance note: the prior GAH release-history audit (PR #90) records removal in December 2025 and restoration on December 21, 2025. That history concerns publication availability; the file itself is an evidence photograph of a desk with framed photos.';s.find(id='document-context').append(n)
 if i=='EFTA02656769' and not s.find(id='story-framing-note'):
  n=s.new_tag('p',id='story-framing-note',attrs={'class':'note'});n.string='Document versus story context: this May 21, 2018 email is Epstein’s note to Thiel about a Carbyne meeting. It does not identify “Trae” as Ryan or establish that a meeting was completed. The surrounding allegation/response material is related story framing, not content or findings of this one-page document.';s.find(id='document-context').insert(1,n)
 p.write_text(str(s))
 # Existing identifier-card system: replace only overbroad typography.
 im=Image.new('RGB',(1200,630),'#141914');draw=ImageDraw.Draw(im);draw.rectangle((0,0,18,630),fill='#d5b67b')
 try:font=ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf',42)
 except OSError:font=ImageFont.load_default(size=42)
 draw.text((65,45),'GROK ARCHIVE HUB',font=font,fill='#d5b67b');draw.text((65,120),i,font=font,fill='#e9d7b5')
 for n,line in enumerate(textwrap.wrap(display,width=43)):draw.text((65,205+n*60),line,font=font,fill='#f2eadc')
 im.save(ROOT/'assets/identifier-cards'/(i+'.png'),optimize=True)
# Update exact identifier link labels; preserve broader investigation titles.
for p in [ROOT/'archive.html',*sorted((ROOT/'archive').glob('*.html')),ROOT/'backend/identifier-release-20261027/wiki-home.html']:
 s=p.read_text()
 for i,title in TITLES.items():
  for target,label in [('/archive/'+i,i+' — '+page_titles[i]),('https://wiki.grokarchivehub.com/receipts/'+i,i+' — '+title)]:
   s=re.sub(r'(<a\b[^>]*href="'+re.escape(target)+r'"[^>]*>)([^<]*)(</a>)',lambda m:m[1]+html.escape(label)+m[3] if html.unescape(m[2]).strip().startswith(i) else m[0],s)
 p.write_text(s)
# Match checked-in wiki release inputs without replacing source-access fields.
for p in [ROOT/'backend/identifier-release-20261027/identifier-dossiers.json']:
 if p.exists():
  d=json.loads(p.read_text())
  for row in d['entries']:
   if row['id'] in TITLES:row['title']=TITLES[row['id']];row['description']=row['id']+': '+row['title']+'. Read the source, document context and limits of what this record establishes.'
  p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
for i,title in TITLES.items():
 p=ROOT/'backend/identifier-release-20261027/receipts'/(i+'.html')
 if p.exists():
  s=BeautifulSoup(p.read_text(),'html.parser');s.title.string=i+': '+title+' | Grok Archive Hub'
  if s.find('h1'):s.find('h1').string=i+' — '+title
  for m in s.select('meta[property="og:title"],meta[name="twitter:title"]'):m['content']=i+' — '+title
  p.write_text(str(s))
# Explicitly separate the BV70 loan record from the Black Family Partners sale.
for name in ['investigations/black-family-partners-18m-to-5-5m-repricing.html','evidence-briefs/financial-trust-black-family-partners-2012.html','investigations/black-family-partners-source-of-funds-gap.html']:
 p=ROOT/name;s=BeautifulSoup(p.read_text(),'html.parser')
 if not s.find(id='separate-bv70-loans'):
  n=s.new_tag('section',id='separate-bv70-loans',attrs={'class':'note'});n.append(s.new_tag('h2'));n.h2.string='Separate record: BV70 loans';a=s.new_tag('a',href='/reels/leon-black-dechert-158-million-efta02730996');a.string='Read the Dechert payment-and-loan source record';n.append(a);q=s.new_tag('p');q.string='The $30.5 million in BV70 loans belongs to the Dechert record, not proof of the immediate source of the Black Family Partners closing balance. The Deutsche Bank chart’s attribution of BV70 control to Bloomberg is a reporting attribution, not independent documentary proof of control.';n.append(q);s.find('main').append(n);p.write_text(str(s))
# Hub navigation must actually expose its specific dated source paths.
p=ROOT/'timeline-reconstructions.html';s=BeautifulSoup(p.read_text(),'html.parser')
if not s.find(id='dated-source-paths'):
 section=s.new_tag('section',id='dated-source-paths',attrs={'class':'feature-panel gold'});h=s.new_tag('h2');h.string='Choose a dated source path';section.append(h)
 for href,label in [('/guides/epstein-chronological-source-guide','Chronological source guide across the published archive'),('/investigations/trump-acosta-epstein-doj-timeline','Epstein, Acosta and Trump: the specific DOJ chronology'),('/investigations/barak-timeline-without-causation','Barak: chronology without causation')]:
  para=s.new_tag('p');a=s.new_tag('a',href=href);a.string=label;para.append(a);section.append(para)
 s.find('main').insert(1,section);p.write_text(str(s))
# One new guide, grounded in dated source paths already published by GAH.
rows=[
('September 2002','Travel coordination','EFTA02332402','/archive/EFTA02332402','Maxwell–Attaway trip rescheduling. A plan and reply do not establish every subsequent movement.'),
('2006–2008','Federal investigation and agreement',None,'/investigations/trump-acosta-epstein-doj-timeline','Use the Acosta article as an analytical frame and follow its underlying source trails; it is not a complete ordered exhibit set.'),
('July 6, 2007','Legal correspondence','EFTA00176507','/archive/EFTA00176507','The opening Lefcourt letter is part of a composite file; unrelated later pages are not continuations of the legal letter.'),
('December 7, 2007','Victim-notification decision','EFTA00013764','/archive/EFTA00013764','The email anchors wording and timing. The identity behind a later recollection remains unresolved.'),
('November 2012','Black Family Partners sale',None,'/investigations/black-family-partners-18m-to-5-5m-repricing','An $18 million draft and $5.5 million closing are separate stages. The record does not establish why the changes occurred.'),
('December 5, 2012','MC2 account correspondence','EFTA01972778','/archive/EFTA01972778','A forwarded refund/account statement, distinct from the separate apartment-repairs record.'),
('2013–2019','Barak / Carbyne source chain',None,'/investigations/barak-epstein-putin-qatar-carbyne','Keep the source’s separate dates and gaps. A proposal is not acceptance, procurement, payment or proof of illegality.'),
('October 26, 2015','Phaidon tax model and correction',None,'/investigations/black-phaidon-2015-tax-model-house-oversight','The gain-rate assumption changed from 28% to 20%; the revised overall assumed rate was 35.8%. No final revised dollar total or completed sale is proven.'),
('February 1, 2017','Richardson callback heads-up','EFTA02662212','/archive/EFTA02662212','A proposed callback does not establish a completed call or conversation contents.'),
('May 4–5, 2017','Kahn flight coordination','EFTA02213201','/archive/EFTA02213201','The coordination concerns a proposed June 4 journey; correspondence alone does not prove arrival.'),
('March 21–26, 2018','Epstein general schedule','EFTA02240144','/archive/EFTA02240144','The Bannon entries are on March 22 within Epstein’s multi-day schedule.'),
('May 21, 2018','Carbyne meeting note','EFTA02656769','/archive/EFTA02656769','Epstein’s statement about a meeting does not independently prove it occurred or identify “Trae” as Ryan.'),
('November 22, 2018','Davos marketing forward','EFTA02262778','/archive/EFTA02262778','A hypothetical networking name-drop is not contact evidence.'),
('July 30, 2019','Donation solicitation','EFTA00034221','/archive/EFTA00034221','A passing comparison to Zuckerberg’s philanthropy is not an Epstein–Zuckerberg contact record.'),
('August 9–10, 2019','MCC custody record',None,'/research/epstein-final-48-hours-mcc','Follow the dated custody receipts and retain camera, round and EMS timing gaps.'),
('April 3 / June 18, 2020','Andrew MLAT request and internal discussion',None,'/archive/EFTA00088020','The April 3 request is EFTA00022062. EFTA00088020 is the separate June 18 internal email chain about the request.'),
('November 12, 2020','DOJ review findings',None,'/investigations/trump-acosta-epstein-doj-timeline','Separate the review’s findings from allegations and from earlier decisions by different authorities.'),
('May–July 2023','SDNY referral record',None,'/investigations/leon-black-2023-sdny-referral-status','The June 12 no-open-investigation statement is time-bound; it is not a declination and does not prove allegations.'),
]
template=BeautifulSoup((ROOT/'guides/how-to-search-epstein-files.html').read_text(),'html.parser');title='Epstein Records: Chronological Source Guide';desc='A chronological source guide across GAH’s published legal, financial, travel and custody records: dated source paths, separate document and publication dates, and explicit gaps. A finding aid, not a complete chronology of every raw archive document.';url='https://grokarchivehub.com/guides/epstein-chronological-source-guide'
template.title.string=title+' | Grok Archive Hub'
for m in template.select('meta[name="description"],meta[property="og:description"],meta[name="twitter:description"]'):m['content']=desc
for m in template.select('meta[property="og:title"],meta[name="twitter:title"]'):m['content']=title
for m in template.select('meta[property="og:url"]'):m['content']=url
template.find('link',rel='canonical')['href']=url
for old in template.select('script[type="application/ld+json"]'):old.decompose()
ld=template.new_tag('script',type='application/ld+json');ld.string=json.dumps({'@context':'https://schema.org','@type':'Article','headline':title,'description':desc,'mainEntityOfPage':url,'datePublished':'2026-11-16','dateModified':'2026-11-16','publisher':{'@type':'Organization','name':'Grok Archive Hub'}});template.head.append(ld)
main=template.find('main');main.clear();main.append(BeautifulSoup('<p class="eyebrow">Source-first finding aid · November 16, 2026</p><h1>'+title+'</h1><p class="lede">'+desc+'</p><div class="note"><strong>Read the dates correctly.</strong> The sequence below uses dates of source records or events described in those records, not GAH publication dates. A scheduled event is not proof of attendance. Adjacent records are not causal proof.</div><h2>How to use this guide</h2><ol><li>Choose the dated record or research path.</li><li>Open its primary receipt and inspect the page, edition and provenance.</li><li>Separate document wording, later reporting and unresolved questions.</li></ol><h2>Dated source paths across the published archive</h2>','html.parser'))
for date,lane,i,href,limit in rows:
 section=template.new_tag('section',attrs={'class':'note'});h=template.new_tag('h3');h.string=date+' · '+lane;section.append(h);a=template.new_tag('a',href=href);a.string=i or 'Open the published source path';section.append(a);p=template.new_tag('p');p.string=limit;section.append(p);main.append(section)
main.append(BeautifulSoup('<h2>Undated, composite and subject-specific records</h2><p>Keep undated items in their source-specific context rather than assigning a guessed date. A composite PDF can contain independently dated documents. The <a href="/archive/ids">identifier index</a> and <a href="/search">full archive search</a> remain the routes for records outside these selected published paths.</p><div class="cards"><a href="/timeline-reconstructions">Timeline Reconstructions: general architecture</a><a href="/investigations/barak-timeline-without-causation">Barak’s subject-specific timeline guide</a><a href="/dispatches/how-to-read-the-barak-records">Barak’s layered source-reading guide</a><a href="/methodology/how-not-to-overread-flight-logs">Flight-log counting and absence limits</a></div><h2>Scope and limitations</h2><p>This guide extends the dated-source method across the current published legal, financial, travel and custody lanes. It does not claim an exhaustive search or a complete ordered set of every Epstein document. Follow each linked investigation for its own receipts, date precision and unresolved gaps. No protected identities or redactions are reconstructed.</p><p><a href="/corrections">Corrections and source tips</a> · <a href="/methodology">Source methodology</a></p>','html.parser'))
(ROOT/'guides/epstein-chronological-source-guide.html').write_text(str(template))
entry='  ["'+url+'", "2026-11-16"],\n'
if entry not in source:source=source.replace('const CORE_SITEMAP_ENTRIES = [\n','const CORE_SITEMAP_ENTRIES = [\n'+entry)
worker.write_text(source)
print(json.dumps({'retitled_identifiers':12,'koni_title_unchanged':True,'new_guide':url,'answer_approvals_created':0}))
