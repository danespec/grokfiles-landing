#!/usr/bin/env python3
from pathlib import Path
import re,json,html
root=Path('/Users/thomas/GAH-INDYKE-KAHN-NM-20261021')
base='/investigations/new-mexico-indyke-kahn-financial-network-2026'
domain='https://grokarchivehub.com'
url=domain+base
pdf='https://nmdoj.gov/wp-content/uploads/1-10.21.2026-Complaint.pdf'
nm='https://nmdoj.gov/press-release/attorney-general-torrez-sues-epstein-associates-indyke-and-kahn-to-block-estate-payments-and-recover-damages-for-survivors/'
response='https://www.reuters.com/legal/government/new-mexico-sues-jeffrey-epsteins-former-lawyer-accountant-2026-10-21/'
flights='https://www.justice.gov/opa/pr/attorney-general-pamela-bondi-releases-first-phase-declassified-epstein-files'
original='investigations/new-mexico-doj-epstein-records.html'
s=(root/original).read_text()
newtitle='New Mexico Sues Indyke and Kahn: Epstein Estate, Zorro Ranch & Flight Records | GrokArchiveHub'
desc='New Mexico filed a 49-page civil complaint against Darren Indyke and Richard Kahn on October 21, 2026. Source-linked analysis of the 1953 Trust, payments, Zorro entities, and flight-record gaps.'
# Retain approved shared V3 navigation, site consent, accessibility and footer.
for field in ['title','meta name="description"','meta property="og:title"','meta property="og:description"','meta property="og:url"','meta name="twitter:title"','meta name="twitter:description"','link rel="canonical"']:
 assert field in s
s=re.sub(r'<title>[^<]+</title>',f'<title>{html.escape(newtitle)}</title>',s,count=1)
for tag,value in {'description':desc}.items():
 s=re.sub(r'<meta name="'+tag+r'" content="[^"]*">',f'<meta name="{tag}" content="{html.escape(value,quote=True)}">',s,count=1)
for prop,value in {'og:title':newtitle,'og:description':desc,'og:url':url}.items():
 s=re.sub(r'<meta property="'+prop+r'" content="[^"]*">',f'<meta property="{prop}" content="{html.escape(value,quote=True)}">',s,count=1)
for meta,value in {'twitter:title':newtitle,'twitter:description':desc}.items():
 s=re.sub(r'<meta name="'+meta+r'" content="[^"]*">',f'<meta name="{meta}" content="{html.escape(value,quote=True)}">',s,count=1)
