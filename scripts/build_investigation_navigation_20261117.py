"""Build public reader navigation; no new evidence claims or corpus admission."""
from pathlib import Path
import argparse, html, json, re
from html.parser import HTMLParser
from urllib.parse import urlsplit
ROOT=Path(__file__).resolve().parents[1]
BASE="https://grokarchivehub.com"
# Reviewed topical reading groups, not evidence edges. Every current canonical
# investigation is listed; a sitemap coverage test detects additions.
GROUPS=[
("Federal case and non-prosecution agreement",[
"hold-the-letter","epstein-december-6-7-2007-decision-gap","epstein-july-2007-decision-gap","epstein-npa-defense-access-victim-notification","trump-acosta-epstein-doj-timeline"]),
("Campaign chronology and correspondence",[
"trump-2015-campaign-records","trump-moscow-deal-campaign-2015-2016","epstein-wolff-trump-cnn-emails-2015","trump-israel-russia-un-vote-2016"]),
("Barak documentary record",[
"barak-st-thomas-dec-2014","barak-epstein-putin-qatar-carbyne","barak-saudi-rothschild-proposal-2015","barak-gadeco-fee-2014","barak-scheduling-records-2010-2018","barak-hfa-cycurity-2015"]),
("Leon Black financial records",[
"leon-black-2023-sdny-referral-status","black-family-partners-source-of-funds-gap","black-family-partners-financial-trust-esww-sale","black-family-partners-18m-to-5-5m-repricing","black-phaidon-2015-tax-model-house-oversight","financial-trust-environmental-solutions-worldwide"]),
("Banking and account evidence",[
"jpmorgan-nine-sars-epstein","wyden-banker-302-deutsche-interviews","gratitude-america-money-trail-2015-2019"]),
("Investment administration and transactions",[
"andriesz-adfin-lutnick-paper-trail","truesec-il-energy-twin-spvs-2013","darren-indyke-investment-execution-layer","new-mexico-indyke-kahn-financial-network-2026"]),
("Disclosure and court oversight",[
"doj-oip-epstein-review-public-figure-flags-2026","fbi-vault-redaction-chronology-phang","efta-compliance-tracker","new-mexico-doj-epstein-records"]),
("Custody and death records",[
"autopsy-exhibit-list-limits","ch0080-video-file-windows"]),
("Legal records and source-review methods",[
"andrew-search-warrants-quashed-2026-doj-judicial-review","giuffre-maxwell-docket-1320-privilege-gap","george-mitchell-epstein-source-audit","sascha-riley-claims-evidence-audit","norway-brende-epstein-hearing-2026","clinton-foundation-cgi-epstein-source-audit","nikolic-gates-epstein-bridge"])
]
# Explicitly contextual Atlas suggestions. No match is asserted where the
# published story addresses a different event, account, date or proceeding.
TOPICS={
"hold-the-letter":["1","25","P30"],
"epstein-december-6-7-2007-decision-gap":["1","25"],
"epstein-july-2007-decision-gap":["1","P1","25"],
"epstein-npa-defense-access-victim-notification":["1","P1","25"],
"trump-acosta-epstein-doj-timeline":["1","25"],
"trump-2015-campaign-records":["P6","9"],
"trump-moscow-deal-campaign-2015-2016":["P6"],
"epstein-wolff-trump-cnn-emails-2015":["9"],
"trump-israel-russia-un-vote-2016":["P6"],
"barak-st-thomas-dec-2014":["13"],
"barak-epstein-putin-qatar-carbyne":["12","20","P47"],
"barak-saudi-rothschild-proposal-2015":["12","18"],
"barak-gadeco-fee-2014":["18"],
"barak-scheduling-records-2010-2018":["13","19","22"],
"barak-hfa-cycurity-2015":["12","20"],
"leon-black-2023-sdny-referral-status":["P4","P34","P45"],
"black-family-partners-source-of-funds-gap":["P4","P45"],
"black-family-partners-financial-trust-esww-sale":["P45","P4"],
"black-family-partners-18m-to-5-5m-repricing":["P45","P4"],
"black-phaidon-2015-tax-model-house-oversight":["P45","P4"],
"financial-trust-environmental-solutions-worldwide":["P45","P34"],
"jpmorgan-nine-sars-epstein":["P27","P49"],
"wyden-banker-302-deutsche-interviews":["P27","P4"],
"gratitude-america-money-trail-2015-2019":["P38"],
"truesec-il-energy-twin-spvs-2013":["16"],
"darren-indyke-investment-execution-layer":["P35","P21"],
"new-mexico-indyke-kahn-financial-network-2026":["P21","P41","P15"],
"doj-oip-epstein-review-public-figure-flags-2026":["25","28"],
"fbi-vault-redaction-chronology-phang":["28"],
"efta-compliance-tracker":[],
"new-mexico-doj-epstein-records":[],
"autopsy-exhibit-list-limits":["4","24"],
"ch0080-video-file-windows":["4","24"],
"andrew-search-warrants-quashed-2026-doj-judicial-review":["P13","P50"],
"giuffre-maxwell-docket-1320-privilege-gap":["7","P26"],
"nikolic-gates-epstein-bridge":["P33"]
}
# Neutral public navigation labels (no new names from underlying source material).
LABELS={
"1":"Palm Beach investigation and 2008 NPA","4":"MCC detention and death",
"7":"Civil defamation case chronology","9":"Epstein–Wolff correspondence",
"12":"Barak, Putin, Qatar and Carbyne","13":"St. Thomas trip chronology",
"16":"Guardicore and TrueSec","18":"Barak paid-arrangement record",
"19":"Cambridge meeting chronology","20":"Reporty investment arc",
"22":"May 2017 New York stay","24":"MCC guards prosecution",
"25":"DOJ review of the NPA","28":"FOIA litigation chronology",
"P1":"Crime Victims’ Rights Act suit","P4":"Dechert review and Senate Finance inquiry",
"P6":"2016 election-watch records","P13":"November 2010 visit arrangements",
"P15":"Air Ghislaine acquisition","P21":"USVI estate litigation",
"P26":"Subpoena litigation chronology","P27":"Bank litigation and settlements",
"P30":"NPA unsealing proceedings","P33":"Nikolic separation process",
"P34":"2013 Southern Trust transfers","P35":"Southern Trust account records",
"P38":"Gratitude America FirstBank account (separate account)",
"P41":"Zorro Development account records","P45":"Family-office advisory records",
"P47":"Requests for Putin meetings","P49":"Staley correspondence and FCA contact",
"P50":"2001–2002 correspondence thread"
}
NEUTRAL={
"giuffre-maxwell-docket-1320-privilege-gap":"Docket 1320 and the privilege gap",
"sascha-riley-claims-evidence-audit":"Testimony claims: evidence audit"
}
def js_object(name):
 return json.loads((ROOT/name).read_text().split("=",1)[1].strip().rstrip(";"))
