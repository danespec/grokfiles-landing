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
        self.assertEqual(len({x["event_id"] for x in all_events}),6)
        self.assertTrue(all(x["kind"]=="manual_verification_milestone" for x in all_events))
        self.assertTrue(any("NOON EASTERN" in x["label"].upper() for x in all_events))
    def test_oct16_eastern_noon_vs_denver_morning_gate(self):
        from zoneinfo import ZoneInfo
        local=ZoneInfo("America/Denver")
        before=dt.datetime(2026,10,16,8,29,tzinfo=local)
        morning=dt.datetime(2026,10,16,8,30,tzinfo=local)
        not_due_yet=dt.datetime(2026,10,16,9,59,tzinfo=local)
        deadline=dt.datetime(2026,10,16,10,0,tzinfo=local)
        self.assertEqual(len(court_review.due_reviews(before)),4)
        checkpoint=court_review.due_reviews(morning)[-1]
        self.assertEqual(len(court_review.due_reviews(morning)),5)
        self.assertEqual(checkpoint["obligation_state"],"pending_due_noon_eastern")
        self.assertIn("PENDING",checkpoint["label"])
        self.assertIn("10:00 MDT",checkpoint["label"])
        self.assertIn("pending_due_noon_eastern",
                      court_review.current_status(not_due_yet)["oct16_redacted_fbi_notes"])
        ledger=court_review.current_status(morning)
        self.assertEqual(ledger["oct16_deadline_denver"],"2026-10-16T10:00-06:00")
        self.assertEqual(ledger["oct16_deadline_eastern"],"2026-10-16T12:00-04:00")
        self.assertEqual(ledger["compliance_verdict"],"unresolved_without_independent_primary_confirmation")
        elapsed=court_review.current_status(deadline)
        self.assertEqual(elapsed["oct16_redacted_fbi_notes"],"deadline_elapsed_verification_deferred_to_oct17")
        self.assertEqual(elapsed["compliance_verdict"],ledger["compliance_verdict"])
        self.assertIn("UNVERIFIED",court_review.due_reviews(deadline)[-1]["label"])
    def test_oct17_check_is_separate_and_not_a_automatic_noncompliance_verdict(self):
        from zoneinfo import ZoneInfo
        local=ZoneInfo("America/Denver")
        before=dt.datetime(2026,10,17,8,29,tzinfo=local)
        follow=dt.datetime(2026,10,17,8,30,tzinfo=local)
        self.assertEqual(len(court_review.due_reviews(before)),5)
        events=court_review.due_reviews(follow)
        self.assertEqual(len(events),6)
        self.assertEqual(events[-1]["source"],"phang-in-camera-docket-review-20261017")
        self.assertIn("UNRESOLVED",events[-1]["label"])
        state=court_review.current_status(follow)
        self.assertEqual(state["oct16_redacted_fbi_notes"],"post_deadline_check_required_not_verified")
        self.assertEqual(state["ecf51_postponement_order"],"unverified_requires_signed_court_order")
        self.assertEqual(state["oct01_certified_record_list"],"unverified_requires_complete_docket")
        self.assertEqual(state["compliance_verdict"],"unresolved_without_independent_primary_confirmation")
    def test_naive_timestamp_rejected(self):
        with self.assertRaisesRegex(ValueError,"timezone-aware"):
            court_review.current_status(dt.datetime(2026,10,16,8,30))
    def test_calendar_snapshot_is_private_and_status_only(self):
        with tempfile.TemporaryDirectory() as temp:
            root=Path(temp)
            os.chmod(root,0o700)
            catalog=root/"catalog.json"
            catalog.write_text(json.dumps({"schema":"gah.primary_source_watch.catalog.v1","sources":[],"coverage_gaps":[]}))
            fixture={"schema":"gah.primary_source_watch.report.v1","generated_at":"2026-10-16T14:30:00Z",
                     "health":"complete_for_configured_sources","observed":[],"unavailable":{},
                     "review_events":[],"baseline_count":0,"coverage_gaps":[]}
            with patch.object(watch,"build_report",return_value=(fixture,{})), \
                 patch("notify.deliver",return_value={"pending":0,"delivered":0,"failed":0}), \
                 patch("notify.deliver_court_health",return_value={"critical_sources_unavailable":0,"delivered":0}):
                with contextlib.redirect_stdout(io.StringIO()):
                    watch.main(["--update","--private-dir",str(root),"--catalog",str(catalog)])
            ledger=root/"phang-compliance-review.json"
            saved=json.loads(ledger.read_text())
            self.assertEqual(os.stat(ledger).st_mode&0o777,0o600)
            self.assertEqual(saved["oct16_redacted_fbi_notes"],"pending_due_noon_eastern")
            self.assertEqual(saved["compliance_verdict"],"unresolved_without_independent_primary_confirmation")
            events=[json.loads(line) for line in (root/"events.jsonl").read_text().splitlines()]
            self.assertEqual(events[-1]["obligation_state"],"pending_due_noon_eastern")
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