s=re.sub(r'<link rel="canonical" href="[^"]+">',f'<link rel="canonical" href="{url}">',s,count=1)
schema={"@context":"https://schema.org","@type":"NewsArticle","headline":"New Mexico Sues Darren Indyke and Richard Kahn: The Epstein Estate and Financial Network","description":desc,"url":url,"mainEntityOfPage":url,"datePublished":"2026-10-21","dateModified":"2026-10-21","author":{"@type":"Organization","name":"Grok Archive Hub"},"publisher":{"@type":"Organization","name":"Grok Archive Hub"},"citation":[pdf,nm,flights,response],"isAccessibleForFree":True}
style="""<style data-gah-nm-indyke-kahn>
.gah-case{max-width:1120px;margin:0 auto;padding:18px 20px 64px;color:var(--text,#e8e9e3);line-height:1.72}
.gah-case .hero-case{padding:26px 22px;background:linear-gradient(120deg,#252f2b,#171f1b);border:1px solid #777d69;border-radius:12px}
.gah-case h1{font-size:clamp(31px,5vw,48px);line-height:1.14;margin:9px 0 16px;color:#fff0d6}
.gah-case h2{font-size:26px;color:#f4d39f;line-height:1.3;margin:26px 0 12px}
.gah-case h3{font-size:19px;color:#fff1dd;margin:20px 0 8px}
.gah-case p,.gah-case li{max-width:1000px}.gah-case a{color:#e8bc7b}
.gah-case .small{font-size:14px;color:#d5d8ca}.gah-case .lede{font-size:19px}
.gah-case .rule{border-left:4px solid #d7a267;padding:14px 18px;background:#2b2922;margin:17px 0}
.gah-case .proof{display:flex;gap:10px;flex-wrap:wrap;margin:17px 0}
.gah-case .proof a{display:inline-block;border:1px solid #9e8668;border-radius:8px;padding:9px 12px;background:#242d26}
.gah-case .feature-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px;margin:16px 0}
.gah-case .feature-grid div{padding:14px;border:1px solid #617365;background:#243129;border-radius:8px}
.gah-case .feature-grid strong{display:block;font-size:25px;color:#f0ca94}
.gah-case section{border-bottom:1px solid #4a5a4e;padding:13px 0 22px}
.gah-case .table-wrap{overflow-x:auto}.gah-case table{width:100%;border-collapse:collapse;min-width:690px;font-size:15px}
.gah-case th,.gah-case td{padding:10px 12px;text-align:left;vertical-align:top;border:1px solid #546154}
.gah-case th{background:#29382e;color:#f5dcc1}.gah-case td{background:#202923}
.gah-case .marker{font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#ebc38b}
.gah-case .status{font-weight:700;color:#e9cf9f}
</style>"""
assert '</head>' in s
s=s.replace('</head>',style+'\n<script type="application/ld+json">'+json.dumps(schema,ensure_ascii=False,separators=(',',':')).replace('<','\\u003c')+'</script>\n</head>',1)
def source(page,label=None):
 return f'<a href="{pdf}#page={page}" rel="noopener">Complaint p. {page}'+(f' — {html.escape(label)}' if label else '')+'</a>'