class Main(HTMLParser):
 def __init__(self):
  super().__init__(convert_charrefs=True);self.inside=False;self.skip=[];self.text=[];self.href=[]
 def handle_starttag(self,tag,attrs):
  if tag=="main":self.inside=True
  if not self.inside:return
  if tag in ("script","style","nav","footer","aside"):self.skip.append(tag)
  if not self.skip and tag=="a":
   h=dict(attrs).get("href")
   if h:self.href.append(h)
 def handle_endtag(self,tag):
  if self.skip and self.skip[-1]==tag:self.skip.pop()
  if tag=="main":self.inside=False
 def handle_data(self,data):
  if self.inside and not self.skip:self.text.append(data)
def make():
 meta=js_object("content/reader-editorial-metadata.mjs")
 policy=js_object("content/publication-policy.mjs")
 atlas=json.loads((ROOT/"atlas/data.json").read_text())
 catalog=json.loads((ROOT/"atlas/agent-catalog.json").read_text())
 registry=json.loads((ROOT/"content/identifier-dossiers.json").read_text())
 safe={e["id"] for e in registry["entries"] if e["indexable"]}.difference(atlas["privacy_minimized_document_ids"])
 catalog_by={s["id"]:s for s in catalog["stories"]}
 story_refs={s["id"]:set(re.findall(r"\bEFTA\d{8}\b"," ".join(s["anchors"]))) & safe for s in atlas["stories"] if s["id"] in catalog_by}
 slugs=[s for _,group in GROUPS for s in group]
 assert len(slugs)==len(set(slugs))==41
 paths={s:"/investigations/"+s for s in slugs}
 by_path={v:k for k,v in paths.items()}
 nav={};back={}
 for topic,group in GROUPS:
  for slug in group:
   p=paths[slug];url=BASE+p
   assert url in meta and not policy.get(url,{}).get("noindex"),p
   parser=Main();parser.feed((ROOT/(p[1:]+".html")).read_text())
   assert parser.text,p
   # Only already-published article references, not raw corpus text or OCR.
   mentioned=set(re.findall(r"\bEFTA\d{8}\b"," ".join(parser.text)))
   linked=set()
   explicit=[]
   for h in parser.href:
    u=urlsplit(h)
    if u.netloc in ("","grokarchivehub.com","www.grokarchivehub.com"):
     q=u.path.removesuffix(".html").rstrip("/")
     if q in by_path and q!=p and q not in explicit:explicit.append(q)
     m=re.fullmatch(r"/archive/(EFTA\d{8})",q)
     if m:linked.add(m[1])
    elif u.netloc=="www.justice.gov":
     m=re.search(r"/(EFTA\d{8})\.pdf$",u.path)
     if m:linked.add(m[1])
   evidence=sorted((mentioned|linked)&safe)
   related=(explicit+[paths[s] for s in group if s!=slug and paths[s] not in explicit])[:4]
   # A link is reader context, not a corroboration or a substantive graph edge.
   story_ids=[]
   for sid,refs in story_refs.items():
    overlap=sorted(refs.intersection(evidence))
    if overlap:story_ids.append((sid,overlap))
   story_ids.sort(key=lambda x:(-len(x[1]),x[0]))
   selected=story_ids[:3]
   for sid in TOPICS.get(slug,[]):
    assert sid in catalog_by,(slug,sid)
    if sid not in [x[0] for x in selected] and len(selected)<4:selected.append((sid,[]))
   stories=[{"id":sid,"title":LABELS.get(sid,"Atlas story "+sid),"tier":catalog_by[sid]["tier"],"shared":refs} for sid,refs in selected]
   nav[p]={"topic":topic,"evidence":evidence,"related":[{"path":q,"title":NEUTRAL.get(by_path[q],meta[BASE+q]["title"])} for q in related],"stories":stories}
   for ident in evidence:back.setdefault(ident,[]).append({"path":p,"title":NEUTRAL.get(slug,meta[url]["title"])})
 return nav,back
