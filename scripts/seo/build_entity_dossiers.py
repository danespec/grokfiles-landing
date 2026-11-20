#!/usr/bin/env python3
"""Build three curated, source-bound organizational dossiers (not automatic entity mining).

Every claim is editorially reviewed against the linked published investigations and
official documents. No victim/witness identities, accusation inference, or private IDs.
"""
from pathlib import Path
from html import escape
import json
import sys

ROOT=Path(__file__).resolve().parents[2]
DATE="2026-11-19"
BASE="https://grokarchivehub.com"
SOURCE_SENATE="https://www.finance.senate.gov/imo/media/doc/memorandum_to_senator_wyden_on_jpmc-epstein_redactedpdf.pdf"
SOURCE_WYDEN="https://www.finance.senate.gov/imo/media/doc/letter_from_senator_wyden_to_jpmorgan_chase_epstein_accounts_09-24-25pdf.pdf"
def link(url,text):
    return f'<a href="{escape(url,quote=True)}">{escape(text)}</a>'

DOSSIERS=[
  {
    "slug":"jpmorgan-chase-epstein-bank-records",
    "name":"JPMorgan Chase",
    "title":"JPMorgan Chase and Epstein: Nine SARs and the Reporting Timeline",
    "desc":"A source-linked JPMorgan Chase research dossier distinguishing nine suspicious activity reports, banking records, and open reporting questions.",
    "lede":"The reviewed record concerns the timing and scope of suspicious-activity reporting associated with Jeffrey Epstein’s JPMorgan accounts. This dossier separates the nine-report chronology, one narrower wire-transfer count, the bank’s response, and unanswered oversight questions.",
    "claims":[
      ("2002–2016","Seven suspicious-activity reports filed before 2019 covered a combined $4,316,424, according to the November 2025 Senate Finance staff memorandum.",SOURCE_SENATE,"Senate Finance staff memorandum"),
      ("August–September 2019","Two later reports, filed after Epstein’s July 2019 arrest, covered $1,282,799,188 of historical activity; their reporting dates must not be confused with the activity dates.",SOURCE_SENATE,"Nine-SAR chronology"),
      ("September 24, 2025","A separate Senate Finance letter describes 4,725 wires totaling approximately $1.1 billion in a 2019 filing. This is not the total of all nine reports.",SOURCE_WYDEN,"Senate Finance letter"),
      ("2023 forensic report","EFTA02810827 is cited by the Senate memorandum as an expert forensic-accounting report; it is not itself an adjudication of criminal liability.","/evidence-briefs/efta02810827-amador-jpmorgan-forensic-report","GAH source review"),
    ],
    "limits":[
       "A suspicious-activity report is a regulatory filing, not a conviction or proof that every transaction was illegal.",
       "The nine-report totals and the 4,725-wire figure describe different scopes. Do not add or interchange them.",
       "The Senate memorandum summarizes allegations and records, and records a JPMorgan response contesting an implication of knowing facilitation. Those positions are distinguished in the linked investigation.",
       "The public sources do not establish a complete customer-ledger reconciliation or individual criminal intent for each listed transfer.",
    ],
    "research":[
      ("/investigations/jpmorgan-nine-sars-epstein","Nine-SAR investigation and bank response"),
      ("/evidence-briefs/jpmorgan-4725-wires-1-1-billion-explainer","4,725-wire figure: exact scope"),
      ("/evidence-briefs/efta02810827-amador-jpmorgan-forensic-report","EFTA02810827 report context"),
      ("/topics/epstein-bank-records","Bank-records topic hub"),
    ]
  },
  {
    "slug":"deutsche-bank-epstein-records",
    "name":"Deutsche Bank",
    "title":"Deutsche Bank and Epstein: Interviews, Bank Exhibits and Open Records",
    "desc":"Separate public FBI interview records, Deutsche Bank financial exhibits, and an unverified missing-interview lead without conflating evidence.",
    "lede":"The public record has several distinct Deutsche Bank evidence lanes: released FBI interview reports, a 2020 investigative email, and a bank-derived exhibit used in a financial reconstruction. They should not be treated as one continuous or proven account.",
    "claims":[
      ("Released interview records","Three Deutsche-linked FBI FD-302 reports were reviewed in the published investigation. They memorialize interviewees’ statements rather than FBI conclusions.","/investigations/wyden-banker-302-deutsche-interviews","Reviewed interview records"),
      ("August 2020","The released FBI email chain describes investigators engaging a banker and anticipating a proffer. The released chain does not verify that a later interview or proffer occurred.","/investigations/wyden-banker-302-deutsche-interviews","Released FBI email chain"),
      ("September 2026","A Senate Finance inquiry described a separate unreleased banker FD-302 without publicly identifying the banker or the bank. The identity must remain unresolved.","/investigations/wyden-banker-302-deutsche-interviews","Source-limited missing-record analysis"),
      ("2015–2019 accounting","EFTA00080260 is a bank-derived exhibit following one Gratitude America account. It does not represent the entirety of that charity’s accounts or banking relationships.","/archive/EFTA00080260","Account exhibit"),
    ],
    "limits":[
       "Interviews record competing or incomplete accounts; an FD-302 is not an institutional finding.",
       "The 2020 prospective-proffer email is not proof of a completed interview, an FD-302, or the identity of the undisclosed banker.",
       "The accounting exhibit follows one identified account; its totals cannot be generalized to all Deutsche Bank activity.",
       "A reported compliance concern or banking relationship alone does not establish criminal misconduct.",
    ],
    "research":[
      ("/investigations/wyden-banker-302-deutsche-interviews","Three FD-302s and unresolved banker report"),
      ("/investigations/gratitude-america-money-trail-2015-2019","Bank-derived exhibit and account reconstruction"),
      ("/investigations/wyden-banker-302-deutsche-interviews","2020 FBI correspondence review"),
      ("/archive/EFTA00080260","Bank exhibit EFTA00080260"),
    ]
  },
  {
    "slug":"gratitude-america-financial-records",
    "name":"Gratitude America Ltd.",
    "title":"Gratitude America: Documented Account Transfers and Unresolved Questions",
    "desc":"A source-grounded organization dossier tracking one 2015–2019 bank exhibit, same-entity transfers, foreign inquiry records, and accounting limits.",
    "lede":"This dossier concerns one charity’s released banking and investigative records, not a finding of criminal conduct. It distinguishes the transfer into an identified money-market account, movements between the charity’s own accounts, and questions for which the underlying records remain missing.",
    "claims":[
      ("October 14, 2015","EFTA00080260 records a $10 million incoming transfer from BV70 LLC into a Gratitude America money-market account.","/archive/EFTA00080260","Bank-derived Exhibit E"),
      ("2016 account movements","The same single-account exhibit lists $8.775 million of outgoing postings: $8.45 million to other accounts owned by Gratitude America and $325,000 to outside recipients. Internal transfers are not grants.","/investigations/gratitude-america-money-trail-2015-2019","28-row source reconstruction"),
      ("2020 inquiry","EFTA00153569–571 records a French financial-intelligence inquiry and a reference to three suspicious-activity reports, without supplying the SAR texts or a disposition.","/archive/EFTA00153569","Released correspondence"),
      ("April 2021","EFTA00128841 shows that an IRS contract accountant reviewed bank records within an FBI matter; the import form does not include the conclusions of that review.","/archive/EFTA00128841","FBI import form"),
    ],
    "limits":[
      "The released account schedule is not a full set of monthly statements and does not reconstruct every account or recipient.",
      "Internal account-to-account transfers must not be mislabeled charitable grants or external payments.",
      "A French inquiry and references to SARs are not proof of a criminal charge or a finding against a recipient.",
      "Underlying ledgers, referenced SARs, receipt-level wire evidence and the accountant’s full report remain unavailable in the reviewed public records.",
    ],
    "research":[
      ("/investigations/gratitude-america-money-trail-2015-2019","28-row bank-derived reconstruction and limitations"),
      ("/archive/EFTA00080260","Bank exhibit EFTA00080260"),
      ("/archive/EFTA00153569","Inquiry correspondence EFTA00153569"),
      ("/archive/EFTA00128841","Account-review form EFTA00128841"),
    ]
  },
]

