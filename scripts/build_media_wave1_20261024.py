"""Generate GAH's reviewed media pages and discovery from one publication manifest.

This builds files only. Preview review and Thomas's production approval remain required.
Run with --check to validate that generated output is current without writing.
"""
from pathlib import Path
import copy
import html
import json
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
BASE = 'https://grokarchivehub.com'
CHECK = '--check' in sys.argv
CHANGES = []

def save(relative, text):
    p = ROOT / relative
    if p.exists() and p.read_text() == text:
        return
    CHANGES.append(relative)
    if not CHECK:
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(text)

def e(value):
    return html.escape(str(value), quote=True)

def block(text, name, body, anchor):
    start, end = '<!-- '+name+' -->', '<!-- /'+name+' -->'
    rendered = start + body + end
    if start in text:
        return re.sub(re.escape(start)+r'[\s\S]*?'+re.escape(end), lambda _: rendered, text, count=1)
    assert anchor in text, (name, anchor)
    return text.replace(anchor, anchor+rendered, 1)

def jsblock(text, name, body, anchor):
    start, end = '// '+name+' BEGIN', '// '+name+' END'
    rendered = start+'\n'+body+'\n'+end+'\n'
    if start in text:
        return re.sub(re.escape(start)+r'[\s\S]*?'+re.escape(end)+r'\n?', lambda _: rendered, text, count=1)
    assert anchor in text, (name, anchor)
    return text.replace(anchor, rendered+anchor, 1)

data = json.loads((ROOT/'content/media-publication.json').read_text())
source = json.loads((ROOT/'evidence-data/media-wave1/source-capture.json').read_text())
packages = [p for p in data['packages'] if p['status'] == 'ready']
by_id = {p['id']:p for p in packages}
for p in packages:
    assert (ROOT/p['card'].lstrip('/')).is_file(), 'Missing reviewed document card: '+p['card']
captures = {v['id']:v for v in source['videos']}
captions = {c['sourceUrl']:c for c in source['captions']}
records = [r for r in data['media'] if r['status']=='ready' and r['package'] in by_id]
assert len({r['route'] for r in records})==len(records), 'Duplicate media routes'
assert len({r['sourceUrl'] for r in records})==len(records), 'Duplicate source publication'
associated_uploads = [dict(a, canonicalWatchRoute=r['route']) for r in records for a in r.get('associatedUploads',[])]
assert len({a['youtubeId'] for a in associated_uploads})==len(associated_uploads), 'Duplicate associated upload'
assert not ({a['youtubeId'] for a in associated_uploads} & {r.get('youtubeId') for r in records}), 'Associated upload already has a watch page'
for a in associated_uploads:
    v=captures[a['youtubeId']]
    assert v['author']=='Grok Archive Hub' and v['channelId']=='UCtoujFSO4434iKT6HwmWEUA' and v['playability']=='OK'
    assert a['sourceUrl']=='https://www.youtube.com/watch?v='+a['youtubeId']

for r in records:
    assert r['route'].startswith('/videos/' if r['family']=='video' else '/reels/')
    if r['family']=='video':
        v=captures[r['youtubeId']]
        assert v['author']=='Grok Archive Hub' and v['channelId']=='UCtoujFSO4434iKT6HwmWEUA'
        assert v['playability']=='OK' and v['durationSeconds'] and v['publishDate']
    else:
        assert r['sourceUrl'] in captions and captions[r['sourceUrl']]['caption']

template=(ROOT/'investigations/barak-st-thomas-dec-2014.html').read_text()
header=re.search(r'<body[^>]*>([\s\S]*?)<main id="main">',template).group(1)
footer=template[template.index('  <footer'):]

def related(record):
    p=by_id[record['package']]
    others=[r for r in records if r['package']==p['id'] and r['route']!=record['route']]
    return '<section id="related"><h2>Follow this source trail</h2><p><a href="'+e(p['investigation'])+'">'+e(p['investigationTitle'])+'</a></p><ul>'+''.join('<li><a href="'+e(r['route'])+'">'+e(r['title'])+'</a></li>' for r in others)+'</ul><p><a href="'+e(p['entity'])+'">Person and entity context</a> · <a href="/reels">All reel source notes</a> · <a href="/videos">All watch pages</a></p></section>'

