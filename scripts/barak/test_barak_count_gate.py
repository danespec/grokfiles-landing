#!/usr/bin/env python3
"""Barak inventory-row count reconciliation without parent-body overclaims."""
from html.parser import HTMLParser
from pathlib import Path
import importlib.util
import json
import re
import unittest

ROOT = Path(__file__).resolve().parents[2]
SCRIPT = ROOT / "scripts/barak/reconcile_slot_classes.py"
SPEC = importlib.util.spec_from_file_location("barak_reconcile", SCRIPT)
audit = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(audit)

def field(src, key):
    m = re.search(r'"' + re.escape(key) + r'":(\{[^{}]+\})', src)
    if not m:
        raise AssertionError("missing "+key)
    return json.loads(m.group(1))

class Links(HTMLParser):
    def __init__(self):
        super().__init__();self.hrefs=[]
    def handle_starttag(self,tag,attrs):
        if tag == "a":
            self.hrefs.append(dict(attrs).get("href",""))

class BarakCountGate(unittest.TestCase):
    def test_live_050_inventory_counters_reconciled(self):
        s=(ROOT/"assets/barak-data-050.js").read_text()
        c=field(s,"sourceTypeCounts")
        recovery=field(s,"emailSourceRecovery")
        counts=field(s,"sourceInputs")
        self.assertEqual(counts["archiveEmailSlots"],11089)
        self.assertEqual(c["Recovered emails"],19)
        self.assertEqual(c["Attachment-backed slots"],5587)
        self.assertEqual(c["Metadata-only slots"],5483)
        self.assertEqual(recovery["metadataOnlySlot"],5483)
        self.assertEqual(sum(c[k] for k in ("Recovered emails","Attachment-backed slots","Metadata-only slots")),11089)

    def test_legacy_snapshots_preserved_as_historical(self):
        for f in ("assets/barak-data.v298.js","assets/barak-data-048.js"):
            s=(ROOT/f).read_text()
            self.assertEqual(field(s,"sourceTypeCounts")["Metadata-only slots"],5505)

    def test_recovery_count_cannot_claim_verified_parent(self):
        for name in ("assets/barak-portal-027.js","assets/barak-portal.js"):
            s=(ROOT/name).read_text()
            self.assertIn("Archive-labeled recovered slots (unverified)",s)
            self.assertIn('item.type === "email" || item.slotClass === "recovered_email"',s)
            self.assertNotIn('["Recovered emails", recovery.recoveredEmail',s)

    def test_manifest_aggregate_synthetic(self):
        rows=[
            {"id":"a","archiveId":"A","slotClass":"attachment_backed_slot","mailbox":"Inbox","messageSlot":"1"},
            {"id":"b","archiveId":"B","slotClass":"metadata_only_slot","mailbox":"Inbox","messageSlot":"1"},
            {"id":"c","archiveId":"C","slotClass":"recovered_email","mailbox":"Sent","messageSlot":"7"},
        ]
        r=audit.summarize(json.dumps({"items":rows}).encode())
        self.assertEqual(r["inventory_rows"],3)
        self.assertEqual(r["distinct_mailbox_slot_pairs"],2)
        self.assertEqual(r["repeated_mailbox_slot_pair_groups"],1)
        self.assertEqual(r["rows_in_repeated_pair_groups"],2)
        self.assertEqual(r["class_counts"],{"attachment_backed_slot":1,"metadata_only_slot":1,"recovered_email":1})
        self.assertEqual(r["pair_class_composition_counts"],{"attachment_backed_slot+metadata_only_slot":1,"recovered_email":1})
        self.assertEqual(r["recovered_rows_without_linked_pdf_ids"],1)
        self.assertFalse(r["recovered_parent_documents_verified"])
        self.assertTrue(r["count_reconciles_inventory_rows_only"])

    def test_manifest_rejects_unknown_and_repeated_ids(self):
        template={"id":"a","archiveId":"A","slotClass":"attachment_backed_slot","mailbox":"Inbox","messageSlot":"1"}
        for bad in ([template,dict(template)],[dict(template,slotClass="unknown")],[dict(template,archiveId="")]):
            with self.subTest(bad=bad),self.assertRaises(ValueError):
                audit.summarize(json.dumps({"items":bad}).encode())

    def test_historical_reconciliation_and_observed_hash_documented(self):
        s=(ROOT/"docs/phase0/BARAK_CORPUS_COUNT_GATE_026.md").read_text()
        for term in ("Status: OPEN","11,092","5,505","5,483","11,089","7,310",
                     "3,779","38ebc8dbe4906c1fe6132b75f2af2d5cf690e5c829d34615fddf514d74d3bb73",
                     "31,718","40,976","NOT VERIFIED","not a master email count"):
            self.assertIn(term.lower(),s.lower())

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

if __name__=="__main__":
    unittest.main(verbosity=2)
