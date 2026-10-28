from pathlib import Path
from urllib.parse import urlsplit
from collections import defaultdict
from datetime import datetime,timezone
from bs4 import BeautifulSoup
import json,re,sys,subprocess,hashlib,xml.etree.ElementTree as ET
repo=Path(__file__).resolve().parents[1];graph=Path(sys.argv[1]);rows=json.loads((graph/'pages.json').read_text());by={r['url']:r for r in rows};rules=json.loads((repo/'content/publication-policy.mjs').read_text().split('=',1)[1].strip().rstrip(';'));prose=json.loads((graph/'unique-prose.json').read_text());fail=[]
def check(ok,msg):
 if not ok:fail.append(msg)
policy=[]
for url,rule in rules.items():
 r=by.get(url);check(r is not None and r['status']==200,'Policy access '+url)
 if not r:continue
 check('noindex' in (r.get('robotsHeader') or '') and 'noindex' in (r.get('robotsMeta') or ''),'Policy robots '+url)
 if rule.get('canonical'):check(r.get('canonical')==rule['canonical'],'Policy canonical '+url)
 policy.append({'url':url,'status':r['status'],'metaRobots':r.get('robotsMeta'),'headerRobots':r.get('robotsHeader'),'canonical':r.get('canonical'),'reason':rule['reason']})
titles=defaultdict(list);descriptions=defaultdict(list);bodies=defaultdict(list);mismatch=[];indexed=[];comments=[]
for r in rows:
 if r['status']!=200 or 'text/html' not in r.get('type',''):continue
 html=(graph/r['html']).read_text();soup=BeautifulSoup(html,'html.parser');meta=soup.find('meta',attrs={'name':'robots'});meta=meta.get('content','') if meta else '';header=r.get('robotsHeader') or '';norm=lambda v:','.join(sorted(v.lower().replace(' ','').split(',')))
 if meta and header and norm(meta)!=norm(header):mismatch.append(r['url'])
 if re.search(r'<!--(?:(?!-->)[\s\S])*GROK_',html):comments.append(r['url'])
 if 'noindex' in (meta+header).lower():continue
 check(r.get('canonical')==r['url'],'Indexable canonical '+r['url']);title=soup.title.get_text(' ',strip=True) if soup.title else '';description=soup.find('meta',attrs={'name':'description'});description=description.get('content','') if description else '';titles[title.casefold()].append(r['url']);descriptions[description.casefold()].append(r['url']);indexed.append({'url':r['url'],'title':title,'description':description,'canonical':r.get('canonical')});check(bool(title) and len(title)<=70 and '…' not in title,'Title '+r['url']);check(bool(description) and len(description)<=155 and '…' not in description,'Description '+r['url']);check(len(soup.select('h1'))==1,'H1 '+r['url'])
 main=soup.find('main') or soup.body
 for node in main.select('script,style,nav,footer,aside,form,button,.route-list,.archive-navigation,.reader-identifier-links'):node.decompose()
 body=re.sub(r'\s+',' ',main.get_text(' ',strip=True)).casefold();bodies[hashlib.sha256(body.encode()).hexdigest()].append(r['url'])
dupTitles={k:v for k,v in titles.items() if len(v)>1};dupDescriptions={k:v for k,v in descriptions.items() if len(v)>1};dupBodies={k:v for k,v in bodies.items() if len(v)>1};check(not dupTitles,'Duplicate titles');check(not dupDescriptions,'Duplicate descriptions');check(not dupBodies,'Duplicate bodies');check(not mismatch,'Robots mismatch');under=[r for r in prose['pages'] if r['uniqueProseWords']<300];check(not under,'Unique prose under 300');check(len(indexed)==len(prose['pages']),'Prose inventory mismatch')
sitemaps={};listed=set()
for host,path in [('https://grokarchivehub.com','/sitemap.xml'),('https://grokarchivehub.com','/sitemap-efta.xml'),('https://wiki.grokarchivehub.com','/sitemap.xml')]:
 xml=subprocess.check_output(['curl','-fsS','--max-time','40',host+path]);urls=[n.text for n in ET.fromstring(xml).iter() if n.tag.endswith('}loc')];sitemaps[host+path]=urls;listed.update(urls)
 for u in urls:check(u in by and by[u]['status']==200 and by[u].get('canonical')==u and 'noindex' not in ((by[u].get('robotsHeader') or '')+(by[u].get('robotsMeta') or '')).lower(),'Sitemap identity '+u)
check(listed=={r['url'] for r in indexed},'Sitemap/indexable set mismatch');check(80<=len(listed)<=120,'Requested initial inventory range');check(not any('/receipts/EFTA' in u for u in listed),'Receipt remains in sitemap');wikiReceipts=[r for r in policy if r['url'].startswith('https://wiki.grokarchivehub.com/receipts/EFTA')];check(len(wikiReceipts)==69,'Wiki receipt count')
contact=by['https://grokarchivehub.com/contact'];html=(graph/contact['html']).read_text();check(html.count('href="mailto:grokcloudflare@gmail.com"')==2 and '/cdn-cgi/l/email-protection' not in html,'Contact action')
# All explicitly expanded pages and chosen story homes must remain in the substantive index.
for path in ['/investigations/barak-gadeco-fee-2014','/evidence-briefs/fbi-epstein-not-evidentiary-scrub','/investigations/barak-saudi-rothschild-proposal-2015','/evidence-briefs/mcc-4chan-two-posters-attribution-audit','/news/doj-march-2025-review-emails-released','/methodology/redaction-breadcrumbs','/archive/EFTA00035574','/corrections/flight-log-count-and-aircraft-reconciliation','/investigations/barak-st-thomas-dec-2014','/reels/shawn-ryan-peter-thiel-account-response']:check('https://grokarchivehub.com'+path in listed,'Requested edited home absent '+path)
result={'checkedAt':datetime.now(timezone.utc).isoformat(),'scope':json.loads((graph/'summary.json').read_text()),'indexableCount':len(indexed),'indexed':indexed,'sitemaps':sitemaps,'policy':policy,'uniqueProseMethod':prose['method'],'uniqueProse':prose['pages'],'under300':under,'duplicateTitleGroups':dupTitles,'duplicateDescriptionGroups':dupDescriptions,'duplicateBodyGroups':dupBodies,'robotsMismatches':mismatch,'GROKCommentPages':comments,'wikiReceiptCardsNoindex':len(wikiReceipts),'contactMailtoLinks':2,'failures':fail}
(graph/'publication-acceptance.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps({k:v for k,v in result.items() if k not in ['indexed','sitemaps','policy','uniqueProse']},indent=2));assert not fail,fail
