#!/usr/bin/env python3
"""GAH trending signals v1. No visitor tracking, article generation or public endpoint."""
import argparse, collections, datetime as dt, html, json, os, re, subprocess, sys
import urllib.parse, xml.etree.ElementTree as ET
from pathlib import Path
from html.parser import HTMLParser

WORK=Path.home()/'_gah_builds/GAH-TRENDING-001'
KEY_PUBLIC='gah:public:trending:topics:v1'
KEY_PRIVATE='gah:admin:trending:gaps:v1'
NS='15e5bc2664bc4f40b94e26526febd1ff' # Existing traffic dashboard / X_TOKEN_STORE binding
ACCOUNT='ce395670a4678183a4daf6f2dbf73e9f'
STOP=set('the a and for with from this that are what was how who where which about files file epstein jeffrey pdf 2026 doj'.split())
DENY=re.compile(r'(?i)\b(arrested|pedophile|rapist|guilty|criminal|client list|sex offender|molester|trafficker|abuser)\b')
VALID_ROUTE=re.compile(r'^/(?:guides|investigations|evidence-briefs|dispatches|archive|research|document-autopsies|topics|search)[a-z0-9/_-]*$')
SEEDS=('epstein files','epstein documents','epstein flight logs','epstein data sets')
NOW=dt.datetime.now(dt.timezone.utc)
def curl(url):
    p=subprocess.run(['curl','--fail','--silent','--show-error','--location','--max-time','15',
                      '-A','GAH-TrendingResearch/1.0 (+https://grokarchivehub.com/methodology)',url],
                     capture_output=True,timeout=20)
    if p.returncode:raise RuntimeError('Public data source unavailable')
    if len(p.stdout)>650000:raise RuntimeError('Oversize source data')
    return p.stdout
def words(s):
    return [w for w in re.findall(r'[a-z0-9]+',s.lower()) if w not in STOP and len(w)>2]
class PageMeta(HTMLParser):
    def __init__(self):super().__init__();self.title='';self.h1='';self.desc='';self.in_title=False;self.in_h1=False
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if tag=='title':self.in_title=True
        if tag=='h1':self.in_h1=True
        if tag=='meta' and a.get('name','').lower()=='description':self.desc=a.get('content','')[:220]
    def handle_endtag(self,tag):
        if tag=='title':self.in_title=False
        if tag=='h1':self.in_h1=False
    def handle_data(self,v):
        if self.in_title:self.title+=v
        if self.in_h1:self.h1+=v
def page_index(package,live_sitemap):
    root=ET.fromstring(live_sitemap);pages=[]
    for loc in root.iter():
        if not loc.tag.endswith('loc') or not loc.text:continue
        p=urllib.parse.urlparse(loc.text)
        if p.netloc!='grokarchivehub.com':continue
        route=p.path.rstrip('/') or '/'
        if not VALID_ROUTE.fullmatch(route):continue
        candidates=[package/(route.lstrip('/')+'.html'),package/route.lstrip('/')/'index.html']
        f=next((f for f in candidates if f.is_file()),None)
        if not f:continue
        m=PageMeta()
        try:m.feed(f.read_text(errors='replace')[:250000])
        except Exception:continue
        text=' '.join([m.title,m.h1,m.desc,route.replace('/',' ')])
        if len(words(text))<2:continue
        bonus=3 if route.startswith('/investigations/') else 2 if route.startswith('/evidence-briefs/') else 1
        pages.append({'url':route,'title':m.title.strip(),'search_tokens':set(words(text)),
                      'headline_tokens':set(words(m.title+' '+m.h1)),'priority':bonus})
    return pages
def google_trends():
    # Google's public daily Trending RSS; absence of Epstein is not a zero-volume claim.
    data=curl('https://trends.google.com/trending/rss?geo=US')
    root=ET.fromstring(data)
    return [x.findtext('title','').strip() for x in root.findall('.//item')
            if 'epstein' in x.findtext('title','').lower()]
def suggestions():
    out=set()
    for seed in SEEDS:
        url='https://suggestqueries.google.com/complete/search?client=firefox&q='+urllib.parse.quote(seed)
        try:
            obj=json.loads(curl(url))
            for phrase in obj[1][:12]:
                if isinstance(phrase,str) and 'epstein' in phrase.lower() and 7<=len(phrase)<=115:
                    out.add(phrase.strip())
        except Exception:pass
    return sorted(out)
def news_relevance():
    root=ET.fromstring(curl('https://news.google.com/rss/search?q=epstein&hl=en-US&gl=US&ceid=US:en'))
    titles=[x.findtext('title','') for x in root.findall('.//item')]
    return [t for t in titles if 'epstein' in t.lower()][:100]
