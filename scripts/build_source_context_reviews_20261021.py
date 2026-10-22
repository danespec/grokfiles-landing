from pathlib import Path
import json,html
root=Path(__file__).resolve().parents[1]
review_date='2026-10-21'
records=[
{
'id':'EFTA00067364','slug':'source-card-efta00067364-calendar-epstein',
'title':'A defense memorandum’s reference to requested calendars',
'description':'The calendar match is a subpoena quotation in a defense memorandum, not a produced calendar.',
'pages':11,'sha256':'c06476279304483040848db26cf4337e66bd23a6cc980befadd93025bef3e7d0',
'checked_pages':[1,2,11],'record_type':'Defense advocacy memorandum',
'finding':'The earlier Calendar label was too broad. The PDF is an 11-page Kirkland & Ellis memorandum arguing that prosecutors mishandled the Epstein matter. Its calendar reference appears in a footnote describing records requested from a defense investigator. It is not a calendar, appointment ledger or proof that the requested records were produced.',
'checks':[
['1 · EFTA00067364','The heading identifies Kirkland & Ellis and a summary of alleged misconduct in the Epstein matter.','The document presents defense counsel’s position; its accusations are not findings adopted by GAH.'],
['2 · EFTA00067365','Paragraph 9 and footnote 1 discuss a subpoena directed at a defense investigator. The footnote lists appointment calendars/datebooks among requested materials.','The word match describes the requested scope. It does not show a calendar entry, meeting, production return or attendee.'],
['11 · EFTA00067374','The concluding page asks for a further investigation before prosecution proceeds.','This reinforces the advocacy context; it is not a court ruling on the memorandum’s allegations.']],
'limits':'The subpoena cited as Tab 17 is not reproduced in this 11-page PDF. This review does not independently authenticate that subpoena, establish the completeness of any production, or assess every misconduct allegation. Redacted identities are not inferred.',
'correction':'The generic Calendar heading and unverified links to other document anchors have been replaced with the record’s actual type and page-specific limits.'
},
{
'id':'EFTA00082040','slug':'source-card-efta00082040-black-book-epstein',
'title':'An email chain containing a Black Book news reference',
'description':'A Black Book reference appears in a pasted news excerpt within a three-page email chain, not in an address-book scan.',
'pages':3,'sha256':'e8a4baf9a58f311154d3f66791c035c2133fc7cad806d685c8d1f647d80b8fe4',
'checked_pages':[1,2,3],'record_type':'Redacted email chain with pasted reporting and embedded email images',
'finding':'The phrase match is real, but the original Black Book label hid the source layer. Page 1 contains a pasted Bloomberg excerpt that discusses Epstein’s contact book. The three-page PDF is an email chain, not the book itself and not a complete list of its entries.',
'checks':[
['1 · EFTA00082040','A forwarded email dated July 26, 2019 contains a Bloomberg link and pasted reporting. The contact-book reference sits inside that reporting.','This establishes where the reference appears. It does not independently verify the news report or authenticate a contact-book entry.'],
['2 · EFTA00082041','An embedded email image shows a September 2005 business solicitation and forwarding text.','Its presence in the chain does not establish a completed investment or prove that a redacted account belonged to a particular person.'],
['3 · EFTA00082042','A second embedded email image concerns a 2005 meeting invitation; older forwarding text appears below it.','An invitation or later attribution is not evidence of attendance, agreement or completed action.']],
'limits':'The pasted news excerpt is a secondary source within the released record. A contact-book claim requires the actual book page and separate identity checks. This review does not identify redacted accounts, validate the embedded messages’ complete transmission history, or infer wrongdoing from correspondence.',
'correction':'The generic Black Book heading and unverified cross-document anchors have been replaced with the email-chain context. The copied news article is not reproduced here.'
},
{
'id':'EFTA00095936','slug':'source-card-efta00095936',
'title':'A shell-company match in the Parnas section of a news digest',
'description':'The shell-company match belongs to Parnas reporting inside a mixed SDNY news digest; it does not establish an Epstein-company link.',
'pages':19,'sha256':'685959b2819cccea8db6fe775c5c0e8ecf6d9c6d9ed7b868a84e9b706a1ce8e7',
'checked_pages':[1,2,5,6],'record_type':'SDNY news-clips email and multi-topic press compilation',
'finding':'The earlier Shell Company card omitted the article boundary. This 19-page PDF is a news digest dated February 5, 2020. Its shell-company phrase appears in reporting about Lev Parnas and campaign financing, separately from the digest’s Epstein coverage. Sharing one PDF does not establish a connection between the subjects.',
'checks':[
['1 · EFTA00095936','The email subject and attachment identify the February 5, 2020 SDNY news-clips digest.','The file is a compilation of press coverage, not a transaction record or investigative finding.'],
['2 · EFTA00095937','The contents list Epstein and Parnas as separate topics alongside several other matters.','The shared digest container is not evidence that the listed matters form one case or relationship.'],
['5–6 · EFTA00095940–EFTA00095941','Page 5 credits ProPublica and Ilya Marritz. The article continues on page 6, where the shell-company phrase discusses Parnas.','The match belongs to that press article. It does not establish an Epstein-related company, payment or financial link.']],
'limits':'This review verifies the phrase’s source context, not the underlying campaign-finance allegations. It does not treat the press compilation as a bank record or a substitute for the cited filings. No conclusion is drawn from redacted sender or recipient identities.',
'correction':'The old liability-focused keyword card, mismatched line anchor and copied OCR excerpt have been replaced with a page-based context correction. The file hash matches the hash previously displayed.'
}]
esc=lambda s:html.escape(str(s),quote=True)
nav='<header><nav aria-label="Primary"><a href="/">Grok Archive Hub</a> · <a href="/research-index">Research index</a> · <a href="/methodology">Methodology</a> · <a href="/corrections">Corrections</a></nav></header>'
style=':root{color-scheme:dark}body{margin:0;background:#151b17;color:#e9ebdf;font:17px/1.65 system-ui,sans-serif}header,main,footer{max-width:1000px;margin:auto;padding:24px}a{color:#f0c08a}h1,h2{line-height:1.2;color:#fff2d8}.lede{font-size:1.15rem}.note{padding:18px;border-left:3px solid #c3a06b;background:#202a22}table{border-collapse:collapse;width:100%;font-size:15px}td,th{padding:13px;border:1px solid #627b61;text-align:left;vertical-align:top}code{overflow-wrap:anywhere}section{margin:32px 0}.table-wrap{overflow-x:auto}table{min-width:620px}.byline{font-size:15px}'
def page(title,description,path,body,schema):
 return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+esc(title)+' | Grok Archive Hub</title><meta name="description" content="'+esc(description)+'"><meta name="robots" content="noindex,follow"><link rel="canonical" href="https://grokarchivehub.com'+path+'"><script type="application/ld+json">'+json.dumps(schema,ensure_ascii=False,separators=(',',':')).replace('<','\\u003c')+'</script><style>'+style+'</style></head><body><a href="#main">Skip to content</a>'+nav+'<main id="main">'+body+'</main><footer><a href="/about-the-operator">About the operator</a> · <a href="/editorial-policy">Editorial policy</a> · <a href="/contact">Contact</a></footer></body></html>\n'
