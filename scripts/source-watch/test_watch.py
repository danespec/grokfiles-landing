#!/usr/bin/env python3
"""Offline tests for primary-source intake; never contact live providers."""
import importlib.util
import json
import os
from pathlib import Path
import tempfile
import unittest
root=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location("gah_source_watch",root/"watch.py")
mod=importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

FB="https://vault.fbi.gov/records-regarding-the-review-of-the-investigative-holdings-related-to-jeffrey-epstein/"
SRC={"schema":"gah.primary_source_watch.catalog.v1","coverage_gaps":["court mirror may lag"],"sources":[
 {"id":"fbi","url":FB,"mode":"links","pattern":r"part-[0-9]{2}"},
 {"id":"court","url":"https://www.courtlistener.com/docket/73246595/phang-v-blanche/","mode":"document"}
]}
def links(*numbers):
    return ("<html><body><h1>Agency Documents</h1>"+
        "".join('<a href="'+FB+'records-regarding-the-review-of-the-investigative-holdings-related-to-jeffrey-epstein-part-%02d/view">Part %02d</a>'%(n,n) for n in numbers)+
        '<a href="https://malicious.example/part-99">Wrong site</a></body></html>').encode()
DOC1=("<html><body><p>" + "Updated court docket historical entries with dated entries and filings. "*4 + "</p></body></html>").encode()
DOC2=("<html><body><p>" + "Updated court docket historical entries with dated entries and filings. "*4 + "One new docket entry appears.</p></body></html>").encode()
class WatchTests(unittest.TestCase):
 def test_allowlist(self):
    self.assertTrue(mod.safe_url(FB))
    self.assertFalse(mod.safe_url("http://vault.fbi.gov/"))
    self.assertFalse(mod.safe_url("https://vault.fbi.gov.evil.test/"))
    self.assertFalse(mod.safe_url("https://example.org/"))
 def test_fbi_canonical(self):
    d=mod.observe(SRC["sources"][0],lambda _:links(12,13))
    self.assertEqual(len(d["links"]),2)
    self.assertTrue(all(x.startswith(FB) for x in d["links"]))
 def test_no_result_is_not_removal(self):
    with self.assertRaisesRegex(RuntimeError,"index_empty"):
        mod.observe(SRC["sources"][0],lambda _:b"<h1>Site maintenance</h1>")
 def test_baseline(self):
    def mocked(url):
        return links(12,13) if url==FB else DOC1
    report,state=mod.build_report(SRC,{},mocked,lambda:"2026-10-11T18:00:00Z")
    self.assertEqual(report["baseline_count"],2)
    self.assertEqual(report["review_events"],[])
    self.assertEqual(len(state),2)
 def test_new_part_and_docket_change(self):
    def mocked(url):
        return links(12,13) if url==FB else DOC1
    _,state=mod.build_report(SRC,{},mocked)
    def changed(url):
        return links(12,13,14) if url==FB else DOC2
    report,_=mod.build_report(SRC,state,changed)
    kinds={x["kind"] for x in report["review_events"]}
    self.assertEqual(kinds,{"new_source_link","page_text_changed"})
    self.assertTrue(all(x["review_required"] for x in report["review_events"]))
 def test_index_missing_not_deleted(self):
    x=mod.observe(SRC["sources"][0],lambda _:links(12,13))
    y=mod.observe(SRC["sources"][0],lambda _:links(12))
    events,_=mod.compare(x,y,"fbi")
    self.assertEqual(events[0]["kind"],"link_absent_from_current_index")
    self.assertIn("NOT verified deletion",events[0]["note"])
 def test_403_preserves_baseline(self):
    def mocked(url):
        return links(12,13) if url==FB else DOC1
    _,state=mod.build_report(SRC,{},mocked)
    def blocked(url):
        if url==FB: raise RuntimeError("source_unavailable_http_403")
        return DOC1
    report,nextstate=mod.build_report(SRC,state,blocked)
    self.assertEqual(report["unavailable"]["fbi"],"source_unavailable_http_403")
    self.assertEqual(nextstate["fbi"],state["fbi"])
    self.assertEqual(report["review_events"],[])
 def test_repeated_snapshot_no_events(self):
    def mocked(url):
        return links(12,13) if url==FB else DOC1
    _,state=mod.build_report(SRC,{},mocked)
    report,_=mod.build_report(SRC,state,mocked)
    self.assertFalse(report["review_events"])
 def test_federal_register(self):
    s={"url":"https://www.federalregister.gov/api/v1/documents.json?conditions%5Bterm%5D=Epstein","mode":"federalregister"}
    payload=json.dumps({"results":[{"html_url":"https://www.federalregister.gov/documents/2026/10/01/example","title":"DOJ release notice"},{"html_url":"https://evil.invalid/fraud","title":"bad"}]}).encode()
    result=mod.observe(s,lambda _:payload)
    self.assertEqual(len(result["links"]),1)
 def test_bad_federal_register_schema(self):
    s={"url":"https://www.federalregister.gov/api/v1/documents.json","mode":"federalregister"}
    with self.assertRaisesRegex(ValueError,"unexpected"):
        mod.observe(s,lambda _:b"{}")
 def test_private_file_permissions(self):
    with tempfile.TemporaryDirectory() as t:
        p=Path(t)/"watch"/"state.json"
        mod.write_secure(p,{"ok":True})
        self.assertEqual(os.stat(p).st_mode & 0o777,0o600)
        self.assertEqual(os.stat(p.parent).st_mode & 0o777,0o700)
if __name__=="__main__":
 unittest.main(verbosity=2)
