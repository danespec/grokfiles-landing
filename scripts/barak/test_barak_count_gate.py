#!/usr/bin/env python3
"""Barak corpus count discrepancy regression: no false reconciliation."""
from html.parser import HTMLParser
from pathlib import Path
import json,re,unittest

ROOT=Path(__file__).resolve().parents[2]

def field(src,key):
    m=re.search(r'"'+re.escape(key)+r'":(\{[^{}]+\})',src)
    if not m:raise AssertionError("missing "+key)
    return json.loads(m.group(1))

class Links(HTMLParser):
    def __init__(self):super().__init__();self.hrefs=[]
    def handle_starttag(self,tag,attrs):
        if tag=="a":self.hrefs.append(dict(attrs).get("href",""))

class BarakCountGate(unittest.TestCase):
    def test_current_portal_site_numbers_not_silently_fixed(self):
        for f in ("assets/barak-data-050.js","assets/barak-data.v298.js","assets/barak-data-048.js"):
            s=(ROOT/f).read_text()
            c=field(s,"sourceTypeCounts")
            inputs=field(s,"sourceInputs")
            self.assertEqual(inputs["archiveEmailSlots"],11089)
            self.assertEqual(c["Attachment-backed slots"],5587)
            self.assertEqual(c["Metadata-only slots"],5505)
            self.assertEqual(c["Recovered emails"],19)
            self.assertEqual(c["Attachment-backed slots"]+c["Metadata-only slots"],11092)
            self.assertNotEqual(11092,inputs["archiveEmailSlots"])
    def test_historical_037a_math_is_distinct(self):
        self.assertEqual(5587+5483+19,11089)
        self.assertEqual(5505-5483,22)
    def test_gate_explicitly_unresolved_and_safe(self):
        s=(ROOT/"docs/phase0/BARAK_CORPUS_COUNT_GATE_026.md").read_text()
        for word in ("Status: OPEN","11,092","11,089","5,483","5,505","19",
                     "31,718","40,976","Columbus Nova","NOT VERIFIED",
                     "SHA-256","not a master email count"):
            self.assertIn(word.lower(),s.lower())
    def test_crown_analytical_links(self):
        target="/investigations/barak-epstein-putin-qatar-carbyne"
        for page in ("barak/entities.html","barak/timeline.html","dispatches/barak-archive.html"):
            parser=Links();parser.feed((ROOT/page).read_text())
            self.assertIn(target,parser.hrefs,page)
        s=(ROOT/"barak/entities.html").read_text()
        for path in ("/evidence-data/barak-epstein-putin-qatar-carbyne/claims.json",
                     "/evidence-data/barak-epstein-putin-qatar-carbyne/source-manifest.json"):
            self.assertIn(path,s)
    def test_limits_explicit(self):
        e=(ROOT/"barak/entities.html").read_text()
        t=(ROOT/"barak/timeline.html").read_text()
        self.assertIn("not proof Putin received",e)
        self.assertIn("not allegations of misconduct",e)
        self.assertIn("proposed anti-drone follow-up",e)
        self.assertIn("does not establish a Putin meeting",t)

if __name__=="__main__": unittest.main(verbosity=2)
