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
def oauth_for_kv():
    """Use the existing Wrangler OAuth refresh, never write credentials to Git/logs."""
    import tomllib
    path=Path.home()/'.wrangler/config/default.toml'
    def read():
        obj=tomllib.loads(path.read_text())
        value=obj.get('expiration_time')
        if not isinstance(value,str):
            raise RuntimeError('Wrangler token expiry unavailable')
        expires=dt.datetime.fromisoformat(value.replace('Z','+00:00'))
        if expires.tzinfo is None:
            raise RuntimeError('Wrangler token expiry unzoned')
        return obj,expires
    cfg,expiry=read()
    if expiry<=dt.datetime.now(dt.timezone.utc)+dt.timedelta(minutes=10):
        portable=Path.home()/'grok-tools/node-portable/current/bin'
        npx=portable/'npx'
        if not npx.is_file():
            raise RuntimeError('Cached Wrangler CLI unavailable')
        env={**os.environ,'PATH':str(portable)+':'+os.environ.get('PATH','/usr/bin:/bin:/usr/sbin:/sbin')}
        refreshed=subprocess.run([str(npx),'--no-install','wrangler','whoami'],
                                 env=env,cwd=str(WORK),capture_output=True,timeout=35)
        if refreshed.returncode:
            raise RuntimeError('Wrangler OAuth refresh failed; no KV write')
        cfg,expiry=read()
    if expiry<=dt.datetime.now(dt.timezone.utc)+dt.timedelta(minutes=2):
        raise RuntimeError('Wrangler OAuth refresh still expired')
    token=cfg.get('oauth_token')
    if not isinstance(token,str) or len(token)<20:
        raise RuntimeError('Wrangler OAuth token invalid')
    return token

def put_kv(key,payload):
    if key not in (KEY_PRIVATE,KEY_PUBLIC):
        raise ValueError('Trending writer limited to two approved KV keys')
    if not isinstance(payload,dict) or payload.get('schema') not in ('gah_trending_topics_v1','gah_trending_gaplog_v1'):
        raise ValueError('Trending writer requires approved payload schema')
    if (key==KEY_PRIVATE)!=(payload['schema']=='gah_trending_gaplog_v1'):
        raise ValueError('Trending key and payload type mismatch')
    # Reuse the verified Wrangler identity and refresh before short-lived OAuth expiry.
    token=oauth_for_kv()
    url=f'https://api.cloudflare.com/client/v4/accounts/{ACCOUNT}/storage/kv/namespaces/{NS}/values/'+urllib.parse.quote(key,safe='')
    import tempfile
    data=json.dumps(payload,separators=(',',':'),ensure_ascii=False).encode()
    fd,path=tempfile.mkstemp(prefix='gah-trending-kv-',suffix='.json',dir=WORK)
    try:
        with os.fdopen(fd,'wb') as out:
            out.write(data)
            out.flush()
            os.fsync(out.fileno())
        cfgtext='header = "Authorization: Bearer '+token+'"\n'
        cfgtext+='header = "Content-Type: application/json"\n'
        proc=subprocess.run(['/usr/bin/curl','--silent','--show-error','--fail','--max-time','25',
           '--proto','=https','--request','PUT','-K','-','--data-binary','@'+path,url],
           input=cfgtext,text=True,capture_output=True,timeout=30)
        if proc.returncode:raise RuntimeError('Cloudflare KV write unavailable')
        result=json.loads(proc.stdout)
        if not result.get('success'):raise RuntimeError('Cloudflare KV rejected the write')
        # A provider-accepted PUT is not sufficient. Read the EXACT same key
        # back via authenticated GET and verify canonical JSON, fail-closed.
        # Retry briefly for Cloudflare KV edge consistency.
        import time
        for attempt in range(3):
            readback=subprocess.run(['/usr/bin/curl','--silent','--show-error','--fail',
               '--max-time','18','--proto','=https','-K','-',url],
               input=cfgtext,text=True,capture_output=True,timeout=23)
            if readback.returncode==0:
                try:
                    confirmed=json.loads(readback.stdout)
                    if confirmed==payload:return
                except (ValueError,TypeError):pass
            if attempt<2:time.sleep(2)
        raise RuntimeError('Cloudflare KV readback did not match the payload')
    finally:
        os.unlink(path)
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
        # Gap intelligence is private and useful even on quiet news days.
        put_kv(KEY_PRIVATE,private)
        print('PRIVATE_GAP_KV_UPDATED',flush=True)
        # Do not invent public trends. Existing valid feed ages out after 24h.
        if public['status']!='active':
            print('NOT_PUBLISHED_INSUFFICIENT_SIGNALS',flush=True)
            return
        put_kv(KEY_PUBLIC,public)
        print('PUBLIC_KV_UPDATED',flush=True)
if __name__=='__main__':main()