CSS="""
:root{color-scheme:dark}*{box-sizing:border-box}body{margin:0;background:#141914;color:#e9e6dc;font:16px/1.7 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}a{color:#eec082;text-underline-offset:3px}a:hover{color:#ffe0a3}.shell{width:min(910px,calc(100% - 36px));margin:auto}.mast{border-bottom:1px solid #3b463b;padding:19px 0;display:flex;gap:22px;align-items:center;justify-content:space-between;flex-wrap:wrap}.brand{font-weight:800;letter-spacing:.08em;color:#faf1df;text-decoration:none}.mast nav{display:flex;gap:16px;flex-wrap:wrap}main{padding:40px 0 85px}.eyebrow{font-size:12px;letter-spacing:.13em;color:#d4b27c;text-transform:uppercase;font-weight:750}h1,h2{line-height:1.18;color:#fff3dc}h1{font-size:clamp(34px,5.5vw,53px);margin:12px 0 22px}h2{font-size:26px;margin:42px 0 14px}.lede{font-size:18px;line-height:1.55;color:#d5d8cd}.notice{padding:17px 20px;border-left:4px solid #d1aa70;background:#222d26}.record-grid{list-style:none;padding:0;display:grid;gap:14px}.record-grid li{background:#202921;border:1px solid #4b554a;padding:18px;border-radius:7px}.date{color:#e0bc81;font-size:13px;font-weight:750}.record-grid p{margin:5px 0 9px}.limits li{margin:10px 0}.links{display:grid;gap:9px}.links a{display:block}footer{border-top:1px solid #3b463b;font-size:13px;color:#b9c0b7;padding:28px 0 45px}@media(max-width:550px){main{padding-top:28px}.mast nav{gap:10px}}
"""
def make(d):
  slug=d["slug"];url=BASE+"/entities/"+slug
  claims='\n'.join('<li><span class="date">'+escape(date)+'</span><p>'+escape(claim)+'</p><p>Source: '+link(src,label)+'</p></li>' for date,claim,src,label in d["claims"])
  limitations='\n'.join('<li>'+escape(item)+'</li>' for item in d["limits"])
  research='\n'.join(link(url,label) for url,label in d["research"])
  ld={"@context":"https://schema.org","@type":"CollectionPage","name":d["title"],"url":url,"description":d["desc"],"dateModified":DATE,"publisher":{"@type":"Organization","name":"Grok Archive Hub","url":BASE},"about":{"@type":"Organization","name":d["name"]}}
  return f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{escape(d["title"])} | Grok Archive Hub</title><meta name="description" content="{escape(d["desc"],quote=True)}">