def source_register(p, selected):
    rows=[]
    for ident in selected:
        doc=p['documents'][ident]
        label=('DOJ '+ident) if ident.startswith('EFTA') else (('Barak leak id '+ident) if ident.isdigit() else p.get('documentLabels',{}).get(ident,ident))
        target=p.get('documentLinks',{}).get(ident)
        if target:
            link='<a href="'+e(target)+'" rel="noopener noreferrer">'+e(label)+' — '+e(p.get('documentLinkLabels',{}).get(ident,'publisher-hosted released PDF'))+'</a>'
        else:
            link='<a href="/archive/'+ident+'">'+e(label)+'</a>' if ident.startswith('EFTA') else e(label)
        rows.append('<li id="source-'+e(ident)+'"><h3>'+link+'</h3><p>'+e(doc)+'</p></li>')
    return '<section id="receipts"><h2>Document receipts and their limits</h2><ol class="media-receipts">'+''.join(rows)+'</ol><p>Leak IDs identify a separate mailbox source family. They are labeled rather than assigned invented public document URLs. An archive locator is not itself authentication of every statement in a document.</p></section>'

def render_page(route,title,description,body,schema,card):
    payload=json.dumps(schema,ensure_ascii=False).replace('<','\\u003c')
    return f'''<!doctype html><html lang="en" data-gah-shell="v3"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{e(title)} | GrokArchiveHub</title><meta name="description" content="{e(description)}">
<meta name="robots" content="index,follow"><meta name="gah-indexability-policy" content="index,follow"><meta name="gah-ad-eligible" content="false"><meta name="gah-ad-status" content="AD-EXCLUDE"><meta name="gah-ad-zone" content="none"><meta name="gah-adsense-approved" content="false">
<link rel="canonical" href="{BASE+route}"><meta property="og:site_name" content="GrokArchiveHub"><meta property="og:type" content="article"><meta property="og:title" content="{e(title)}"><meta property="og:description" content="{e(description)}"><meta property="og:url" content="{BASE+route}"><meta property="og:image" content="{BASE+card}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="Document and text card for {e(title)}">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="{e(title)}"><meta name="twitter:description" content="{e(description)}"><meta name="twitter:image" content="{BASE+card}">
<link rel="stylesheet" href="/assets/v3-ui-054.css"><link rel="stylesheet" href="/assets/consent-ui-054.css"><link rel="stylesheet" href="/assets/media-publication.css">
<script type="application/ld+json">{payload}</script></head><body data-family="MEDIA_PUBLICATION">{header}<main id="main">{body}</main>{footer}'''.rstrip()+'\n'

