#!/usr/bin/env python3
"""Private-only metadata audit of Barak slot and PDF manifests.

Reads local input files; emits only aggregate numbers, hashes and bounded
acceptance-gate labels. Never prints document text, names, emails, slots,
subjects, IDs, addresses or filesystem paths. Does not publish source files.
"""
import argparse
from collections import Counter, defaultdict
import hashlib
import json
from pathlib import Path
import unicodedata

SLOT_CLASSES = ("attachment_backed_slot", "metadata_only_slot", "recovered_email")
PDF_CATEGORIES = ("document", "legal")


def load_items(path):
    path = Path(path)
    with path.open("rb") as handle:
        binary = handle.read()
    obj = json.loads(binary)
    if not isinstance(obj, dict) or not isinstance(obj.get("items"), list):
        raise ValueError("Input must be an object containing an items array")
    return obj["items"], hashlib.sha256(binary).hexdigest()


def normalized_slot(row):
    mailbox = unicodedata.normalize("NFKC", str(row.get("mailbox") or "")).strip().casefold()
    slot = unicodedata.normalize("NFKC", str(row.get("messageSlot") or "")).strip()
    return (mailbox, slot)


def safe_class(value):
    return value if value in SLOT_CLASSES else "unknown"


def audit(email_items, pdf_items, email_sha, pdf_sha):
    slot_groups = defaultdict(list)
    id_values = []
    archive_ids = []
    classes = Counter()
    class_fields = {key: Counter() for key in SLOT_CLASSES}
    missing_mailbox = missing_slot = 0
    for row in email_items:
        if not isinstance(row, dict):
            raise ValueError("Non-object email record")
        key = normalized_slot(row)
        missing_mailbox += not bool(key[0]); missing_slot += not bool(key[1])
        slot_groups[key].append(row)
        id_values.append(str(row.get("id") or ""))
        archive_ids.append(str(row.get("archiveId") or ""))
        cls = safe_class(row.get("slotClass"))
        classes[cls] += 1
        if cls in class_fields:
            for field in ("sender", "recipient", "date", "subject", "snippet", "sourceFile", "parentPdfMirror", "parentPdfRecoverySource"):
                class_fields[cls][field] += bool(row.get(field))

    repeated = [rows for rows in slot_groups.values() if len(rows) > 1]
    collision_types = Counter()
    for group in repeated:
        labels = tuple(sorted(set(safe_class(row.get("slotClass")) for row in group)))
        # Never emit user-supplied class strings.
        collision_types[" + ".join(labels)] += 1
    email_ids = set(id_values)
    linked = [str(r.get("linkedEmailId") or "") for r in pdf_items]
    pdf_ids = [str(r.get("id") or "") for r in pdf_items]
    pdf_classes = Counter(r.get("category") if r.get("category") in PDF_CATEGORIES else "unknown" for r in pdf_items)
    recovered = [r for r in email_items if r.get("slotClass") == "recovered_email"]

    reasons = []
    if repeated:
        reasons.append("mailbox/messageSlot pairs are not unique; archive-ID population units require source adjudication")
    if classes["unknown"]:
        reasons.append("unrecognized slot classes require review")
    if len(email_ids) != len(email_items) or not all(email_ids):
        reasons.append("source IDs are duplicated or blank")
    if any(ref not in email_ids for ref in linked):
        reasons.append("one or more PDF-to-email references are unresolved")
    # 19 parent-body source documents still require separate source SHA/provenance validation.
    reasons.append("parent source-PDF hash/identity and class exclusivity not independently established")
    return {
        "schema": "gah.barak.private-slot-audit.v1",
        "source_hash_sha256": {"email_items": email_sha, "pdf_items": pdf_sha},
        "email_rows": len(email_items),
        "class_rows": {name: classes[name] for name in SLOT_CLASSES},
        "unknown_class_rows": classes["unknown"],
        "class_arithmetic_equals_rows": sum(classes.values()) == len(email_items),
        "unique_email_ids": len(email_ids),
        "unique_archive_ids": len(set(archive_ids)),
        "canonical_pair_unique_count": len(slot_groups),
        "repeated_pair_groups": len(repeated),
        "rows_above_one_per_pair": sum(len(group)-1 for group in repeated),
        "repeated_pair_class_patterns": dict(sorted(collision_types.items())),
        "repeated_pair_all_distinct_archive_ids": sum(len(set(str(r.get("archiveId") or "") for r in group)) == len(group) for group in repeated),
        "missing_mailbox_rows": missing_mailbox,
        "missing_slot_rows": missing_slot,
        "recovered_rows_source_file_present": class_fields["recovered_email"]["sourceFile"],
        "recovered_rows_parent_mirror_present": class_fields["recovered_email"]["parentPdfMirror"],
        "recovered_rows_unique_parent_mirror_values": len(set(str(r.get("parentPdfMirror") or "") for r in recovered if r.get("parentPdfMirror"))),
        "pdf_rows": len(pdf_items),
        "pdf_category_rows": {name: pdf_classes[name] for name in PDF_CATEGORIES},
        "unique_pdf_ids": len(set(pdf_ids)),
        "pdf_rows_with_linked_email_id": sum(bool(x) for x in linked),
        "pdf_linked_email_id_unique_count": len(set(linked)),
        "pdf_email_link_unresolved_rows": sum(ref not in email_ids for ref in linked),
        "public_count_gate": "BLOCKED" if reasons else "NEEDS_MANUAL_SIGNOFF",
        "open_gate_reasons": reasons,
        "privacy_statement": "Only aggregate counts and source hashes; no raw corpus rows included"
    }


def main():
    parser = argparse.ArgumentParser(description="Compute private aggregate Barak manifest provenance diagnostics")
    parser.add_argument("--emails", required=True)
    parser.add_argument("--pdfs", required=True)
    args = parser.parse_args()
    emails,e_sha = load_items(args.emails)
    pdfs,p_sha = load_items(args.pdfs)
    print(json.dumps(audit(emails,pdfs,e_sha,p_sha),sort_keys=True,indent=2))


if __name__ == "__main__":
    main()