<meta name="robots" content="index,follow"><link rel="canonical" href="{url}">
<meta property="og:title" content="{escape(d["title"],quote=True)}"><meta property="og:type" content="article"><meta property="og:url" content="{url}">
<script type="application/ld+json">{json.dumps(ld,ensure_ascii=False).replace("<","\\u003c")}</script><style>{CSS}</style></head><body>
<header class="mast shell"><a class="brand" href="/">GAH · GROK ARCHIVE HUB</a><nav aria-label="Research navigation"><a href="/entities">Entity directory</a><a href="/topics/epstein-bank-records">Bank records</a><a href="/atlas/">Story Atlas</a></nav></header>
<main class="shell"><p class="eyebrow">Verified organizational dossier · Reviewed {DATE}</p><h1>{escape(d["title"])}</h1>
<p class="lede">{escape(d["lede"])}</p>
<p class="notice"><strong>Evidence boundary:</strong> An organization appearing in these records is not evidence of guilt. Every entry identifies its source and separates what the document supports from what remains unknown. This page does not identify protected victims or witnesses.</p>
<h2>Documentary timeline and source trail</h2><ol class="record-grid">{claims}</ol>
<h2>What these records do not establish</h2><ul class="limits">{limitations}</ul>
<h2>Follow the underlying research</h2><div class="links">{research}</div>
<h2>Scope and corrections</h2><p>These are curated research references, not a complete entity graph, legal finding, or exhaustive transaction index. For source and methodology corrections consult {link('/editorial-policy','editorial policy')} and {link('/corrections','corrections')}.</p>
</main><footer class="shell">Grok Archive Hub · Source-first research · {DATE}</footer></body></html>\n'''
def main():
    check='--check' in sys.argv
    for d in DOSSIERS:
        target=ROOT/'entities'/f'{d["slug"]}.html'
        data=make(d)
        if check:
            assert target.read_text()==data,f'stale dossier: {target}'
        else:
            target.write_text(data)
    print(('PASS' if check else 'Wrote')+f' {len(DOSSIERS)} source-bound organizational dossiers')
if __name__=='__main__':main()
