"""Render the approved v3.4 publication copy without changing entry text.
Run with the publication Markdown path and JSON path as arguments.
Requires Python-Markdown (build time only).
"""
import sys, re, json, html, hashlib
from pathlib import Path
import markdown
root=Path(__file__).resolve().parents[1]
source=Path(sys.argv[1]).read_text()
data_path=Path(sys.argv[2]); data=json.loads(data_path.read_text())
assert data['internal_only'] is False
assert len(data['stories'])==79
assert sum(s['tier']=='confirmed' for s in data['stories'])==30
assert sum(s['tier']=='probable' for s in data['stories'])==49
assert data['fragments']==123
esc=html.escape

def render(text):
    return markdown.markdown(text,extensions=['tables','fenced_code','sane_lists'])

def section(name):
    m=re.search(r'^## '+re.escape(name)+r'.*?\n(.*?)(?=^## |\Z)',source,re.M|re.S)
    assert m,name
    return m.group(1).strip()

stories={s['id']:s for s in data['stories']}
blocks=[]
for category in ['Confirmed chain','Probable']:
    text=section(category)
    parts=re.split(r'^### ((?:P)?\d+)\. (.+)\n',text,flags=re.M)
    for i in range(1,len(parts),3):
        sid,title,body=parts[i:i+3]; story=stories[sid]
        assert title==story['title'],(sid,title,story['title'])
        blocks.append((sid,title,body.strip(),story))
assert len(blocks)==79
cards=[];entries=[]
for sid,title,body,story in blocks:
    tier=story['tier'];anchor='story-'+sid.lower()
    cards.append(f'<li data-tier="{tier}" data-search="{esc((sid+" "+title+" "+body).lower(),quote=True)}"><a href="#{anchor}"><span class="story-number">{esc(sid)}</span><span>{esc(title)}</span><span class="tier {tier}">{tier.title()}</span></a></li>')
    content=render(body)
    # Link exact Bates IDs to the existing archive reader; never fabricate DOJ set URLs.
    dossiers={e['id'] for e in json.loads((root/'content/identifier-dossiers.json').read_text())['entries']}
    content=re.sub(r'\bEFTA\d{8}\b',lambda m:f'<a class="bates" href="'+('/archive/'+m[0] if m[0] in dossiers else '/search?q='+m[0])+f'">{m[0]}</a>',content)
    entries.append(f'<details class="story-entry" id="{anchor}" data-tier="{tier}"><summary><span class="story-number">{esc(sid)}</span><span>{esc(title)}</span><span class="tier {tier}">{tier.title()}</span></summary><div class="entry-body"><p class="verification">Verification: {esc(story.get("verification","As stated below"))}</p>{content}<p><a href="#story-index">Back to story index ↑</a></p></div></details>')
