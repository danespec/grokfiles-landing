#!/usr/bin/env python3
"""Synthetic fixtures only; no live source text or identifiers."""
import hashlib
import io
import json
from pathlib import Path
import sys
import tempfile
import unittest
from contextlib import redirect_stdout

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/"scripts/barak"))
import audit_recovered_references as audit

SID="/barak/source/pdf?sid=barak-src-012345abcdef"

def fixtures():
    a={"items":[{"id":"e1","slotClass":"recovered_email","linkedPdfIds":["p1","p2"]},
                {"id":"e2","slotClass":"recovered_email","linkedPdfIds":[]}]}
    b={"items":[{"id":"p1","sourceFile":SID},
                {"id":"p2","sourceFile":SID.replace("012345abcdef","fedcba654321")}]}
    return a,b

class JoinTests(unittest.TestCase):
    def test_clean_aggregate_no_identifiers_or_provenance_overclaim(self):
        a,b=fixtures()
        r=audit.summarize(json.dumps(a).encode(),json.dumps(b).encode())
        for k,v in {"recovered_label_rows":2,"recovered_rows_with_references":1,
                    "recovered_rows_without_references":1,"references":2,
                    "distinct_pdf_references":2,"matched_references":2,
                    "allowlisted_pdf_source_paths":2}.items():
            self.assertEqual(r[k],v)
        self.assertFalse(r["parent_bodies_authenticated"])
        self.assertNotIn("p1",json.dumps(r))
        self.assertNotIn("barak-src-",json.dumps(r))

    def test_orphan_count_and_malicious_source(self):
        a,b=fixtures()
        a["items"][0]["linkedPdfIds"].append("orphan")
        b["items"][0]["sourceFile"]="https://evil.invalid/file"
        r=audit.summarize(json.dumps(a).encode(),json.dumps(b).encode())
        self.assertEqual(r["unmatched_references"],1)
        self.assertEqual(r["unapproved_or_missing_source_paths"],1)
        self.assertNotIn("orphan",json.dumps(r))

    def test_duplicate_ids_and_invalid_references_rejected(self):
        a,b=fixtures()
        b["items"][1]["id"]="p1"
        with self.assertRaisesRegex(ValueError,"duplicate"):
            audit.summarize(json.dumps(a).encode(),json.dumps(b).encode())
        a,b=fixtures()
        a["items"][0]["linkedPdfIds"]=["p1","p1"]
        with self.assertRaisesRegex(ValueError,"duplicate"):
            audit.summarize(json.dumps(a).encode(),json.dumps(b).encode())
        a,b=fixtures()
        a["items"][0]["linkedPdfIds"]="p1"
        with self.assertRaisesRegex(ValueError,"invalid"):
            audit.summarize(json.dumps(a).encode(),json.dumps(b).encode())

    def test_cli_pins_versions_and_fails_closed(self):
        a,b=fixtures()
        with tempfile.TemporaryDirectory() as temp:
            ep=Path(temp)/"a.json"; pp=Path(temp)/"b.json"
            eb=json.dumps(a).encode();pb=json.dumps(b).encode()
            ep.write_bytes(eb);pp.write_bytes(pb)
            args=["--email-manifest",str(ep),"--pdf-manifest",str(pp),
                  "--expect-email-sha256",hashlib.sha256(eb).hexdigest(),
                  "--expect-pdf-sha256",hashlib.sha256(pb).hexdigest(),"--require-clean"]
            with redirect_stdout(io.StringIO()) as output:
                self.assertEqual(audit.main(args),0)
            self.assertIn('"matched_references": 2',output.getvalue())
            with self.assertRaisesRegex(SystemExit,"pdf source digest mismatch"):
                audit.main(args[:-1]+["--expect-pdf-sha256","0"*64])
            a["items"][0]["linkedPdfIds"].append("orphan")
            ep.write_bytes(json.dumps(a).encode())
            with self.assertRaisesRegex(SystemExit,"reference-integrity gate failed"):
                audit.main(["--email-manifest",str(ep),"--pdf-manifest",str(pp),"--require-clean"])

if __name__=="__main__":
    unittest.main(verbosity=2)
