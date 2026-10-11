#!/usr/bin/env python3
"""DOJ Data Set index sampling coverage, not a full DOJ release census."""
from pathlib import Path
import json
import unittest

ROOT=Path(__file__).resolve().parent

class DatasetSamplingTests(unittest.TestCase):
    def setUp(self):
        self.cat=json.loads((ROOT/"sources.json").read_text())
        self.items={x["id"]:x for x in self.cat["sources"]}
    def test_each_official_dataset_first_page_monitored(self):
        self.assertEqual(len(self.items),len(self.cat["sources"]))
        for n in range(1,13):
            item=self.items[f"doj-dataset-{n}-firstpage"]
            self.assertEqual(item["mode"],"links")
            self.assertEqual(item["pattern"],"/epstein/files/")
            self.assertEqual(item["url"],f"https://www.justice.gov/epstein/doj-disclosures/data-set-{n}-files")
    def test_not_mislabeled_as_full_document_audit(self):
        matches=[s for s in self.cat["coverage_gaps"] if s.startswith("DOJ Data Sets 1–12:")]
        self.assertEqual(len(matches),1)
        text=matches[0].lower()
        self.assertIn("first public listing page",text)
        self.assertIn("not",text)
        self.assertIn("file bytes",text)

if __name__=="__main__":
    unittest.main(verbosity=2)