for r in records:
    p=by_id[r['package']]
    publication=r.get('publicationDate',data['publicationDate'])
    from datetime import date
    publication_label=date.fromisoformat(publication).strftime('%B %d, %Y').replace(' 0',' ')
    description=r['description']
    body='<header class="article-hero wrap-narrow"><p class="kicker">'+('Watch and verify' if r['family']=='video' else 'Reel source notes')+' · '+e(p['series'])+'</p><h1 class="headline">'+e(r['title'])+'</h1><p class="lede">'+e(description)+'</p><p class="byline">GrokArchiveHub · Source notes published <time datetime="'+publication+'">'+publication_label+'</time></p></header><article class="prose wrap-narrow media-article">'
    citations=[('DOJ EFTA ' if x.startswith('EFTA') else ('Barak leak id ' if x.isdigit() else 'Primary source '))+x for x in r['documents']]
    if r['family']=='video':
        v=captures[r['youtubeId']];duration='PT'+str(int(v['durationSeconds']))+'S';embed='https://www.youtube-nocookie.com/embed/'+r['youtubeId']
        body+='<section id="watch"><h2>Watch the video</h2><p><a href="'+e(r['sourceUrl'])+'" rel="noopener noreferrer">Watch on GAH’s YouTube channel</a> · '+e(v['durationSeconds'])+' seconds · YouTube publication: <time datetime="'+e(v['publishDate'])+'">'+e(v['publishDate'][:10])+'</time></p><div class="media-player'+(' media-player-short' if r['format']=='short' else '')+'"><iframe src="'+embed+'" title="'+e(r['title'])+'" loading="eager" allow="encrypted-media; picture-in-picture" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></div><p class="small">The embedded player connects to YouTube. GAH’s Archivist is openly a synthetic character; the narration is synthetic and the cited records are the evidence.</p></section>'
        body+='<section id="summary"><h2>What this video examines</h2>'+''.join('<p>'+e(x)+'</p>' for x in r['analysis'])+'</section>'
        body+='<details class="media-original"><summary>Original YouTube title and published description</summary><p><strong>'+e(v['title'])+'</strong></p><div class="media-caption">'+e(v['description'] or 'No published YouTube description was available in the retrieved metadata. These source notes are not a narration transcript.')+'</div></details>'
        body+='<p class="small">These source notes accompany the video; a narration transcript is not available on this page. Use YouTube’s caption controls where available.</p>'
        if r.get('associatedUploads'):
            body+='<section id="associated-uploads"><h2>Earlier upload of this investigation</h2><p>Upload comparison reviewed <time datetime="'+e(r['updatedDate'])+'">'+e(r['updatedDate'])+'</time>.</p><ul>'
            for a in r['associatedUploads']:
                av=captures[a['youtubeId']]
                body+='<li><a href="'+e(a['sourceUrl'])+'" rel="noopener noreferrer">'+e(av['title'])+'</a> · YouTube publication: '+e(av['publishDate'][:10])+' · '+e(av['durationSeconds'])+' seconds.</li>'
            body+='</ul><p>'+e(r['captionComparisonSummary'])+'</p></section>'

        schema={'@context':'https://schema.org','@type':'VideoObject','name':r['title'],'description':description,'thumbnailUrl':[BASE+p['card']],'uploadDate':v['publishDate'],'duration':duration,'embedUrl':embed,'url':BASE+r['route'],'publisher':{'@type':'Organization','@id':BASE+'/#organization','name':'GrokArchiveHub'},'citation':citations,'isAccessibleForFree':True}
        if r.get('updatedDate'):schema['dateModified']=r['updatedDate']
    else:
        c=captions[r['sourceUrl']]
        body+='<section id="summary"><h2>Read the document behind the reel</h2>'+''.join('<p>'+e(x)+'</p>' for x in r['analysis'])+'</section>'
        body+='<section id="original-caption"><h2>Original published Instagram caption</h2><p><a href="'+e(r['sourceUrl'])+'" rel="noopener noreferrer">Open the original GAH reel</a> · Instagram publication: <time datetime="'+r['socialDate']+'">'+r['socialDate']+'</time></p><blockquote class="media-caption">'+e(c['caption'])+'</blockquote><p class="small">Caption preserved from the public post metadata. It is the social publication, not a new finding. The document readings and limitations on this page control the interpretation.</p></section>'
        schema={'@context':'https://schema.org','@type':'Article','headline':r['title'],'description':description,'datePublished':publication,'dateModified':publication,'author':{'@type':'Organization','name':'GrokArchiveHub'},'publisher':{'@type':'Organization','@id':BASE+'/#organization','name':'GrokArchiveHub'},'mainEntityOfPage':BASE+r['route'],'image':BASE+p['card'],'citation':citations,'isAccessibleForFree':True}
    body+=source_register(p,r['documents'])
    body+='<section id="limits" class="media-limit"><h2>What this does not prove</h2><p>'+e(p['limits'])+'</p>'
    if r.get('extraLimit'):body+='<p>'+e(r['extraLimit'])+'</p>'
    body+='</section><section id="questions"><h2>Open questions and records still needed</h2><ul>'+''.join('<li>'+e(q)+'</li>' for q in p['questions'])+'</ul></section>'
    body+=related(r)+'<p class="small">Source method: these notes connect released source records to GAH’s published social material. Corpus counts in the original caption are attributed to that publication’s search scope, not independent people, contacts or findings. See <a href="/methodology">methodology</a>, <a href="/editorial-policy">editorial responsibility</a> and <a href="/corrections">corrections</a>.</p></article>'
    save(r['route'][1:]+'.html',render_page(r['route'],r['title'],description,body,schema,p['card']))