def match_page(query,pages):
    tokens=set(words(query))
    if not tokens:return None,0.0
    best=None;top=0.
    for page in pages:
        common=tokens & page['search_tokens']
        overlap=len(common)/len(tokens)
        headline=len(common & page['headline_tokens'])/len(tokens)
        score=.69*overlap+.28*headline+.03*(page['priority']/3)
        # A generic Epstein/files match by itself is not sufficient evidence of relevance.
        if score>top and len(common)>=1:best,top=page,score
    return best,round(top,3)
def build(demo=False):
    package=WORK/'page-index'
    pages=page_index(package,curl('https://grokarchivehub.com/sitemap.xml'))
    if len(pages)<30:raise RuntimeError('Local index unexpectedly small')
    trends=google_trends()
    autos=suggestions()
    news=news_relevance()
    feed_candidates=[('google_trends_rss',x) for x in trends]
    for q in autos:
        # Autocomplete alone is not a trend; require related recent coverage.
        unique=set(words(q))
        coverage=sum(1 for title in news if len(unique.intersection(words(title)))>=max(1,min(2,len(unique))))
        if coverage>=2:feed_candidates.append(('search_suggestion_plus_news',q))
    accepted=[];gaps=[];denied=[]
    seen=set()
    for source,query in feed_candidates:
        if query.lower() in seen:continue
        seen.add(query.lower())
        if DENY.search(query):
            denied.append({'query':query,'source':source,'reason':'accusation_pattern'});continue
        page,score=match_page(query,pages)
        if not page or score<.65:
            gaps.append({'query':query,'source':source,'match_score':score});continue
        accepted.append({'query':query,'url':page['url'],'score':score,'signal':source})
    accepted.sort(key=lambda v: (v['signal']=='google_trends_rss',v['score']),reverse=True)
    accepted=accepted[:8]
    status='active' if len(accepted)>=5 else 'insufficient_signals'
    public={'schema':'gah_trending_topics_v1','generated_at':NOW.isoformat().replace('+00:00','Z'),
            'status':status,'items':accepted if status=='active' else [],
            'method':'Google Trends RSS; public search suggestions corroborated by Google News headlines; not search-volume estimates',
            'preview':False}
    private={'schema':'gah_trending_gaplog_v1','generated_at':public['generated_at'],
             'source_totals':{'trends_epstein_items':len(trends),'suggestions':len(autos),'epstein_news_headlines':len(news),
                              'indexed_pages':len(pages)},'unmatched_queries':gaps[:100],
             'denied_queries':denied[:100],'display_candidates':len(accepted)}
    return public,private

def write_json_private(path,data):
    path.parent.mkdir(parents=True,exist_ok=True,mode=0o700)
    fd=os.open(path,os.O_WRONLY|os.O_CREAT|os.O_TRUNC,0o600)
    with os.fdopen(fd,'w') as f:json.dump(data,f,indent=2,ensure_ascii=False);f.write('\n')
def put_kv(key,payload):
    # Reuse exactly the traffic dashboard's established Cloudflare OAuth path.
    import tomllib
    cfg=tomllib.loads((Path.home()/'.wrangler/config/default.toml').read_text())
    token=cfg['oauth_token']
    url=f'https://api.cloudflare.com/client/v4/accounts/{ACCOUNT}/storage/kv/namespaces/{NS}/values/'+urllib.parse.quote(key,safe='')
    from urllib.request import Request,urlopen
    data=json.dumps(payload,separators=(',',':'),ensure_ascii=False).encode()
    req=Request(url,data=data,method='PUT',headers={'Authorization':'Bearer '+token,
                 'Content-Type':'application/json','User-Agent':'GAH-TrendingResearch/1.0'})
    with urlopen(req,timeout=30) as resp:
        result=json.loads(resp.read())
    if not result.get('success'):raise RuntimeError('Cloudflare KV write not accepted')
def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--publish',action='store_true',help='Write namespaced public and private Cloudflare KV')
    args=parser.parse_args()
    try:public,private=build()
    except Exception as err:
        print('FEED_FETCH_OR_INDEX_ERROR='+type(err).__name__+'; no KV write',flush=True)
        raise
    write_json_private(WORK/'trending-public-preview.json',public)
    write_json_private(WORK/'trending-gaps-private.json',private)
    print('FEED_STATUS='+public['status'],'PUBLIC_ITEMS='+str(len(public['items'])),flush=True)
    print('SOURCE_COUNTS='+str(private['source_totals']),flush=True)
    print('GAPS='+str(len(private['unmatched_queries'])),'DENY='+str(len(private['denied_queries'])),flush=True)
    if args.publish:
        # Preserve existing public feed when upstream yields insufficient evidence;
        # stale data will hide automatically after 24 hours.
        if public['status']!='active':
            print('NOT_PUBLISHED_INSUFFICIENT_SIGNALS',flush=True)
            return
        put_kv(KEY_PRIVATE,private)
        put_kv(KEY_PUBLIC,public)
        print('PUBLIC_AND_PRIVATE_KV_UPDATED',flush=True)
if __name__=='__main__':main()