page=f'''
<main id="main" class="gah-case">
<article itemscope itemtype="https://schema.org/NewsArticle">
<header class="hero-case">
 <p class="marker">GrokArchiveHub · Financial network investigation · Filed October 21, 2026</p>
 <h1>New Mexico Sues Epstein's Attorney and Accountant: Inside the Estate, Zorro Ranch and Money Trail</h1>
 <p class="lede">New Mexico Attorney General Raúl Torrez filed a 49-page federal civil lawsuit against <strong>Darren K. Indyke</strong> and <strong>Richard D. Kahn</strong>, individually and as co-executors of Jeffrey Epstein's estate and administrators of his 1953 Trust. The filing lays out alleged payment, corporate-control, property and travel mechanisms. This analysis separates what the <em>State alleges</em> from what the filing itself proves and which underlying bank and flight records still need an independent join.</p>
 <p class="small">U.S. District Court, District of New Mexico · <strong>State of New Mexico ex rel. Torrez v. Indyke et al.</strong> · <strong>No. 1:26-cv-03543</strong> · ECF 1 · 49 pages · Filed October 21, 2026.</p>
 <div class="proof"><a href="{pdf}">Read original 49-page filed complaint (NMDOJ)</a><a href="{nm}">New Mexico DOJ's announcement</a><a href="{response}">Defendants' response reported by Reuters</a></div>
 <div class="feature-grid">
  <div><strong>$50m</strong>Potential Indyke trust bequest, not an amount paid</div>
  <div><strong>$25m</strong>Potential Kahn trust bequest, not an amount paid</div>
  <div><strong>140+</strong>Bank accounts allegedly held or managed by 2005</div>
  <div><strong>1997–2018</strong>Travel window alleged from flight records</div>
 </div>
 <div class="rule"><strong>Legal status:</strong> This is a civil complaint, not a finding of liability or a criminal conviction. Allegations described below are attributed to the State. Indyke and Kahn, through counsel, deny knowingly assisting Epstein's crimes. Their lawyer said neither witnessed abuse and disputed the State's failure to interview them before suing. No guilt is inferred from a name, filing, payment, entity position or flight record.</div>
</header>
<section id="three-bullets"><h2>Three things that changed today</h2><ol>
<li><strong>State action:</strong> The New Mexico Attorney General sued Indyke and Kahn, the Epstein estate and the 1953 Trust under federal trafficking and state racketeering civil theories. {source(1)}</li>
<li><strong>Estate-control dispute:</strong> The State seeks to stop estate distributions while the case proceeds and seeks survivor damages, restitution, disgorgement and other relief. Potential trust bequests are $50 million and $25 million, contingent on remaining funds; the complaint says the estate exceeded $107 million as of June 30, 2026. {source(7)}</li>
<li><strong>Record joins:</strong> The complaint connects claimed control of Zorro Ranch entities, accounts and cash distributions with private and commercial travel. It does not itself supply a verified passenger-by-passenger roster for every New Mexico flight. {source(10)} · {source(13)}</li>
</ol></section>
<section id="document-control"><h2>Document control and source standard</h2>
<p><strong>Primary record:</strong> A 49-page federal complaint supplied by the New Mexico Department of Justice. The original source URL is linked above; source SHA-256 acquired for this audit: <code>7c1da1fbea3f39ca9ad8a693c26cf61b1bb2f396ba7d982c86a82eda42df3203</code>. A checksum identifies a downloaded version; it does not independently substantiate the complaint's allegations. Personal identifiers from survivor accounts are not republished on this page.</p>
<p><strong>What filing establishes:</strong> New Mexico brought the pleaded claims, identified the named defendants and requested specific relief. It establishes what allegations the State advanced, not whether disputed transactions occurred exactly as alleged or whether either individual had the requisite knowledge.</p></section>
<section id="entity-graph"><h2>The corporate-control network alleged in the complaint</h2>
<div class="table-wrap"><table><thead><tr><th>Entity / asset</th><th>Role stated in the filing</th><th>Source</th><th>GAH verification boundary</th></tr></thead><tbody>
<tr><td><strong>1953 Trust / estate</strong></td><td>The August 8, 2019 amended trust and will govern the residual estate. Indyke and Kahn act as co-executors and trust administrators, with conditional bequests alleged.</td><td>{source(6)} · {source(7)}</td><td>Review original trust, probate inventory, later estate distributions and restrictions; conditional bequest ≠ paid cash.</td></tr>
<tr><td><strong>Zorro Trust</strong></td><td>Original Ohio trust identified with Epstein's acquisition of Zorro Ranch in 1993.</td><td>{source(12)}</td><td>Confirm deed, grantee chain, recorded dates and parcel identification.</td></tr>
<tr><td><strong>Cypress, Inc.</strong></td><td>Virgin Islands corporation holding Zorro Ranch title. Complaint alleges Indyke was VP/Secretary/Director; Kahn Treasurer/Director. A December 19, 2011 warranty deed is cited.</td><td>{source(11)} · {source(12)}</td><td>Locate original deed and corporate filings; role alone proves neither criminal knowledge nor causation.</td></tr>
<tr><td><strong>Zorro Development Corp.</strong></td><td>New Mexico operations company. Complaint places Indyke as secretary and account signatory from December 20, 2016 through July 8, 2019.</td><td>{source(12)}</td><td>Match corporate registry, bank signature card, payee ledgers and relevant ranch employment dates.</td></tr>
<tr><td><strong>HBRK Associates</strong></td><td>Kahn and Harry Beller's accounting/administrative entity. The State calls it a financial hub for Epstein's properties.</td><td>{source(12)}</td><td>Match source-bank statements, invoice descriptions and actual recipients before asserting money-flow purpose.</td></tr>
<tr><td><strong>Darren K. Indyke PLLC / Zorro Management LLC</strong></td><td>Professional and operational vehicles described by the State; the complaint also identifies a Deutsche Bank account with Epstein and Indyke as signatories for Zorro Management.</td><td>{source(12)}</td><td>Corroborate account-level authority, transaction dates and separate corporate identities.</td></tr>
</tbody></table></div>
<p>The entity chart tracks roles <em>alleged in ECF 1</em>. It is not a determination that every entity was unlawful, that a legal representative knew of criminal conduct, or that a particular payment funded abuse.</p></section>
<section id="money-ledger"><h2>Money trail: numbered allegations and unanswered evidence</h2>
<div class="table-wrap"><table><thead><tr><th>Complaint allegation</th><th>Quoted amount / time period</th><th>Evidence page</th><th>Original-record join needed</th></tr></thead><tbody>
<tr><td>Cash withdrawals by Epstein or others acting for him</td><td>More than $6 million during 2002–2013</td><td>{source(9)}</td><td>Bank statements, cash registers, beneficiary/expense records; totals and business explanations</td></tr>
<tr><td>Indyke's Deutsche Bank cash withdrawals and structuring allegation</td><td>97 withdrawals during 2013–2017; more than $200,000 per year alleged</td><td>{source(27)}</td><td>Each transaction date and amount against bank records and federal cash-reporting thresholds</td></tr>
<tr><td>Payments or compensation to Indyke</td><td>More than $16 million during 2011–2019; plus a disputed $7 million loan described in complaint</td><td>{source(3)} · {source(34)}</td><td>Compensation classification, transfer dates, loans, repayments and recipient entities</td></tr>
<tr><td>Payments or compensation to Kahn</td><td>More than $10 million during 2011–2019; HBRK received $4.9 million from JPMorgan-linked accounts over approximately 2005/06–2013</td><td>{source(4)} · {source(35)}</td><td>Payee/account reconciliation; distinguish entity revenue, reimbursements, fees and distributions</td></tr>
<tr><td>JPMorgan accounts allegedly managed by the two men</td><td>At least 140 accounts held or managed as of 2005, according to State</td><td>{source(24)}</td><td>Account ownership, signer identity, closure dates; avoid interpreting account count as 140 criminal transactions</td></tr>
<tr><td>JPMorgan's internal KYC assessment</td><td>Complaint quotes an internal bank characterization of Kahn's role; this is a quoted bank assessment, not a court finding</td><td>{source(25)}</td><td>Acquire original internal document, version, author, date and scope</td></tr>
<tr><td>C.O.U.Q. Foundation</td><td>More than $30,000 of allegedly unrelated payments to women in 2012</td><td>{source(26)}</td><td>Foundation ledger, source vouchers, program purpose and recipient-protection review</td></tr>
<tr><td>1953 Trust bequests</td><td>$50 million Indyke / $25 million Kahn potentially payable</td><td>{source(7)}</td><td>Trust instrument, probate accounting, liens and distribution entries; do not report as already paid</td></tr>
</tbody></table></div>
<p><strong>Important:</strong> These are complaint allegations and record descriptions. They are not a completed independent bank-ledger audit. GAH's prior <a href="/investigations/darren-indyke-investment-execution-layer">Indyke execution-layer investigation</a>, <a href="/investigations/financial-trust-environmental-solutions-worldwide">Financial Trust work</a> and <a href="/evidence-briefs/jpmorgan-4725-wires-1-1-billion-explainer">JPMorgan wire evidence brief</a> are separate published record lanes; common personnel or accounts do not establish that one transaction caused another.</p></section>
<section id="flight-evidence"><h2>Flight logs, ranch travel and what can actually be proven</h2>
<p>The State alleges that flight records show travel to Zorro Ranch during <strong>1997–2018</strong> (§51, p.13), and that travel coordinators used private and commercial flights (§38, p.10). It specifically recounts a survivor's account of a <strong>commercial ticket from Phoenix to Santa Fe</strong> (§76, p.17), and alleges accounts overseen by Kahn bought airline tickets (§154, p.34). The complaint does <strong>not</strong> attach a complete, independently reconciled passenger manifest in those sections. {source(10)} · {source(13)} · {source(17)} · {source(34)}</p>
<div class="table-wrap"><table><thead><tr><th>Flight research question</th><th>Documentary starting point</th><th>Current verification</th></tr></thead><tbody>
<tr><td>Which private aircraft reached New Mexico?</td><td><a href="{flights}">DOJ's 2025 released U.S. v. Maxwell flight logs</a>; <a href="/guides/epstein-flight-logs-doj">GAH flight-log guide</a></td><td>Original flight-log source exists. No specific tail/date/passenger row is asserted here without an inspected source-image join.</td></tr>
<tr><td>Which commercial tickets to Santa Fe were purchased?</td><td>Complaint §76 and §154; airline and payment statements</td><td>Alleged travel pathway; ticket PNR, carrier, year and matching receipt remain open.</td></tr>
<tr><td>Did a passenger actually reach Zorro Ranch?</td><td>Trip manifest + FBO/airport arrival + ground-transfer record + testimony</td><td>Travel to an airport alone does not prove ranch arrival or misconduct.</td></tr>
<tr><td>Who paid for each movement?</td><td>Expense ledger, bank source, charter invoice, and flight or ticket date</td><td>Not yet reconciled from page-level records.</td></tr>
<tr><td>Does the accessible OCR resolve these questions?</td><td>GAH's archived raw text of DOJ Phase One flight material</td><td>Inspected raw text is heavily OCR-corrupted; automated airport-code counts are not proof that a leg did or did not occur.</td></tr>
</tbody></table></div>
<p><strong>GAH evidence rule:</strong> A tail number identifies an aircraft, not every passenger. A name in a log does not prove knowledge of abuse. An airport arrival does not establish the location or purpose of anyone's activity after landing. This is why the <a href="/methodology/how-not-to-overread-flight-logs">flight-log interpretation standard</a> is essential here.</p>
</section>
<section id="estate-remedies"><h2>What New Mexico actually asks the court to do</h2>
<p>The complaint's prayer for relief requests declarations under racketeering theories; divestment and restrictions on certain interests; compensatory and punitive damages, restitution and disgorgement; and an order preventing the estate's co-executors from distributing estate assets during this litigation. Some remedies are requested for survivors under 18 U.S.C. §1595 and New Mexico law; none is granted merely by filing. {source(47)} · {source(48)}</p>
<p>The complaint names the 1953 Trust as an asset holder, expressly not because the State says the trust itself committed racketeering. {source(6)}</p>
</section>
<section id="response"><h2>Indyke and Kahn's denial</h2>
<p>Daniel Weiner, representing both men, rejected the allegation that they <em>knowingly</em> facilitated Epstein's abuse. In his statement to Reuters, he said no woman accused them of personally committing or witnessing sexual abuse and criticized the State's decision to file without interviewing them. This is the defense position; it is not a ruling on disputed facts. <a href="{response}">Read Reuters' October 21 report</a>.</p>
<p>Survivors Julia Molchanova and Anouska De Georgiou supported the civil action at New Mexico DOJ's announcement, seeking accountability beyond Epstein and Maxwell. <a href="{nm}">Read the State's announcement</a> and <a href="https://nmdoj.gov/wp-content/uploads/AG-NM-Survivor-Press-Release.pdf">survivors' published statement</a>.</p></section>
<section id="open-records"><h2>The next five records GAH needs to close this investigation</h2>
<ol>
<li><strong>Zorro Ranch ownership:</strong> the December 19, 2011 deed, Cypress annual reports, corporate officers and any title-transfer consideration.</li>
<li><strong>Accounts and 97 withdrawals:</strong> underlying JPMorgan/Deutsche Bank transaction rows, currency reports or documentation, dated signer authorization and competing explanations.</li>
<li><strong>HBRK / payroll:</strong> original HBRK and professional-fee invoices, recipient-account statements, charitable foundation books and probate loan records.</li>
<li><strong>Actual travel records:</strong> original Maxwell exhibits, leg-by-leg pilot logs, private FBO records and commercial ticket/receipt data; join only verifiable dates and airport codes.</li>
<li><strong>Post-filing docket:</strong> summons, service, answers, preliminary-injunction motions, responsive exhibits and court orders in 1:26-cv-03543.</li>
</ol>
<p>GAH has <em>not</em> claimed to possess or independently authenticate these complete underlying sets. Exact passenger-account-name joins remain unresolved. Email corrections and source records through <a href="/corrections">our corrections policy</a>.</p></section>
<section id="source-list"><h2>Primary-source and reporting index</h2>
<ul>
<li><a href="{pdf}">NMDOJ: filed federal complaint, 49 pages, Case 1:26-cv-03543, ECF 1, October 21, 2026</a></li>
<li><a href="{nm}">NMDOJ: official October 21 filing announcement and remedy summary</a></li>
<li><a href="https://nmdoj.gov/wp-content/uploads/AG-NM-Survivor-Press-Release.pdf">NMDOJ: accompanying survivor statement (one-page PDF)</a></li>
<li><a href="{flights}">U.S. DOJ: released U.S. v. Maxwell pilot flight-log exhibits, February 27, 2025</a></li>
<li><a href="{response}">Reuters: contemporaneous lawyer response and denial, October 21, 2026</a></li>
<li><a href="/investigations/darren-indyke-investment-execution-layer">GAH: prior independently sourced Indyke transaction execution analysis</a></li>
<li><a href="/investigations/new-mexico-doj-epstein-records">GAH: New Mexico / DOJ records-access dispute and production gaps</a></li>
<li><a href="/investigations/black-family-partners-18m-to-5-5m-repricing">GAH: unrelated Black Family Partners repricing research (separate case theory)</a></li>
</ul>
<p class="small">Published October 21, 2026. This page is ad-free, source-linked and editorially distinct from any underlying DOJ investigative file. No protected identities, images or unredacted personal records are reproduced. <strong>Allegations ≠ findings.</strong></p>
</section>
</article>
</main>'''
assert len(re.findall(r'<main\b[^>]*>',s))==1
s=re.sub(r'<main\b[^>]*>[\s\S]*?</main>',lambda m:page,s,count=1)
s=s.replace('data-family="INVESTIGATION_ARTICLE"','data-family="INVESTIGATION_ARTICLE"')
assert s.count('<main')==1 and s.count('</main>')==1
assert s.count('rel="canonical"')==1
assert 'No guilt is inferred' in s
target=root/(base.lstrip('/')+'.html')
target.write_text(s)
# machine-usable claim and open-slot map: source labels are pleading citations, not determinations.
claims=[
("NM-26-001","2026-10-21","Federal civil complaint filed against Indyke/Kahn/estate/1953 Trust","filed fact","complaint pp1,6",pdf),
("NM-26-002","2019/2026","Estate > $107m June 2026; conditional $50m/$25m bequests","state pleading","complaint p7",pdf),
("NM-26-003","2011-12-19","Cypress special warranty deed for Zorro Ranch attributed to Indyke","state pleading","complaint p11",pdf),
("NM-26-004","2013-2017","97 cash withdrawals and $200k/year attributed to Indyke","state pleading","complaint p27",pdf),
("NM-26-005","2005","At least 140 Epstein bank accounts alleged to be held/managed","state pleading","complaint p24",pdf),
("NM-26-006","1997-2018","Complaint asserts flight records reflect travel to Zorro Ranch","state pleading","complaint p13",pdf),
("NM-26-007","1996","Phoenix-Santa Fe commercial travel described in survivor account","state pleading","complaint p17",pdf),
("NM-26-008","2011-2019","$16m Indyke/$10m Kahn financial compensation allegation","state pleading","complaint p3/p4",pdf),
("NM-26-009","2026-10-21","Co-defendants deny knowingly facilitating abuse","defense statement","Reuters 2026-10-21",response),
]
import csv
claimfile=root/'docs/seo/GAH_NM_INDYKE_KAHN_20261021_CLAIMS.csv'
with claimfile.open('w',newline='') as f:
 w=csv.writer(f);w.writerow(['claim_id','date_range','statement','status','source_locator','source_url']);w.writerows(claims)
print('Wrote article',target,'bytes',len(s),'claims',len(claims))
