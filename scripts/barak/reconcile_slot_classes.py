#!/usr/bin/env python3
"""Aggregate-only classification census for a versioned Barak email-row manifest.

Never infer unique messages, recovered parent body provenance or conduct from
slot row IDs, class labels, mailbox/messageSlot pairs, or legacy PDF flags.
"""
import argparse
from collections import Counter
import hashlib
import json
from pathlib import Path

CLASSES = ("attachment_backed_slot", "metadata_only_slot", "recovered_email")

def summarize(blob: bytes) -> dict:
    manifest = json.loads(blob)
    records = manifest["items"]
    if not isinstance(records, list):
        raise ValueError("Missing items array")
    row_ids = []
    archive_ids = []
    keys = []
    types = Counter()
    invalid = 0
    source_links = 0
    for row in records:
        if not isinstance(row, dict):
            raise ValueError("Row is not an object")
        ident = row.get("id")
        aid = row.get("archiveId")
        if not isinstance(ident, str) or not ident:
            raise ValueError("Empty row ID")
        if not isinstance(aid, str) or not aid:
            raise ValueError("Empty archive ID")
        row_ids.append(ident)
        archive_ids.append(aid)
        classification = row.get("slotClass")
        if classification not in CLASSES:
            raise ValueError("Unknown slot class")
        types[classification] += 1
        mailbox = row.get("mailbox")
        slot = row.get("messageSlot")
        if not isinstance(mailbox, str) or not mailbox or slot is None or str(slot) == "":
            invalid += 1
        else:
            keys.append((mailbox, str(slot)))
        if row.get("sourceFile") and row.get("sourceFileEnabled") is not False:
            source_links += 1
    if len(set(row_ids)) != len(row_ids):
        raise ValueError("Duplicate email row IDs")
    if len(set(archive_ids)) != len(archive_ids):
        raise ValueError("Duplicate archive IDs")
    multiplicity = Counter(keys)
    groups = {}
    for row in records:
        mailbox, slot = row.get("mailbox"), row.get("messageSlot")
        if isinstance(mailbox, str) and mailbox and slot is not None and str(slot) != "":
            groups.setdefault((mailbox, str(slot)), []).append(row)
    profiles = Counter("+".join(sorted(r["slotClass"] for r in group)) for group in groups.values())
    recovered = [r for r in records if r["slotClass"] == "recovered_email"]
    return {
        "schema": "gah.barak.email_class_counts.v1",
        "manifest_sha256": hashlib.sha256(blob).hexdigest(),
        "inventory_rows": len(records),
        "class_counts": {k: types[k] for k in CLASSES},
        "class_rows_sum": sum(types.values()),
        "distinct_row_ids": len(set(row_ids)),
        "distinct_archive_ids": len(set(archive_ids)),
        "distinct_mailbox_slot_pairs": len(multiplicity),
        "repeated_mailbox_slot_pair_groups": sum(n > 1 for n in multiplicity.values()),
        "rows_in_repeated_pair_groups": sum(n for n in multiplicity.values() if n > 1),
        "pair_class_composition_counts": dict(sorted(profiles.items())),
        "recovered_rows_with_linked_pdf_ids": sum(bool(r.get("linkedPdfIds")) for r in recovered),
        "recovered_rows_without_linked_pdf_ids": sum(not r.get("linkedPdfIds") for r in recovered),
        "rows_missing_complete_mailbox_slot": invalid,
        "enabled_email_source_links": source_links,
        "recovered_parent_documents_verified": False,
        "count_reconciles_inventory_rows_only": True,
    }

def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", type=Path, required=True)
    parser.add_argument("--expect-sha256", help="Exact expected source version digest")
    args = parser.parse_args()
    blob = args.manifest.read_bytes()
    report = summarize(blob)
    if args.expect_sha256 and report["manifest_sha256"] != args.expect_sha256:
        raise SystemExit("Source digest mismatch; no conclusions released")
    print(json.dumps(report, sort_keys=True))

if __name__ == "__main__":
    main()
