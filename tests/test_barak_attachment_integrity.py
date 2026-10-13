#!/usr/bin/env python3
"""Synthetic offline tests: no public fetch, no private Barak manifest."""
import contextlib
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

SCRIPT = Path(__file__).resolve().parents[1] / "scripts/barak/audit_attachment_pdfs.py"
SPEC = importlib.util.spec_from_file_location("barak_attachment_integrity", SCRIPT)
audit = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(audit)

SID = "/barak/source/pdf?sid=barak-src-012345abcdef"

class FakeProcess:
    def __init__(self, data=b"%PDF-1.7\n1 0 obj\n%%EOF", status=0):
        self.stdout = io.BytesIO(data)
        self.status = status
        self.killed = False
    def wait(self, timeout=None):
        return self.status
    def kill(self):
        self.killed = True

class AttachmentSourceAuditTests(unittest.TestCase):
    def test_only_exact_first_party_pdf_sid(self):
        good = (SID,)
        bad = (
            "", None, [], "//evil.example/pdf?sid=barak-src-012345abcdef",
            "https://evil.example/barak/source/pdf?sid=barak-src-012345abcdef",
            "/barak/source/pdf?sid=barak-src-012345abcdeg",
            "/barak/source/pdf?sid=barak-src-012345abcdef&x=y",
            "/barak/source/pdf?sid=barak-src-012345abcdef#frag",
            "/barak/source/pdf/extra?sid=barak-src-012345abcdef",
            "/barak/source/pdf?sid=../../secret", SID.upper(), "x" * 201
        )
        for item in good:
            with self.subTest(item=item): self.assertTrue(audit.permitted(item))
        for item in bad:
            with self.subTest(item=item): self.assertFalse(audit.permitted(item))

    def test_pdf_hash_and_https_no_redirect(self):
        payload=b"%PDF-1.7\ncontent\n%%EOF"
        f=FakeProcess(payload)
        with patch.object(audit.subprocess,"Popen",return_value=f) as popen:
            outcome=audit.audit_source(SID,18,10000)
        self.assertEqual(outcome,{"status":"pdf_verified","bytes":len(payload),"sha256":hashlib.sha256(payload).hexdigest()})
        argv=popen.call_args.args[0]
        self.assertIn("--proto",argv)
        self.assertEqual(argv[-1],"https://grokarchivehub.com"+SID)
        self.assertNotIn("--location",argv)
        self.assertNotIn("-L",argv)

    def test_rejects_html_even_on_200(self):
        with patch.object(audit.subprocess,"Popen",return_value=FakeProcess(b"<html>hello</html>")):
            self.assertEqual(audit.audit_source(SID,18,200)["status"],"non_pdf_response")

    def test_rejects_incomplete_pdf(self):
        with patch.object(audit.subprocess,"Popen",return_value=FakeProcess(b"%PDF-1.7\nno eof")):
            self.assertEqual(audit.audit_source(SID,18,100)["status"],"pdf_missing_eof")

    def test_remote_http_or_transport_failure(self):
        with patch.object(audit.subprocess,"Popen",return_value=FakeProcess(b"",status=22)):
            self.assertEqual(audit.audit_source(SID,18,100)["status"],"transport_or_http_failure")

    def test_refuses_overlimit_content(self):
        f=FakeProcess(b"%PDF-" + (b"x"*100) + b"%%EOF")
        with patch.object(audit.subprocess,"Popen",return_value=f):
            outcome=audit.audit_source(SID,18,40)
        self.assertEqual(outcome["status"],"size_limit")
        self.assertTrue(f.killed)

    def test_untrusted_url_not_fetched(self):
        with patch.object(audit.subprocess,"Popen") as popen:
            self.assertEqual(audit.audit_source("https://evil.invalid/other.pdf",18,200),{"status":"rejected_url"})
            popen.assert_not_called()

    def test_ledger_resume_and_private_permissions(self):
        with tempfile.TemporaryDirectory() as d:
            folder=Path(d)
            index=folder/"inventory.json"
            ledger=folder/"ledger.jsonl"
            rows=[{"id":"synthetic-1","sourceFile":SID},{"id":"synthetic-2","sourceFile":SID}]
            index.write_text(json.dumps({"items":rows}))
            argv=["audit","--inventory",str(index),"--ledger",str(ledger),"--limit","2"]
            calls=[]
            def stub(raw, timeout, byte_limit):
                calls.append(raw)
                return {"status":"pdf_verified","bytes":12,"sha256":"f"*64}
            with patch.object(sys,"argv",argv),patch.object(audit,"audit_source",side_effect=stub):
                with contextlib.redirect_stdout(io.StringIO()) as out: audit.main()
                first=json.loads(out.getvalue())
                self.assertEqual(first["processed_this_run"],2)
                self.assertEqual(first["publication_gate"],"blocked_pending_full_source_review")
                with contextlib.redirect_stdout(io.StringIO()) as resumed: audit.main()
                self.assertEqual(json.loads(resumed.getvalue())["processed_this_run"],0)
            self.assertEqual(len(calls),2)
            self.assertEqual(len(ledger.read_text().splitlines()),2)
            self.assertEqual(ledger.stat().st_mode & 0o777,0o600)

    def test_duplicate_ids_rejected_without_network(self):
        with tempfile.TemporaryDirectory() as d:
            folder=Path(d)
            index=folder/"i.json"; ledger=folder/"l.jsonl"
            index.write_text(json.dumps({"items":[{"id":"same"},{"id":"same"}]}))
            with patch.object(sys,"argv",["audit","--inventory",str(index),"--ledger",str(ledger)]):
                with self.assertRaises(SystemExit):audit.main()
            self.assertFalse(ledger.exists())

if __name__ == "__main__":
    unittest.main(verbosity=2)