def main():
 p=argparse.ArgumentParser();p.add_argument("--check",action="store_true");args=p.parse_args()
 nav,back=make()
 out="// Generated by scripts/build_investigation_navigation_20261117.py; public reader navigation only.\n"
 out+="export const GAH_INVESTIGATION_NAV = "+json.dumps(nav,ensure_ascii=False,sort_keys=True,separators=(",",":"))+";\n"
 out+="export const GAH_DOSSIER_NAV = "+json.dumps(back,ensure_ascii=False,sort_keys=True,separators=(",",":"))+";\n"
 target=ROOT/"content/investigation-navigation.mjs"
 if args.check:assert target.read_text()==out,"Navigation stale: regenerate from published inputs"
 else:target.write_text(out)
 print(json.dumps({"investigations":len(nav),"exact_dossier_edges":sum(len(x["evidence"]) for x in nav.values()),"with_dossier_references":sum(bool(x["evidence"]) for x in nav.values()),"dossiers_with_investigation_links":len(back),"atlas_story_links":sum(len(x["stories"]) for x in nav.values()),"with_atlas_story_links":sum(bool(x["stories"]) for x in nav.values()),"shared_identifier_links":sum(bool(s["shared"]) for x in nav.values() for s in x["stories"]),"related_investigation_links":sum(len(x["related"]) for x in nav.values())}))
if __name__=="__main__":main()