def cards(items):
    return '<div class="media-grid">'+''.join('<article class="media-card"><p class="kicker">'+e('Video' if r['family']=='video' else 'Reel source notes')+'</p><h3><a href="'+e(r['route'])+'">'+e(r['title'])+'</a></h3><p>'+e(r['description'])+'</p><p class="small">Receipts: '+e(' · '.join(r['documents']))+'</p></article>' for r in items)+'</div>'

for family,route,title,intro in [
    ('video','/videos','GrokArchiveHub Videos: Watch, Read and Verify','Watch GAH’s published documentaries and Shorts with original metadata, documentary source notes, responses and their limits. Browse the Barak, Ryan, banking, victim-notification and research-tool source trails.'),
    ('reel','/reels','GrokArchiveHub Reels: The Documents Behind the Story','Permanent source notes for GAH’s Instagram reporting: Famous Names, News Desk and the MCC arc, with published captions, document receipts and their limits.')]:
    selected=[r for r in records if r['family']==family]
    selected.sort(key=lambda r:captures[r['youtubeId']]['publishDate'] if family=='video' else r['socialDate'],reverse=True)
    body='<header class="article-hero wrap-narrow"><p class="kicker">GrokArchiveHub · '+str(len(selected))+' reviewed publications</p><h1 class="headline">'+title+'</h1><p class="lede">'+intro+'</p></header><article class="prose wrap-wide"><section><h2>Browse by source trail</h2>'
    for p in packages:
        items=[r for r in selected if r['package']==p['id']]
        if items:body+='<section class="media-series"><h2>'+e(p['series'])+'</h2><p><a href="'+e(p['investigation'])+'">Open the source trail</a></p>'+cards(items)+'</section>'
    body+='</section><p><a href="/about">About GrokArchiveHub</a> · <a href="/topics">Explore research topics</a> · <a href="'+('/reels' if family=='video' else '/videos')+'">'+('Reel source notes' if family=='video' else 'Video watch pages')+'</a></p></article>'
    schema={'@context':'https://schema.org','@type':'CollectionPage','name':title,'url':BASE+route,'mainEntity':{'@type':'ItemList','itemListElement':[{'@type':'ListItem','position':i+1,'url':BASE+r['route'],'name':r['title']} for i,r in enumerate(selected)]}}
    save(route[1:]+'.html',render_page(route,title,intro,body,schema,'/assets/media-grokarchivehub.png'))

