#!/usr/bin/env python3
"""Offline acceptance tests for Ren's original 19-row audit and EFTA explainer."""
import json
from pathlib import Path
import re
import unittest

ROOT=Path(__file__).resolve().parents[2]
MATRIX=ROOT/"docs/ren-19-coverage-20261011.json"
LIVE=ROOT/"docs/ren-19-live-audit-20261011.json"
PRIVATE=Path.home()/"_gah_builds/GAH-REN-SEO-023-private/ren-keywords-original-extracted.json"

class RenSEOTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.mat=json.loads(MATRIX.read_text())
        cls.live=json.loads(LIVE.read_text())
    def test_literal_rank_order_and_lanes(self):
        items=self.mat["items"]
        self.assertEqual(len(items),19)
        self.assertEqual([a["rank"] for a in items],list(range(1,20)))
        self.assertEqual([a["lane"] for a in items].count("now"),4)
        self.assertEqual([a["lane"] for a in items].count("build"),13)
        self.assertEqual([a["lane"] for a in items].count("long"),2)
        self.assertEqual(len({x["phrase"].casefold() for x in items}),19)
    def test_coverage_count_and_route_existence(self):
        xs=self.mat["items"]
        self.assertEqual({s:sum(x["status"]==s for x in xs) for s in ("strong","partial","gap")},
                         {"strong":6,"partial":6,"gap":7})
        for x in xs:
            self.assertIn(x["status"],("strong","partial","gap"))
            self.assertTrue(x["evidence"])
            self.assertTrue(x["next_action"])
            self.assertEqual(bool(x["routes"]),x["status"]!="gap")
            for route in x["routes"]:
                self.assertTrue(route.startswith("/") and ".." not in route)
                self.assertTrue((ROOT/(route.lstrip("/")+".html")).is_file(),route)
        self.assertFalse(any("book-of-black" in route for x in xs for route in x["routes"]))
    def test_original_source_reconciliation_when_available(self):
        if not PRIVATE.exists():
            self.skipTest("original literal phrase capture is private and not in public Git")
        self.assertEqual(PRIVATE.stat().st_mode&0o077,0,"source must remain mode0600")
        original=json.loads(PRIVATE.read_text())
        self.assertEqual(len(original["keywords"]),19)
        for a,b in zip(original["keywords"],self.mat["items"]):
            self.assertEqual(a["rank"],b["rank"])
            self.assertEqual(a["lane"],b["lane"])
            if a["rank"]==17:
                self.assertNotIn("@",b["phrase"])
            else:
                self.assertEqual(a["phrase"],b["phrase"])
    def test_public_no_literal_mailbox_and_no_invented_outcomes(self):
        for p in (MATRIX,LIVE):
            text=p.read_text()
            self.assertNotIn("@gmail.com",text)
            self.assertNotIn("jeevacation",text)
        self.assertIsNone(self.live.get("google_indexed"))
        self.assertIsNone(self.live.get("search_rankings"))
        self.assertIsNone(self.live.get("keyword_volumes"))
    def test_all_mapped_live_routes_technically_valid_at_snapshot(self):
        self.assertEqual(self.live["total_keywords"],19)
        self.assertEqual(self.live["sitemap_http"],200)
        self.assertGreaterEqual(self.live["sitemap_urls"],100)
        self.assertEqual(self.live["mapped_routes"],len(self.live["routes"]))
        self.assertTrue(self.live["mapped_routes_all_pass"])
        for route,entry in self.live["routes"].items():
            self.assertEqual(entry["http"],200,route)
            self.assertTrue(entry["sitemap"],route)
            self.assertTrue(entry["self_canonical"],route)
            self.assertTrue(entry["title"],route)
            self.assertTrue(entry["h1"],route)
            self.assertNotIn("noindex",entry["robots_meta"].lower(),route)
    def test_efta_article_search_intent_and_guardrails(self):
        html=(ROOT/"investigations/hold-the-letter.html").read_text()
        self.assertIn("<title>EFTA00013764:",html)
        self.assertIn("What the Document Shows",html)
        self.assertIn("EFTA00013764 — what this document is:",html)
        self.assertIn("it does <strong>not</strong> identify any unnamed person",html)
        self.assertIn("https://www.justice.gov/epstein/files/DataSet%208/EFTA00013764.pdf",html)
        self.assertIn('href="/guides/how-to-search-epstein-files"',html)
        self.assertIn('href="https://grokarchivehub.com/investigations/hold-the-letter"',html)
        self.assertNotIn('gah-ad-eligible" content="true"',html)
    def test_search_guide_links_to_exact_context_page(self):
        s=(ROOT/"guides/how-to-search-epstein-files.html").read_text()
        self.assertIn('href="/investigations/hold-the-letter"',s)
        self.assertIn('EFTA00013764',s)
        self.assertIn("OCR",s)
        self.assertIn("DOJ",s)

if __name__=="__main__":
    unittest.main(verbosity=2)
