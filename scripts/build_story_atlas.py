"""Render the approved v3.82 publication copy from the reviewed public copy.
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
assert len(data['stories'])==82
assert sum(s['tier']=='confirmed' for s in data['stories'])==30
assert sum(s['tier']=='probable' for s in data['stories'])==52
assert data['fragments']==139
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
assert len(blocks)==82
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
(root/'atlas/coverage.txt').write_text('Story Atlas v3.82 — current DS8 scope\n\n82 mapped stories; 139 fragments; 2,458 story-anchor references across all sets. Surveyed counts, not a corpus census.\n\nPartial queue: 4,167 = 3,899 condensed text-layer reads + 82 opening-only reads + four structure scans + 55 near-duplicates + 127 bulk items dropped after earlier screening. Image queue: 223 lower-confidence OCR reads + 165 placeholders = 388. The queues overlap by 86 IDs. Two capped skips characterized; 66 Amex/mega documents, HO full pass and DS9 torrent deferred. DS8 is not fully read. OCR-dependent details require image confirmation; EFTA00032184 remains unreadable.\n\nHistorical coverage table follows. Older DS8 estimates below are superseded by the current accounting above; do not add them together.\n\n'+coverage+'\n\n## Historical unmapped remainder\n\n'+unmapped+'\n')
body=f'''<a class="skip" href="#main">Skip to content</a>
<header class="atlas-header"><a class="atlas-brand" href="/">GAH <span>GROK ARCHIVE HUB</span></a><nav aria-label="Primary"><a href="/investigations">Investigations</a><a href="/search">Search records</a><a href="/methodology">Methodology</a></nav></header>
<main id="main"><section class="atlas-hero"><p class="eyebrow">THE DOCUMENTS, CONNECTED · V3.82</p><h1>Story Atlas</h1><p class="lede">A map of connected stories in the public Epstein document corpus, built from the documents. Follow the people, events, and money through cited records to an endpoint—or the dated point where the trail goes cold.</p><div class="stats" aria-label="Atlas counts"><div><strong>82</strong><span>mapped stories</span></div><div><strong>30</strong><span>confirmed chains</span></div><div><strong>52</strong><span>probable chains</span></div><div><strong>139</strong><span>fragments</span></div></div><p class="scope">221 entries · Corpus scope: 1,380,938 documents · November 9, 2026</p><div class="hero-actions"><a class="atlas-button" href="#story-index">Explore the stories ↓</a><a href="/atlas/data.json" download="gah-story-atlas-v3.82.json">Download the data ↗</a></div></section>
<aside class="reading-note"><strong>A survey, not a census.</strong> These are mapped stories from surveyed material, not the total number of stories in the files. A confirmed chain confirms only the claim described in that entry. Association does not establish wrongdoing; allegations remain allegations; a proposed meeting does not establish attendance. <a href="#coverage">See exactly what was examined.</a></aside>
<nav class="jump-links" aria-label="Atlas sections"><a href="#story-index">Story index</a><a href="#confirmed">Confirmed</a><a href="#probable">Probable</a><a href="#fragments">Fragments</a><a href="#coverage">Coverage</a><a href="#open-flags">Open flags</a></nav>
<section id="story-index"><p class="eyebrow">FIND A THREAD</p><h2>Story index</h2><p>Search titles, dates, people, places, or document IDs. Every entry below remains available without JavaScript.</p><div class="filters" id="atlas-filters" hidden><label>Search stories<input id="atlas-search" type="search" placeholder="Try Bannon, NPA, a date, or an EFTA ID"></label><label>Confidence tier<select id="atlas-tier"><option value="all">All 82 stories</option><option value="confirmed">Confirmed chains (30)</option><option value="probable">Probable chains (52)</option></select></label></div><p id="atlas-results" role="status" aria-live="polite">82 stories</p><ol class="story-index">{''.join(cards)}</ol><p id="atlas-empty" hidden>No matching stories. Try another name, date, or ID.</p></section>
<section id="confirmed"><p class="eyebrow">CONNECTED RECORDS</p><h2>Confirmed chains <span class="count">30</span></h2><p>Read each entry’s endpoint, qualifications, and verification status. Open an entry to follow its cited records.</p>{''.join(e for e,b in zip(entries,blocks) if b[3]['tier']=='confirmed')}</section>
<section id="probable"><h2>Probable chains <span class="count">52</span></h2>{''.join(e for e,b in zip(entries,blocks) if b[3]['tier']=='probable')}</section>
<section id="fragments"><p class="eyebrow">TRAILS STILL TO CONNECT</p><h2>Fragments <span class="count">139</span></h2>{render(section('Fragments'))}</section>
<section id="verification"><h2>Verification and review scope</h2><p><strong>Completed DS8 passes through v3.82:</strong> the actionable first-open pass, non-protected substantive deepening pass, and 1,050-document protected pass are complete at their stated depths. The protected pass added 191 anchors. The cumulative atlas now contains 2,458 story-anchor references across all sets, 82 mapped stories and 139 fragments. These are surveyed counts, not a corpus census.</p><p>The inherited 4,167-document partial queue now comprises 3,899 condensed text-layer reads, 82 opening-only reads, four structure scans, 55 near-duplicates with residual lines read, and 127 bulk items dropped after earlier screening. The image queue contains 223 lower-confidence OCR reads and 165 “No Images Produced” placeholders. The two queues overlap by 86 IDs and must not be added as distinct-document totals. The two earlier capped skips were characterized without an established story connection.</p><p><strong>Reading method:</strong> condensed reads inspect lines not already read in another document or packet, omitting repeated lines, selected address headers and confidentiality footers. This does not establish human review or a full page-image audit. Opening-only reads and scans are not full reads. A dropped bulk item is a screening decision, not proof it contains no story.</p><p><strong>Still open:</strong> completing the 82 opening-only reads and four structure scans; reassessing the 127 screened bulk items if warranted; image confirmation of OCR-dependent details, especially EFTA00032184 and the two P20 deeds; 66 deferred Amex/mega documents. The House Oversight full pass and DS9 torrent remain deferred. DS8 is not represented as fully read.</p><p>The source crew reports 33 primary and 25 independent checks passing for each protected-pass cut, with disclosed adaptations for the changed reading scope. Publication review reconciled the supplied ledgers and anchor lists and checked the site output; it did not repeat source-level validation against the full corpus. Victim and witness narratives are minimized in this public copy; placeholders never establish distinct-person counts or cross-document identity.</p><div class="table-scroll" tabindex="0" role="region" aria-label="Historical verification table">{render(chr(10).join(m[0] for m in re.finditer(r'^## Document-level verification.*?(?=^## |\Z)',source,re.M|re.S)))}</div></section>
<section id="coverage"><p class="eyebrow">WHAT THIS MAP COVERS</p><h2>Coverage and limits</h2><p><strong>Historical coverage table.</strong> The supplied table retains v3.0/v3.2 survey figures and the older story-count headline. These are preserved as historical accounting, not current totals. This release has 82 mapped stories and 139 fragments; current DS8 reading depths and remaining limits are stated above. No full-corpus coverage percentage has been established.</p><p><a href="/atlas/coverage.txt">Coverage source text</a></p><div class="table-scroll" tabindex="0" role="region" aria-label="Corpus coverage table">{render(coverage)}</div><h3>Historical unmapped remainder</h3><p>The text below preserves earlier slice accounting. Its older DS8 unread estimates are superseded by the current pass accounting above; they must not be combined with current queues.</p>{render(unmapped)}</section>
<section id="open-flags"><p class="eyebrow">EXPLICIT OPEN ENDS</p><h2>Open flags</h2><ul><li><a href="#story-27">Interlochen proffer attribution</a>: the earlier description of Gary Bloxsome as Interlochen’s counsel is withdrawn pending source review. The proffer leg is not relied on to establish an Interlochen event.</li><li><a href="#story-4">MCC records</a>: Aug 12 interview participation accounts, Aug 10 timing milestones, July 25 watch labels and tape-conversion paperwork remain qualified or unresolved. A changed plan or different event definition may explain an apparent discrepancy; no intentional misconduct is inferred.</li><li><a href="#story-p20">Property deeds</a>: the 2011 conveyances at EFTA00020949 and EFTA00020959 rest on lower-confidence OCR and require image confirmation.</li><li>Anchor eligibility: IDs previously mentioned only in queue notes or range boundaries were excluded by the crew’s strict novelty check. They are not silently added here; a mention alone does not establish a substantive citation.</li><li><a href="#story-p19">“Lawrence H. Summers” in the 2014 will</a>: identity with P12’s Larry Summers is not established; no document states the equation.</li><li><a href="#story-13">Nidal / “Ronen Cohen”</a>: whether they are different people is not established. The Barak-traveled-as-Cohen hypothesis remains unproven.</li><li>DS9’s 23 inaccessible files: the torrent route is explicitly deferred. Their status remains unclassified, not deleted.</li></ul></section>
<footer><p>Story Atlas v3.82 · November 9, 2026</p><p><a href="/atlas/data.json">Download JSON</a> · <a href="/editorial-policy">Editorial policy</a> · <a href="/corrections">Corrections</a></p></footer></main><script src="/frontdoor/atlas-v382.js" defer></script>'''
page='''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Story Atlas: 82 Document-Anchored Stories | Grok Archive Hub</title><meta name="description" content="Explore 82 mapped stories and 139 fragments in the Epstein document corpus, with document anchors, confidence tiers, endpoints, and explicit coverage limits."><meta name="robots" content="index,follow"><meta name="gah-ad-eligible" content="false"><meta name="gah-ad-status" content="AD-EXCLUDE"><link rel="canonical" href="https://grokarchivehub.com/atlas/"><meta property="og:title" content="Story Atlas | Grok Archive Hub"><meta property="og:description" content="82 mapped stories. 139 fragments. Follow the document chains and see where the evidence ends."><meta property="og:type" content="website"><meta property="og:url" content="https://grokarchivehub.com/atlas/"><link rel="stylesheet" href="/frontdoor/atlas-v382.css"></head><body>'''+body+'</body></html>'
(root/'atlas.html').write_text(page)
print(json.dumps({'stories':len(entries),'confirmed':30,'probable':52,'fragments':139,'json_sha256':hashlib.sha256(data_path.read_bytes()).hexdigest(),'coverage_preserved':True}))

# Keep machine discovery version-aligned with the published data.
import subprocess, sys
subprocess.run([sys.executable,str(root/'scripts/build_agent_atlas_catalog.py')],check=True)

# Prepare the reviewed public reader outside the request CPU budget.
subprocess.run(["node",str(root/"scripts/build_prepared_atlas.mjs")],check=True)

subprocess.run(["node",str(root/"scripts/build_bundled_atlas.mjs")],check=True)