# One manifest drives every navigation surface. New ready records participate on rebuild.
all_links='<ul>'+''.join('<li><a href="'+e(r['route'])+'">'+e(r['title'])+'</a></li>' for r in records)+'</ul>'
discovery='<section class="media-discovery"><p class="kicker">New source-linked media · October 24, 2026</p><h2>Watch the story. Check the documents.</h2><p><a href="/videos">GAH video watch pages</a> · <a href="/reels">Reel source notes</a></p>'+all_links+'</section>'
for relative in ['latest.html','entities.html','about.html']:
    text=(ROOT/relative).read_text()
    if relative=='entities.html':
        groups=''
        for entity,title in [('barak','Ehud Barak: St. Thomas'),('leon-black','Leon Black and Gratitude America')]+[(p['id'],p['series']) for p in packages if p['id'] not in {'barak','black','gratitude'}]:
            items=[r for r in records if by_id[r['package']]['entity'].endswith('#media-'+entity) or (entity=='barak' and r['package']=='barak')]
            groups+='<section id="media-'+entity+'"><h2>'+title+'</h2>'+cards(items)+'</section>'
        text=block(text,'GAH-MEDIA-DISCOVERY',groups,'<main id="main">')
    elif relative=='about.html':
        identity='<section class="media-brand"><h2>GrokArchiveHub: the official publication and its channels</h2><p>GrokArchiveHub, also written Grok Archive Hub or GAH, is an independent investigative publication and public evidence archive. This website is the permanent home for its investigations, source notes, corrections and research tools. Its social channels introduce the work and link readers back to the evidence.</p><p><a href="https://www.instagram.com/grokarchivehub/" rel="me noopener noreferrer">Instagram @grokarchivehub</a> · <a href="https://www.youtube.com/@GrokArchiveHub" rel="me noopener noreferrer">YouTube @GrokArchiveHub</a> · <a href="https://x.com/DaneMilSpec" rel="me noopener noreferrer">X @DaneMilSpec</a> · <a href="https://www.reddit.com/r/GrokArchiveHub/" rel="me noopener noreferrer">Reddit r/GrokArchiveHub</a></p><p>The Archivist is a disclosed synthetic character. Synthetic narration does not replace the original records or establish facts. <a href="/about-the-operator">Editorial responsibility and the operator</a> · <a href="/editorial-policy">Editorial standards</a></p></section>'
        text=block(text,'GAH-BRAND-IDENTITY',identity,'<article class="content wide">')
        text=block(text,'GAH-MEDIA-DISCOVERY',discovery,'<article class="content wide">')
    else:text=block(text,'GAH-MEDIA-DISCOVERY',discovery,'<main id="main">')
    save(relative,text)

for p in packages:
    associated=[r for r in records if by_id[r['package']]['investigation']==p['investigation']]
    if p['investigation'].startswith(('/archive/','/reels/','https://')):
        continue # Source access records are not editable investigation pages.
    text=(ROOT/(p['investigation'][1:]+'.html')).read_text()
    content='<section class="media-discovery"><h2>Related GAH videos and reel source notes</h2>'+cards(associated)+'</section>'
    # Related media follows the investigation; its text and headings remain unchanged.
    text=block(text,'GAH-MEDIA-COMPANIONS',content,'</article>') if '</article>' in text else block(text,'GAH-MEDIA-COMPANIONS',content,'</main>')
    save(p['investigation'][1:]+'.html',text)
barak=(ROOT/'barak/entities.html').read_text()
barak=block(barak,'GAH-MEDIA-BARAK',cards([r for r in records if r['package']=='barak']),'<main id="main">')
save('barak/entities.html',barak)

home=(ROOT/'index.html').read_text()
website={'@context':'https://schema.org','@type':'WebSite','@id':BASE+'/#website','url':BASE+'/','name':'GrokArchiveHub','alternateName':['Grok Archive Hub','GAH'],'publisher':{'@id':BASE+'/#organization'}}
home=block(home,'GAH-WEBSITE-IDENTITY','<script type="application/ld+json">'+json.dumps(website)+'</script>','<head>')
home=block(home,'GAH-MEDIA-HOME','<p class="wrap media-home"><a href="/about">About GrokArchiveHub and its official channels</a> · <a href="/videos">Watch GAH videos with source notes</a> · <a href="/reels">Read the documents behind the reels</a></p>','</main>')
save('index.html',home)

for relative in ['index.html','about.html','latest.html','entities.html','barak/entities.html']+[p['investigation'][1:]+'.html' for p in packages if not p['investigation'].startswith(('/archive/','/reels/','https://'))]:
    # The existing story templates remain intact; only their new media sections use this sheet.
    text=(ROOT/relative).read_text()
    if '/assets/media-publication.css' not in text:
        text=text.replace('</head>','<link rel="stylesheet" href="/assets/media-publication.css">\n</head>',1)
        save(relative,text)