coverage=section('Coverage table')
unmapped=section('Unmapped remainder')
(root/'atlas').mkdir(exist_ok=True)
(root/'atlas/data.json').write_bytes(data_path.read_bytes())
# Keep the exact coverage source for a reproducible text-preservation assertion.
(root/'atlas/coverage.txt').write_text(coverage+'\n\n## Unmapped remainder (honest accounting, corrected)\n\n'+unmapped+'\n')
body=f'''<a class="skip" href="#main">Skip to content</a>
<header class="atlas-header"><a class="atlas-brand" href="/">GAH <span>GROK ARCHIVE HUB</span></a><nav aria-label="Primary"><a href="/investigations">Investigations</a><a href="/search">Search records</a><a href="/methodology">Methodology</a></nav></header>
<main id="main"><section class="atlas-hero"><p class="eyebrow">THE DOCUMENTS, CONNECTED · V3.4</p><h1>Story Atlas</h1><p class="lede">A map of connected stories in the public Epstein document corpus, built from the documents. Follow the people, events, and money through cited records to an endpoint—or the dated point where the trail goes cold.</p><div class="stats" aria-label="Atlas counts"><div><strong>79</strong><span>mapped stories</span></div><div><strong>30</strong><span>confirmed chains</span></div><div><strong>49</strong><span>probable chains</span></div><div><strong>123</strong><span>fragments</span></div></div><p class="scope">202 entries · Corpus scope: 1,380,938 documents · November 6, 2026</p><div class="hero-actions"><a class="atlas-button" href="#story-index">Explore the stories ↓</a><a href="/atlas/data.json" download="gah-story-atlas-v3.4.json">Download the data ↗</a></div></section>
<aside class="reading-note"><strong>A survey, not a census.</strong> These are mapped stories from surveyed material, not the total number of stories in the files. A confirmed chain confirms only the claim described in that entry. Association does not establish wrongdoing; allegations remain allegations; a proposed meeting does not establish attendance. <a href="#coverage">See exactly what was examined.</a></aside>
<nav class="jump-links" aria-label="Atlas sections"><a href="#story-index">Story index</a><a href="#confirmed">Confirmed</a><a href="#probable">Probable</a><a href="#fragments">Fragments</a><a href="#coverage">Coverage</a><a href="#open-flags">Open flags</a></nav>
<section id="story-index"><p class="eyebrow">FIND A THREAD</p><h2>Story index</h2><p>Search titles, dates, people, places, or document IDs. Every entry below remains available without JavaScript.</p><div class="filters" id="atlas-filters" hidden><label>Search stories<input id="atlas-search" type="search" placeholder="Try Bannon, NPA, a date, or an EFTA ID"></label><label>Confidence tier<select id="atlas-tier"><option value="all">All 79 stories</option><option value="confirmed">Confirmed chains (30)</option><option value="probable">Probable chains (49)</option></select></label></div><p id="atlas-results" role="status" aria-live="polite">79 stories</p><ol class="story-index">{''.join(cards)}</ol><p id="atlas-empty" hidden>No matching stories. Try another name, date, or ID.</p></section>
<section id="confirmed"><p class="eyebrow">CONNECTED RECORDS</p><h2>Confirmed chains <span class="count">30</span></h2><p>Read each entry’s endpoint, qualifications, and verification status. Open an entry to follow its cited records.</p>{''.join(e for e,b in zip(entries,blocks) if b[3]['tier']=='confirmed')}</section>
<section id="probable"><h2>Probable chains <span class="count">49</span></h2>{''.join(e for e,b in zip(entries,blocks) if b[3]['tier']=='probable')}</section>
<section id="fragments"><p class="eyebrow">TRAILS STILL TO CONNECT</p><h2>Fragments <span class="count">123</span></h2>{render(section('Fragments'))}</section>
<section id="verification"><h2>Verification and review scope</h2><p>The crews report source-document verification as described in each entry. Publication review checked the supplied corrected Markdown and changelog for consistency; it did not independently re-read the full corpus. The JSON download uses the supplied crew data. Publication changes are disclosed in its publication note; coverage tables retain historical survey figures and are labeled accordingly. Later survey scope and limitations are described in the v3.4 entries; no cumulative v3.4 coverage percentage is asserted.</p><div class="table-scroll" tabindex="0" role="region" aria-label="Verification table">{render(chr(10).join(m[0] for m in re.finditer(r'^## Document-level verification.*?(?=^## |\Z)',source,re.M|re.S)))}</div></section>
<section id="coverage"><p class="eyebrow">WHAT THIS MAP COVERS</p><h2>Coverage and limits</h2><p><strong>Historical coverage table.</strong> The supplied table retains v3.0/v3.2 survey figures and the older story-count headline. These are preserved as historical accounting, not current totals. This release has 79 stories and 123 fragments; later survey scope appears in the v3.4 entry updates. No cumulative v3.4 coverage percentage has been established.</p><p><a href="/atlas/coverage.txt">Coverage source text</a></p><div class="table-scroll" tabindex="0" role="region" aria-label="Corpus coverage table">{render(coverage)}</div><h3>Unmapped remainder</h3>{render(unmapped)}</section>
<section id="open-flags"><p class="eyebrow">EXPLICIT OPEN ENDS</p><h2>Carried open flags</h2><ul><li><a href="#story-p19">“Lawrence H. Summers” in the 2014 will</a>: identity with P12’s Larry Summers is not established; no document states the equation.</li><li><a href="#story-13">Nidal / “Ronen Cohen”</a>: whether they are different people is not established. The Barak-traveled-as-Cohen hypothesis remains unproven.</li><li>DS9’s 23 inaccessible files: the torrent route is explicitly deferred. Their status remains unclassified, not deleted.</li></ul></section>
<footer><p>Story Atlas v3.4 · November 6, 2026</p><p><a href="/atlas/data.json">Download JSON</a> · <a href="/editorial-policy">Editorial policy</a> · <a href="/corrections">Corrections</a></p></footer></main><script src="/frontdoor/atlas-v34.js" defer></script>'''
page='''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Story Atlas: 79 Document-Anchored Stories | Grok Archive Hub</title><meta name="description" content="Explore 79 mapped stories and 123 fragments in the Epstein document corpus, with document anchors, confidence tiers, endpoints, and explicit coverage limits."><meta name="robots" content="index,follow"><meta name="gah-ad-eligible" content="false"><meta name="gah-ad-status" content="AD-EXCLUDE"><link rel="canonical" href="https://grokarchivehub.com/atlas/"><meta property="og:title" content="Story Atlas | Grok Archive Hub"><meta property="og:description" content="79 mapped stories. 123 fragments. Follow the document chains and see where the evidence ends."><meta property="og:type" content="website"><meta property="og:url" content="https://grokarchivehub.com/atlas/"><link rel="stylesheet" href="/frontdoor/atlas-v34.css"></head><body>'''+body+'</body></html>'
(root/'atlas.html').write_text(page)
print(json.dumps({'stories':len(entries),'confirmed':30,'probable':49,'fragments':123,'json_sha256':hashlib.sha256(data_path.read_bytes()).hexdigest(),'coverage_preserved':True}))
