#!/usr/bin/env python3
"""Regression guard for Google discovery links from established GAH pages.

This tests discoverability, not Google indexing or search rankings.
"""
from html.parser import HTMLParser
from pathlib import Path
import re
import unittest

ROOT=Path(__file__).resolve().parents[2]
SEARCH="/guides/how-to-search-epstein-files"
DATASETS="/guides/doj-epstein-data-sets"
EFTA="/investigations/hold-the-letter"

class Anchors(HTMLParser):
    def __init__(self):
        super().__init__()
        self.hrefs=[]
    def handle_starttag(self,tag,attrs):
        if tag=="a":
            d=dict(attrs)
            self.hrefs.append(d.get("href",""))

def links(path):
    parser=Anchors()
    parser.feed((ROOT/path).read_text())
    return parser.hrefs

class IndexDiscoveryTests(unittest.TestCase):
    def test_indexed_mcc_timeline_links_to_source_guides(self):
        urls=links("dispatches/epstein-mcc-timeline.html")
        self.assertIn(SEARCH,urls)
        self.assertIn(DATASETS,urls)
    def test_indexed_jail_log_links_to_efta_search_tutorial(self):
        self.assertIn(SEARCH,links("dispatches/epstein-jail-logs.html"))
    def test_investigations_hub_directly_exposes_efta_context(self):
        self.assertIn(EFTA,links("investigations.html"))
        body=(ROOT/"investigations.html").read_text()
        self.assertIn("original DOJ PDF",body)
        self.assertIn("does not identify an unnamed decision-maker",body)
    def test_priority_titles_are_concise_and_specific(self):
        cases=[
         (SEARCH,"How to Search Epstein Files"),
         (DATASETS,"DOJ Epstein Data Sets 1–12"),
         (EFTA,"EFTA00013764")
        ]
        for path,keyword in cases:
            html=(ROOT/(path.lstrip("/")+".html")).read_text()
            match=re.search(r"<title>([^<]+)</title>",html)
            self.assertIsNotNone(match,path)
            title=match.group(1)
            self.assertLessEqual(len(title),60,(path,len(title)))
            self.assertIn(keyword,title)
            self.assertIn('href="https://grokarchivehub.com'+path+'"',html)
            self.assertNotRegex(html,r'<meta\b[^>]*name=["\']robots["\'][^>]*noindex')
    def test_no_unverified_indexing_claim_in_navigation(self):
        nav=(ROOT/"dispatches/epstein-mcc-timeline.html").read_text()
        self.assertIn("Open the original DOJ release indexes",nav)
        self.assertIn("Find original PDFs, verify EFTA IDs",nav)
        self.assertNotIn("Google indexed our new guides",nav)

if __name__=="__main__":
    unittest.main(verbosity=2)
