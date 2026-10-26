"""Apply the three manually reviewed MCC source-guide updates; never change indexing policy."""
from pathlib import Path
import html,json,re,sys
root=Path(__file__).resolve().parents[1];check='--check' in sys.argv;changed=[]
e=lambda s:html.escape(str(s),quote=True)
for item in json.loads((root/'content/mcc-source-guide-updates-20261026.json').read_text()):
 ident=item['id'];f=root/'archive'/(ident+'.html');old=f.read_text();title=ident+': '+item['title'];url='https://grokarchivehub.com/archive/'+ident
 body='<p class="eyebrow">Reviewed source guide · October 26, 2026</p><h1>'+e(title)+'</h1><p class="lede">'+e(item['lead'])+'</p>'
 body+='<section><h2>October 26 source review</h2>'+''.join('<p>'+e(x)+'</p>' for x in item['evidence'])+'</section>'
 body+='<section><h2>What this does not establish</h2><p>'+e(item['limits'])+'</p></section>'
 body+='<section><h2>Source access and provenance</h2><p><a href="'+e(item['mirror'])+'">Released-record PDF via Roll Call mirror</a> · <a href="https://www.justice.gov/epstein/search">Official DOJ source search</a></p><p>The mirrored page was visually inspected. A matching EFTA footer identifies the record reviewed; it is not a fresh byte-for-byte authentication against DOJ. No raw image, signature, private contact detail or unreviewed OCR is reproduced here.</p></section>'
 body+='<section><h2>Read the reel with its documents</h2><p><a href="'+e(item['companion'])+'">Original GAH caption, source reading and open questions</a></p><p><a href="/investigations/mcc-final-48-hours-source-chain">MCC source-chain investigation</a> · <a href="/corrections">Corrections</a></p></section>'
 new=re.sub(r'(<main\b[^>]*>)[\s\S]*?(</main>)',lambda m:m[1]+body+m[2],old,count=1)
 new=re.sub(r'<title>[\s\S]*?</title>',lambda _: '<title>'+e(title+' | Grok Archive Hub')+'</title>',new,count=1)
 for tag,value in [('name="description"',item['lead']),('property="og:title"',title),('property="og:description"',item['lead']),('name="robots"',item['robots']),('name="gah-indexability-policy"','noindex,follow' if ident=='EFTA00035828' else 'index,follow')]:
  new=re.sub(r'<meta\b(?=[^>]*'+re.escape(tag)+r')[^>]*>',lambda _: '<meta '+tag+' content="'+e(value)+'">',new,count=1)
 schema={'@context':'https://schema.org','@type':'Article','headline':title,'description':item['lead'],'url':url,'mainEntityOfPage':url,'datePublished':'2026-10-21','dateModified':'2026-10-26','author':{'@type':'Organization','name':'GrokArchiveHub'},'citation':item['mirror'],'isAccessibleForFree':True}
 new=re.sub(r'<script\b[^>]*type="application/ld\+json"[^>]*>[\s\S]*?</script>',lambda _:'<script type="application/ld+json">'+json.dumps(schema,ensure_ascii=False).replace('<','\\u003c')+'</script>',new,count=1)
 assert '<img' not in new and '<iframe' not in new
 if new!=old:
  changed.append(str(f.relative_to(root)))
  if not check:f.write_text(new)
print(('STALE: ' if check and changed else 'Source guides: ')+', '.join(changed or ['no changes']))
if check and changed:sys.exit(1)
