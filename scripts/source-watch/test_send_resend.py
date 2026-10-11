#!/usr/bin/env python3
"""Offline tests for restricted Resend outbound alerts; never transmit email."""
import datetime as dt
import json
import os
from pathlib import Path
import tempfile
import unittest
import urllib.error
import sys
import types
import send_resend as m

class ResendTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root=Path(self.temp.name)
        os.chmod(self.root,0o700)
        original_fec=m.FEC_PRIVATE_DIR
        m.FEC_PRIVATE_DIR=self.root/"fec-test-events"
        self.addCleanup(lambda: setattr(m,"FEC_PRIVATE_DIR",original_fec))
        self.key=self.root/"send.key"
        self.key.write_text("re_"+"x"*32)
        os.chmod(self.key,0o600)
        self.cfg=self.root/"resend-alerts-config.json"
        self.cfg.write_text(json.dumps({"enabled":True,
            "from":m.EXPECTED_FROM,"to":m.EXPECTED_TO,"key_file":str(self.key)}))
        os.chmod(self.cfg,0o600)
    def events(self,entries):
        f=self.root/"events.jsonl"
        f.write_text("".join(json.dumps(e)+"\n" for e in entries))
        os.chmod(f,0o600)
    def report(self,errors):
        f=self.root/"latest-report.json"
        f.write_text(json.dumps({"unavailable":errors}))
        os.chmod(f,0o600)
    def good(self,req):
        body=json.loads(req.data)
        self.assertEqual(body["to"],[m.EXPECTED_TO])
        self.assertEqual(body["from"],m.EXPECTED_FROM)
        self.assertNotIn("sensitive",body["text"].lower())
        self.assertEqual(req.full_url,m.API_URL)
        self.assertTrue(req.headers["Authorization"].startswith("Bearer re_"))
        self.assertIn("Idempotency-key",req.headers)
        return (200,b'{"id":"sent-0001"}')
    def test_curl_transport_keeps_credential_out_of_process_args(self):
        from unittest.mock import patch
        import urllib.request
        req=urllib.request.Request(m.API_URL,data=b'{"test":true}',method="POST")
        original=m.PRIVATE_DIR
        m.PRIVATE_DIR=self.root
        try:
            def fake(args,**kw):
                self.assertNotIn("re_secret-test-value",repr(args))
                self.assertIn(b"Authorization: Bearer re_secret-test-value",kw["input"])
                self.assertTrue((self.root).is_dir())
                return types.SimpleNamespace(returncode=0,stdout=b'{"id":"fixture"}\n__GAH_RESEND_STATUS__200')
            with patch.object(m.subprocess,"run",fake):
                status,body=m.verified_curl_post(req,"re_secret-test-value","gah-test-01")
            self.assertEqual(status,200)
            self.assertIn(b"fixture",body)
            self.assertFalse(list(self.root.glob(".gah-resend-*")))
        finally:
            m.PRIVATE_DIR=original
    def test_separate_fec_ledger_triggers_one_redacted_email(self):
        fec_dir=m.FEC_PRIVATE_DIR
        fec_dir.mkdir(parents=True,exist_ok=True)
        (fec_dir/"events.jsonl").write_text(json.dumps({
            "event_id":"fec-4101020261612210538",
            "source":"fec-schedule-e-h6co05142",
            "kind":"official_fec_independent_expenditure_filing",
            "candidate_id":"H6CO05142",
            "committee_id":"C00953588",
            "amount_usd":20581.24
        })+"\n")
        self.report({})
        def check(req):
            body=json.loads(req.data)
            self.assertIn("fec-schedule-e-h6co05142",body["text"])
            self.assertNotIn("20581",body["text"])
            self.assertNotIn("C00953588",body["text"])
            return 200,b'{"id":"fec-test"}'
        result=m.deliver(self.root,self.cfg,transport=check)
        self.assertEqual(result["events"],1)
        self.assertEqual(m.deliver(self.root,self.cfg,transport=lambda _:self.fail("repeat"))["status"],"idle")
    def test_no_events_no_send(self):
        self.report({})
        self.assertEqual(m.deliver(self.root,self.cfg,transport=lambda r:self.fail("unwanted email"))["status"],"idle")
    def test_event_only_email_no_sensitive_labels(self):
        self.events([{"event_id":"1234567890","source":"phang-dcd-official-rss",
                      "kind":"target_case_docket_activity",
                      "label":"Sensitive survivor name","url":"https://ecf.dcd.uscourts.gov/?secret=123"}])
        self.report({})
        sent=m.deliver(self.root,self.cfg,transport=self.good)
        self.assertEqual(sent["status"],"accepted_by_resend")
        self.assertEqual(sent["events"],1)
        self.assertEqual(m.deliver(self.root,self.cfg,transport=lambda _:self.fail("duplicate email"))["status"],"idle")
        self.assertEqual(os.stat(self.root/"resend-alerts-ack.json").st_mode & 0o777,0o600)
        self.assertEqual(os.stat(self.root/"resend-alerts-last.json").st_mode & 0o777,0o600)
        self.assertEqual(json.loads((self.root/"resend-alerts-last.json").read_text())["delivery_status"],
                         "accepted_by_resend_not_inbox_confirmed")
    def test_failure_retry_uses_same_idempotency_key(self):
        self.events([{"event_id":"fixture12345","source":"doj-index","kind":"new_source_link"}])
        req_keys=[]
        def fail(req):
            req_keys.append(req.headers["Idempotency-key"])
            raise urllib.error.URLError("dummy timeout")
        first=m.deliver(self.root,self.cfg,transport=fail)
        self.assertEqual(first["status"],"send_failed")
        self.assertFalse((self.root/"resend-alerts-ack.json").exists())
        def success(req):
            req_keys.append(req.headers["Idempotency-key"])
            return (201,b'{"id":"accepted-id"}')
        second=m.deliver(self.root,self.cfg,transport=success)
        self.assertEqual(second["status"],"accepted_by_resend")
        self.assertEqual(req_keys[0],req_keys[1])
    def test_outage_alert_once_daily(self):
        now=dt.datetime(2026,10,11,21,tzinfo=dt.timezone.utc)
        self.report({"phang-dcd-official-rss":"source_transport_failure"})
        calls=[]
        def send(req):
            calls.append(json.loads(req.data))
            return (200,b'{"id":"outage-01"}')
        self.assertEqual(m.deliver(self.root,self.cfg,transport=send,now=now)["court_feed_outages"],1)
        self.assertEqual(m.deliver(self.root,self.cfg,transport=send,now=now)["status"],"idle")
        self.assertEqual(len(calls),1)
        self.assertIn("NOT evidence",calls[0]["text"])
        self.assertNotIn("source_transport_failure",calls[0]["text"])
    def test_permission_checks(self):
        self.key.chmod(0o644)
        with self.assertRaisesRegex(RuntimeError,"permissions_not_private"):
            m.load_config(self.cfg)
    def test_recipient_fixed(self):
        conf=json.loads(self.cfg.read_text());conf["to"]="other@example.net"
        self.cfg.write_text(json.dumps(conf));os.chmod(self.cfg,0o600)
        with self.assertRaisesRegex(RuntimeError,"not_approved"):
            m.load_config(self.cfg)
    def test_missing_provider_id_is_not_success(self):
        self.events([{"event_id":"aaa12345","source":"dccc-ad","kind":"page_text_changed"}])
        self.report({})
        failed=m.deliver(self.root,self.cfg,transport=lambda req:(202,b'{}'))
        self.assertEqual(failed["status"],"send_failed")
        self.assertFalse((self.root/"resend-alerts-ack.json").exists())
    def test_large_batch_is_bounded(self):
        self.events([{"event_id":"testid-"+str(i).zfill(5),"source":"doj-index","kind":"new_source_link"} for i in range(100)])
        self.report({})
        chosen=m.plan(self.root,[])
        self.assertEqual(chosen["event_count"],m.BATCH_LIMIT)
        self.assertEqual(len(chosen["ids"]),m.BATCH_LIMIT)
    def test_safe_title_rejects_names_and_markup(self):
        self.assertEqual(m.safe_title("<person name>"),"source-redacted")
        self.assertEqual(m.safe_title("phang-dcd-official-rss"),"phang-dcd-official-rss")
    def test_test_message_has_no_event_claim(self):
        def fake(req):
            body=json.loads(req.data)
            self.assertIn("delivery test",body["text"])
            return (200,b'{"id":"test-1"}')
        result=m.test_message(self.root,self.cfg,transport=fake)
        self.assertEqual(result["status"],"accepted_by_resend")

if __name__=="__main__":
    unittest.main(verbosity=2)