# Maintain the existing registry; never promote its private/draft pilot.
registry=json.loads((ROOT/'content/video-registry.json').read_text())
registry['videos']=[v for v in registry['videos'] if v['id'] not in {r['id'] for r in records if r['family']=='video'}]
video_urls=[]
for r in records:
    if r['family']!='video':continue
    v=captures[r['youtubeId']];p=by_id[r['package']];duration='PT'+v['durationSeconds']+'S'
    registry['videos'].append({'id':r['id'],'slug':r['route'].split('/')[-1],'status':'published','title':r['title'],'description':r['description'],'shortDescription':r['description'],'youtubeVideoId':r['youtubeId'],'youtubeUrl':r['sourceUrl'],'thumbnailUrl':BASE+p['card'],'durationIso8601':duration,'uploadDate':v['publishDate'],'publishDate':v['publishDate'],'updatedDate':r.get('updatedDate',r.get('publicationDate',data['publicationDate'])),'category':p['series'],'tags':r['documents'],'transcriptPath':'','captionsPath':'','evidenceLinks':[{'label':x,'url':'/archive/'+x} for x in r['documents'] if x.startswith('EFTA')],'archiveIds':r['documents'],'batesIds':[x for x in r['documents'] if x.startswith('EFTA')],'relatedArchiveDocuments':[],'relatedInvestigation':{'title':p['investigationTitle'],'url':p['investigation']},'factualStatusLabels':['documented','inference','unresolved'],'featured':r['format']=='long','visibility':'public','madeForKids':False,'language':'en','recordingDate':'','scheduledPublishAt':'','xPublicationStatus':'not-requested'})
    video_urls.append({'loc':BASE+r['route'],'lastmod':r.get('updatedDate',r.get('publicationDate',data['publicationDate'])),'video':{'thumbnail_loc':BASE+p['card'],'title':r['title'],'description':r['description'],'player_loc':'https://www.youtube-nocookie.com/embed/'+r['youtubeId'],'publication_date':v['publishDate']}})
registry['updatedAt']=max(r.get('updatedDate',r.get('publicationDate',data['publicationDate'])) for r in records)+'T00:00:00Z'
save('content/video-registry.json',json.dumps(registry,ensure_ascii=False,indent=2)+'\n')
save('content/video-sitemap.json',json.dumps({'schemaVersion':1,'generatedFrom':'content/media-publication.json','hub':{'loc':BASE+'/videos','lastmod':data['publicationDate']},'videoUrls':video_urls},ensure_ascii=False,indent=2)+'\n')