dest=root/'research/evidence';dest.mkdir(parents=True,exist_ok=True)
for r in records:
 path='/research/evidence/'+r['slug']
 body='<p>Source context review · Completed October 21, 2026</p><h1>'+esc(r['id']+': '+r['title'])+'</h1><p class="lede">'+esc(r['finding'])+'</p>'
 body+='<p class="byline"><a rel="author" href="/about-the-operator#editorial-responsibility">Grok Archive Hub Editorial Desk</a> · AI-assisted source review</p>'
 body+='<section><h2>Page checks and what they establish</h2><div class="table-wrap"><table><thead><tr><th>PDF page · visible identifier</th><th>Observed source context</th><th>Supported conclusion</th></tr></thead><tbody>'+''.join('<tr>'+''.join('<td>'+esc(v)+'</td>' for v in row)+'</tr>' for row in r['checks'])+'</tbody></table></div></section>'
 body+='<section><h2>What remains unverified</h2><p>'+esc(r['limits'])+'</p></section>'
 body+='<section><h2>Correction record</h2><p>'+esc(r['correction'])+'</p><p>The previous topic label is retained in the URL for link continuity. The corrected title and findings above govern this page.</p></section>'
 body+='<section><h2>Source and review record</h2><p><a href="/pdf-lite?id='+r['id']+'">Open the preserved '+r['id']+' PDF</a> · <a href="https://www.justice.gov/epstein/doj-disclosures/data-set-8-files">Official DOJ Data Set 8 release index</a></p><p>Record type: '+esc(r['record_type'])+'. PDF length: '+str(r['pages'])+' pages. Visually inspected PDF pages: '+', '.join(map(str,r['checked_pages']))+'. The complete extracted text was searched for the original topic phrase.</p><p>Preserved file SHA-256: <code>'+r['sha256']+'</code>.</p><p>Review method: AI-assisted comparison of extracted text and rendered page images. This completes the narrow source-context check documented here; it is not human certification, a forensic authentication or verification of every assertion in the PDF.</p><p><a href="/evidence-data/source-context-review-20261021/reviews.json">Machine-readable review record</a> · <a href="/research/evidence/verified-source-cards">All three source context reviews</a></p></section>'
 schema={'@context':'https://schema.org','@type':'WebPage','name':r['id']+': '+r['title'],'url':'https://grokarchivehub.com'+path,'dateModified':review_date,'publisher':{'@type':'Organization','name':'Grok Archive Hub'},'citation':{'@type':'DigitalDocument','identifier':r['id'],'url':'https://grokarchivehub.com/api/pdfraw?id='+r['id']}}
 (dest/(r['slug']+'.html')).write_text(page(r['id']+': '+r['title'],r['description'],path,body,schema))
