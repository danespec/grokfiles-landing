#!/usr/bin/env python3
"""GAH-BARAK-LEDGER-036: read-only, aggregate-only inventory reconciliation.

No message bodies, subject lines, correspondents, mailbox labels, or paths
are included in the JSON report. Hashes and counts are not authentication.
"""
import argparse
import collections
import hashlib
import json
import os
from pathlib import Path


def read_source(path):
    raw = Path(path).read_bytes()
    return json.loads(raw), hashlib.sha256(raw).hexdigest(), len(raw)


def reconcile(email, pdf, manifest, old=None):
    E = email["items"]
    P = pdf["items"]
    M = manifest["sources"]
    email_ids = [r["id"] for r in E]
    pdf_ids = [r["id"] for r in P]
    by_email = {r["id"]: r for r in E}
    by_pdf = {r["id"]: r for r in P}
    group = collections.defaultdict(list)
    for r in E:
        group[(str(r.get("mailbox") or ""), str(r.get("messageSlot") or ""))].append(r)
    counts = collections.Counter(r["slotClass"] for r in E)
    group_counts = collections.Counter(
        "+".join(sorted(r["slotClass"] for r in records))
        for records in group.values()
    )
    links = [pid for r in E for pid in (r.get("linkedPdfIds") or [])]
    refs = collections.Counter(links)
    linked_by_email = {
        r["id"]: set(r.get("linkedPdfIds") or []) for r in E
    }
    inverse = collections.defaultdict(set)
    for r in P:
        inverse[r.get("linkedEmailId")].add(r["id"])
    anomalies = {
        "duplicate_email_ids": len(E) - len(set(email_ids)),
        "duplicate_pdf_ids": len(P) - len(set(pdf_ids)),
        "duplicate_email_archive_ids": len(E)-len({r["archiveId"] for r in E}),
        "duplicate_pdf_source_sids": len(P)-len({r["sourceSid"] for r in P}),
        "empty_mailbox_slot": sum(not r.get("mailbox") or not r.get("messageSlot") for r in E),
        "duplicate_pdf_links": len(links)-len(refs),
        "email_pdf_references_not_in_pdf_ledger": len(set(refs)-set(pdf_ids)),
        "pdfs_missing_email_reference": len(set(pdf_ids)-set(refs)),
        "pdf_source_sids_not_in_manifest": len({r["sourceSid"] for r in P}-set(M)),
        "manifest_ids_without_pdf": len(set(M)-{r["sourceSid"] for r in P}),
        "orphan_pdf_linked_email_id": sum(r.get("linkedEmailId") not in by_email for r in P),
        "pdf_reverse_reference_disagreement": sum(
            p["id"] not in linked_by_email.get(p.get("linkedEmailId"),set())
            for p in P
        ),
        "email_inverse_set_disagreement": sum(
            linked_by_email[e["id"]] != inverse.get(e["id"],set()) for e in E
        ),
        "pdf_mailbox_mismatch": sum(
            r.get("parentMailbox") != by_email.get(r.get("linkedEmailId"),{}).get("mailbox") for r in P
        ),
        "pdf_slot_mismatch": sum(
            r.get("parentSlot") != by_email.get(r.get("linkedEmailId"),{}).get("messageSlot") for r in P
        ),
    }
    recovered = [r for r in E if r.get("slotClass") == "recovered_email"]
    summary = {
        "scope": "versioned email-slot and PDF reference inventory, not authenticated correspondence",
        "email_inventory_rows": len(E),
        "email_unique_ids": len(set(email_ids)),
        "distinct_mailbox_slot_keys": len(group),
        "mailbox_slot_group_size_distribution": dict(sorted(collections.Counter(len(v) for v in group.values()).items())),
        "class_counts": dict(sorted(counts.items())),
        "mailbox_slot_class_combinations": dict(sorted(group_counts.items())),
        "pdf_rows": len(P),
        "pdf_unique_ids": len(set(pdf_ids)),
        "pdf_link_count": len(links),
        "pdf_unique_reference_ids": len(refs),
        "pdf_linked_email_count": len({r["linkedEmailId"] for r in P}),
        "manifest_source_count": len(M),
        "source_link_verification_status_counts": dict(sorted(collections.Counter(
            str(r.get("sourceVerificationStatus","MISSING")) for r in E).items())),
        "recovered_labeled": {
            "rows": len(recovered),
            "with_pdf_reference": sum(bool(r.get("linkedPdfIds")) for r in recovered),
            "without_pdf_reference": sum(not r.get("linkedPdfIds") for r in recovered),
            "pdf_reference_count": sum(len(r.get("linkedPdfIds") or []) for r in recovered),
            "source_links_unverified": sum(r.get("sourceVerificationStatus") != "verified" for r in recovered)
        },
        "anomalies": anomalies,
        "integrity_gates_pass": not any(anomalies.values()) and
            sum(counts.values()) == len(E) and len(refs) == len(P),
        "limitations": [
            "One mailbox/messageSlot group may have multiple separately classified inventory records.",
            "Record links to PDF metadata do not authenticate original email body, sender or transmission.",
            "A source label and shared-source file reference are not evidence of original-file availability.",
            "No raw correspondence or individual record identifiers are included in this output."
        ],
    }
    if old is not None:
        O = {r["id"]:r for r in old["items"]}
        N = {r["id"]:r for r in E}
        fields = ("id","archiveId","mailbox","messageSlot","slotClass","resultType","linkedPdfIds",
            "parentPdfLabel","parentPdfMirror","parentPdfRecoverySource","sourceVerificationStatus",
            "sourceFileEnabled","sender","recipient","subject","snippet")
        summary["older_inventory_comparison"]={
            "older_row_count":len(O),
            "shared_record_ids":len(set(O)&set(N)),
            "added_ids":len(set(N)-set(O)),
            "removed_ids":len(set(O)-set(N)),
            "changed_field_record_counts":{
                f:sum(N[k].get(f)!=O.get(k,{}).get(f) for k in N)
                for f in fields
            }
        }
    return summary


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("--emails",required=True)
    parser.add_argument("--pdfs",required=True)
    parser.add_argument("--manifest",required=True)
    parser.add_argument("--old-emails")
    parser.add_argument("--output")
    parser.add_argument("--expected-emails",type=int)
    parser.add_argument("--expected-pdfs",type=int)
    args=parser.parse_args()
    email,e_hash,e_size=read_source(args.emails)
    pdf,p_hash,p_size=read_source(args.pdfs)
    manifest,m_hash,m_size=read_source(args.manifest)
    old,o_hash,o_size=read_source(args.old_emails) if args.old_emails else (None,None,0)
    result=reconcile(email,pdf,manifest,old)
    result["source_file_hashes_sha256"]={
        "emails":e_hash,"pdfs":p_hash,"manifest":m_hash,
        **({"older_emails":o_hash} if o_hash else {})
    }
    result["source_bytes"]={
        "emails":e_size,"pdfs":p_size,"manifest":m_size,
        **({"older_emails":o_size} if o_hash else {})
    }
    if args.expected_emails is not None and result["email_inventory_rows"] != args.expected_emails:
        raise SystemExit("FAIL: unexpected email inventory row count")
    if args.expected_pdfs is not None and result["pdf_rows"] != args.expected_pdfs:
        raise SystemExit("FAIL: unexpected PDF inventory row count")
    out=json.dumps(result,sort_keys=True,indent=2)+"\n"
    if args.output:
        path=Path(args.output)
        if not path.parent.exists():
            path.parent.mkdir(parents=True,mode=0o700)
        with os.fdopen(os.open(path,os.O_WRONLY|os.O_CREAT|os.O_TRUNC,0o600),"w") as f:
            f.write(out)
        os.chmod(path,0o600)
    else:
        print(out)
    if not result["integrity_gates_pass"]:
        raise SystemExit("FAIL: inventory relationship anomaly detected")


if __name__=="__main__":
    main()
