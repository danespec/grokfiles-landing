#!/usr/bin/env python3
"""Offline regression tests for the distinct Phang filing obligations."""
import contextlib
import datetime as dt
import io
import json
import os
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0,str(Path(__file__).resolve().parent))
import watch
import court_review

class PhangDeadlineTests(unittest.TestCase):
    def test_prior_october_list_review_and_no_automatic_failure_verdict(self):
        events=court_review.due_reviews("2026-10-11")
        self.assertEqual(len(events),1)
        self.assertEqual(events[0]["source"],"phang-list-ecf42-20261001")
        self.assertEqual(events[0]["id"],"review-list-ecf42-20261001")
        self.assertIn("no new evidence",events[0]["note"].lower())
        self.assertNotIn("compliance_failure",str(events))
    def test_timeboxed_milestones(self):
        values={"2026-10-10":0,"2026-10-11":1,"2026-10-12":1,
                "2026-10-13":2,"2026-10-14":3,
                "2026-10-15":4,"2026-10-16":5}
        for day,total in values.items():
            with self.subTest(day=day):
                self.assertEqual(len(court_review.due_reviews(day)),total)
        all_events=court_review.due_reviews(dt.date(2026,10,17))
        self.assertEqual(len({x["event_id"] for x in all_events}),5)
        self.assertTrue(all(x["kind"]=="manual_verification_milestone" for x in all_events))
        self.assertTrue(any("NOON Eastern" in x["label"] for x in all_events))
    def test_first_ledger_review_enqueued_then_deduplicated(self):
        with tempfile.TemporaryDirectory() as temp:
            root=Path(temp)
            os.chmod(root,0o700)
            catalog=root/"catalog.json"
            catalog.write_text(json.dumps({"schema":"gah.primary_source_watch.catalog.v1","sources":[],"coverage_gaps":[]}))
            fixture_report={"schema":"gah.primary_source_watch.report.v1","generated_at":"2026-10-11T20:00:00Z",
                            "health":"complete_for_configured_sources","observed":[],
                            "unavailable":{},"review_events":[],"baseline_count":0,
                            "coverage_gaps":[]}
            def fake_report(catalog,previous):
                return dict(fixture_report),dict(previous)
            def no_notification(_):
                return {"pending":0,"delivered":0,"failed":0}
            with patch.object(watch,"build_report",side_effect=fake_report), \
                 patch("court_review.due_reviews",return_value=court_review.due_reviews("2026-10-11")), \
                 patch("notify.deliver",side_effect=no_notification), \
                 patch("notify.deliver_court_health",return_value={"critical_sources_unavailable":0,"delivered":0}):
                with contextlib.redirect_stdout(io.StringIO()):
                    self.assertEqual(watch.main(["--update","--private-dir",str(root),"--catalog",str(catalog)]),0)
                    self.assertEqual(watch.main(["--update","--private-dir",str(root),"--catalog",str(catalog)]),0)
            events=[json.loads(x) for x in (root/"events.jsonl").read_text().splitlines()]
            self.assertEqual(len(events),1)
            self.assertEqual(events[0]["kind"],"manual_verification_milestone")
            self.assertIn("gah-phang-review-",events[0]["event_id"])
            self.assertEqual(os.stat(root/"events.jsonl").st_mode&0o777,0o600)
            latest=json.loads((root/"latest-report.json").read_text())
            self.assertEqual(latest["scheduled_review_milestones"],0)
    def test_exact_document_sources_present(self):
        sources=json.loads((Path(__file__).resolve().parent/"sources.json").read_text())["sources"]
        documents={x["id"]:x for x in sources}
        for num in (42,54,55,56,57):
            matches=[x for k,x in documents.items() if k.startswith("phang-ecf"+str(num)+"-")]
            self.assertEqual(len(matches),1)
            self.assertEqual(matches[0]["mode"],"official_pdf")
            self.assertTrue(watch.safe_url(matches[0]["url"]))

if __name__=="__main__":
    unittest.main(verbosity=2)