worker=(ROOT/'_worker.js').read_text()
video_routes=[r['route'] for r in records if r['family']=='video']
routes=[r['route'] for r in records]+['/videos','/reels']
worker=jsblock(worker,'GAH-MEDIA-VIDEO-PATHS','const GAH_MEDIA_VIDEO_PATHS = new Set('+json.dumps(video_routes)+');','const FRONTDOOR_ROUTE_ASSETS = new Map([')
route_lines=''.join('  ['+json.dumps(r)+', '+json.dumps(r+'.html')+'],\n' for r in routes)
start='  // GAH-MEDIA-ROUTES BEGIN';end='  // GAH-MEDIA-ROUTES END'
route_block=start+'\n'+route_lines+end+'\n'
if start in worker:worker=re.sub(re.escape(start)+r'[\s\S]*?'+re.escape(end)+r'\n?',lambda _:route_block,worker,count=1)
else:worker=worker.replace('const FRONTDOOR_ROUTE_ASSETS = new Map([','const FRONTDOOR_ROUTE_ASSETS = new Map([\n'+route_block,1)
static_routes=[r for r in routes if r not in video_routes]
sitemap_lines=''.join('  ['+json.dumps(BASE+r)+', "'+data['publicationDate']+'"],\n' for r in static_routes)
start='  // GAH-MEDIA-SITEMAP BEGIN';end='  // GAH-MEDIA-SITEMAP END';rendered=start+'\n'+sitemap_lines+end+'\n'
if start in worker:worker=re.sub(re.escape(start)+r'[\s\S]*?'+re.escape(end)+r'\n?',lambda _:rendered,worker,count=1)
else:worker=worker.replace('const CORE_SITEMAP_ENTRIES = [','const CORE_SITEMAP_ENTRIES = [\n'+rendered,1)
worker=worker.replace('  ["/videos", "video-index-not-yet-substantive"],\n','')
topic_html='<section><h2>Watch and verify: GAH media source notes</h2><p>Reviewed source trails, with the original social publications and their limits.</p><p><a href="/videos">Video watch pages</a> · <a href="/reels">Reel source notes</a></p>'+all_links+'</section>'
worker=block(worker,'GAH-MEDIA-TOPICS',topic_html,'<h2>Current Public Topic Lanes</h2>')
worker=worker.replace('const GAH_SOCIAL_PROFILE_URLS = [GAH_X_PROFILE_URL, GAH_REDDIT_PROFILE_URL];','const GAH_SOCIAL_PROFILE_URLS = [GAH_X_PROFILE_URL, GAH_REDDIT_PROFILE_URL, "https://www.instagram.com/grokarchivehub/", "https://www.youtube.com/@GrokArchiveHub"];')
worker=worker.replace('    name: "Grok Archive Hub",\n    url: "https://grokarchivehub.com/",\n    sameAs:', '    name: "GrokArchiveHub",\n    alternateName: ["Grok Archive Hub", "GAH"],\n    url: "https://grokarchivehub.com/",\n    sameAs:',1)
worker=worker.replace('function htmlContentSecurityPolicy(env = {}, origin = "") {','function htmlContentSecurityPolicy(env = {}, origin = "", videoPage = false) {',1)
worker=worker.replace('"frame-src \'self\' https://fundingchoicesmessages.google.com https://www.google.com https://www.gstatic.com https://bid.g.doubleclick.net https://tpc.googlesyndication.com",','"frame-src \'self\' https://fundingchoicesmessages.google.com https://www.google.com https://www.gstatic.com https://bid.g.doubleclick.net https://tpc.googlesyndication.com" + (videoPage ? " https://www.youtube-nocookie.com" : ""),',1)
worker=worker.replace('headers.set("Content-Security-Policy", htmlContentSecurityPolicy(env, origin));','const videoPage = typeof requestOrOrigin !== "string" && requestOrOrigin?.url && GAH_MEDIA_VIDEO_PATHS.has(cleanPath(new URL(requestOrOrigin.url).pathname));\n  headers.set("Content-Security-Policy", htmlContentSecurityPolicy(env, origin, Boolean(videoPage)));',1)
if '${video.content_loc ?' not in worker:
    worker=worker.replace('<video:content_loc>${xmlEscape(video.content_loc)}</video:content_loc>', '${video.content_loc ? `<video:content_loc>${xmlEscape(video.content_loc)}</video:content_loc>` : ""}',1)
save('_worker.js',worker)

# Full scope and held inventory stay explicit; unreviewed entries never create a page.
selected={r['youtubeId'] for r in records if r['family']=='video'}
held=[{'youtubeId':ident,'channelLabel':label,'reason':'Not yet reviewed for a source-complete watch page; no page generated.'} for ident,label in source['channelInventory'].items() if ident not in selected and ident not in {a['youtubeId'] for a in associated_uploads}]
save('evidence-data/media-wave1/publication-inventory.json',json.dumps({'scope':'Reviewed media catalog; remaining master-script inventory is held until source review.','publicationDate':data['publicationDate'],'readyRoutes':routes,'upgradedInvestigations':[p['investigation'] for p in packages],'heldYouTube':held,'associatedYouTube':associated_uploads,'transcriptGap':source['transcriptStatus'],'olderBarakLong':'0WSgi2Ds17o is associated with the existing watch page after metadata and automatic-caption comparison; identical media is not certified.'},ensure_ascii=False,indent=2)+'\n')
print(('STALE: ' if CHECK and CHANGES else 'Generated: ')+', '.join(CHANGES or ['no changes']))
if CHECK and CHANGES:sys.exit(1)