path='/research/evidence/verified-source-cards'
body='<p>Evidence index · Updated October 21, 2026</p><h1>Source Context Reviews</h1><p class="lede">Three completed checks of keyword-based source cards. Each review identifies the record type, the page carrying the phrase, the supported interpretation and its limits.</p><p><strong>Reviews completed:</strong> 3 · <strong>Review method:</strong> AI-assisted text and page-image inspection. No human certification is claimed.</p>'
for r in records:
 body+='<section><h2><a href="/research/evidence/'+r['slug']+'">'+esc(r['id']+': '+r['title'])+'</a></h2><p>'+esc(r['description'])+'</p></section>'
body+='<section class="note"><h2>Why these cards changed</h2><p>The earlier Calendar, Black Book and Shell Company labels did not explain the surrounding record. The reviews now distinguish a subpoena quotation from a produced calendar, a news excerpt from an address book, and a Parnas press article from Epstein-related financial evidence. Keyword matches are navigation aids; they are not findings about relationships or conduct.</p><p>Each page preserves its earlier URL and explains the correction. The original PDFs remain available through the archive viewer. These supporting review pages remain outside the indexable article collection and advertising inventory.</p></section>'
schema={'@context':'https://schema.org','@type':'CollectionPage','name':'Source Context Reviews','url':'https://grokarchivehub.com'+path,'dateModified':review_date,'hasPart':[{'@type':'WebPage','name':r['id']+': '+r['title'],'url':'https://grokarchivehub.com/research/evidence/'+r['slug']} for r in records]}
(dest/'verified-source-cards.html').write_text(page('Source Context Reviews','Three completed source-context checks correcting calendar, Black Book and shell-company keyword interpretations.',path,body,schema))
manifest=root/'evidence-data/source-context-review-20261021';manifest.mkdir(parents=True,exist_ok=True)
(manifest/'reviews.json').write_text(json.dumps({'schema':'gah.source-context-reviews.v1','review_date':review_date,'method':'AI-assisted extracted-text search and rendered-page inspection','human_certification':False,'review_count':3,'reviews':records},indent=2,ensure_ascii=False)+'\n')
print('Built three corrected reviews, their index and the provenance manifest')
