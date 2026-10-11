#!/usr/bin/env python3
"""No network fixture tests for FEC Watch; no campaign-ad inferences."""
import importlib.util
import json
from pathlib import Path
import tempfile
import types
import unittest
import sys
import os
src=Path(__file__).parent
spec=importlib.util.spec_from_file_location("fec_watch",src/"watch_fec.py")
m=importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)

def response(cid, rows, count=None):
    return json.dumps({"pagination":{"count":len(rows) if count is None else count},
                       "results":[{"candidate_id":cid,"sub_id":str(n),"committee_id":"C00000001","expenditure_amount":1000+n,"filing_date":"2026-10-11","support_oppose_indicator":"S","expenditure_description":"GENERAL AD SERVICES"} for n in rows]}).encode()

class FECTests(unittest.TestCase):
 def test_one_page_partial_coverage(self):
    cid="H6CO05142"
    data=m.pull(cid,lambda url:response(cid,[1,2],count=37))
    self.assertTrue(data["first_page_only"])
    self.assertEqual(set(data["records"]),{"1","2"})
    self.assertEqual(data["candidate_id"],cid)
 def test_first_baseline_silent_and_then_new_expense(self):
    with tempfile.TemporaryDirectory() as t:
        def first(url):
            cid="H6CO05142" if "H6CO05142" in url else "H6CO05324"
            return response(cid,[1] if cid=="H6CO05142" else [3])
        first_report=m.execute(Path(t),first,update=True)
        self.assertEqual(first_report["new_review_events"],0)
        self.assertEqual(len(first_report["first_baselines"]),2)
        def second(url):
            cid="H6CO05142" if "H6CO05142" in url else "H6CO05324"
            return response(cid,[1,2] if cid=="H6CO05142" else [3])
        # Temporarily mock the notifier so tests never raise real OS notifications.
        import sys
        parent=src.parent
        sys.path.insert(0,str(parent))
        import notify
        original=notify.deliver
        notify.deliver=lambda _:{"pending":0,"delivered":0,"failed":0}
        try:
            result=m.execute(Path(t),second,update=True)
            self.assertEqual(result["new_review_events"],1)
            self.assertFalse(result["issue_attribution_proved"])
            again=m.execute(Path(t),second,update=True)
            self.assertEqual(again["new_review_events"],0)
        finally:
            notify.deliver=original
        ledger=[json.loads(line) for line in (Path(t)/"events.jsonl").read_text().splitlines()]
        self.assertEqual(len(ledger),1)
        self.assertIn("NOT proof of Epstein-themed",ledger[0]["note"])
        self.assertEqual(os.stat(Path(t)/"state.json").st_mode & 0o777,0o600)
 def test_identity_mismatch_never_replaces_baseline(self):
    cid="H6CO05142"
    bad=response("H6CO05324",[1])
    with self.assertRaisesRegex(RuntimeError,"identity_mismatch"):
        m.pull(cid,lambda _:bad)
 def test_empty_error_does_not_erase_previous_state(self):
    with tempfile.TemporaryDirectory() as t:
        directory=Path(t)
        def valid(url):
            cid="H6CO05142" if "H6CO05142" in url else "H6CO05324"
            return response(cid,[1])
        m.execute(directory,valid,update=True)
        def broken(url):
            if "H6CO05142" in url:raise RuntimeError("fec_source_unavailable")
            return valid(url)
        report=m.execute(directory,broken,update=True)
        self.assertEqual(report["health"],"degraded")
        self.assertIn("H6CO05142",report["errors"])
        state=json.loads((directory/"state.json").read_text())
        self.assertIn("1",state["candidates"]["H6CO05142"]["records"])
 def test_no_auto_ad_attribution(self):
    previous={"H6CO05142":{"records":{"1":{"sub_id":"1"}}}}
    current={"H6CO05142":{"records":{"1":{"sub_id":"1"},"2":{"sub_id":"2","expenditure_amount":110}}}}
    event=m.report_for(previous,current)[0]
    self.assertEqual(event["kind"],"official_fec_independent_expenditure_filing")
    self.assertTrue(event["review_required"])
    self.assertNotIn("epstein",event["kind"].lower())
    self.assertNotIn("ad spend confirmed",str(event).lower())
 def test_invalid_records(self):
    cid="H6CO05142"
    for raw in (b"",b"{}",b"<html>429 Too Many Requests</html>"):
        with self.assertRaises((RuntimeError,ValueError,json.JSONDecodeError)):
            m.pull(cid,lambda _:raw)

if __name__=="__main__":
    unittest.main(verbosity=2)
