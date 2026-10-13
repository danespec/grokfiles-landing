#!/usr/bin/env python3
"""Aggregate-only recovered-label -> PDF inventory check; no network or raw records emitted."""
import argparse
import hashlib
import json
from pathlib import Path
from audit_attachment_pdfs import permitted

def summarize(email_bytes, pdf_bytes):
    email=json.loads(email_bytes)["items"]
    pdf=json.loads(pdf_bytes)["items"]
    if not isinstance(email,list) or not isinstance(pdf,list):
        raise ValueError("invalid inventory")
    for rows,label in ((email,"email"),(pdf,"pdf")):
        ids=[r.get("id") if isinstance(r,dict) else None for r in rows]
        if not all(isinstance(x,str) and x for x in ids) or len(set(ids))!=len(ids):
            raise ValueError("duplicate or invalid "+label+" ID")
    byid={r["id"]:r for r in pdf}
    recovered=[r for r in email if r.get("slotClass")=="recovered_email"]
    references=[]
    for row in recovered:
        ids=row.get("linkedPdfIds") or []
        if not isinstance(ids,list) or not all(isinstance(x,str) and x for x in ids):
            raise ValueError("invalid linked PDF ID list")
        if len(ids)!=len(set(ids)):
            raise ValueError("duplicate linked PDF within row")
        references.extend(ids)
    matched=[byid[x] for x in references if x in byid]
    safe=sum(permitted(p.get("sourceFile")) for p in matched)
    return {
        "schema":"gah.barak.recovered_reference_counts.v1",
        "email_sha256":hashlib.sha256(email_bytes).hexdigest(),
        "pdf_sha256":hashlib.sha256(pdf_bytes).hexdigest(),
        "email_rows":len(email),"pdf_rows":len(pdf),
        "recovered_label_rows":len(recovered),
        "recovered_rows_with_references":sum(bool(r.get("linkedPdfIds")) for r in recovered),
        "recovered_rows_without_references":sum(not r.get("linkedPdfIds") for r in recovered),
        "references":len(references),"distinct_pdf_references":len(set(references)),
        "matched_references":len(matched),"unmatched_references":len(references)-len(matched),
        "allowlisted_pdf_source_paths":safe,
        "unapproved_or_missing_source_paths":len(matched)-safe,
        "disabled_pdf_source_flags":sum(p.get("sourceFileEnabled") is False for p in matched),
        "parent_bodies_authenticated":False,
        "limits":"Foreign-key, URL syntax and snapshot digest only; not recovered parent source authentication",
    }

def main(argv=None):
    ap=argparse.ArgumentParser()
    ap.add_argument("--email-manifest",required=True,type=Path)
    ap.add_argument("--pdf-manifest",required=True,type=Path)
    ap.add_argument("--expect-email-sha256")
    ap.add_argument("--expect-pdf-sha256")
    ap.add_argument("--require-clean",action="store_true")
    x=ap.parse_args(argv)
    eb=x.email_manifest.read_bytes()
    pb=x.pdf_manifest.read_bytes()
    if x.expect_email_sha256 and hashlib.sha256(eb).hexdigest()!=x.expect_email_sha256:
        raise SystemExit("email source digest mismatch")
    if x.expect_pdf_sha256 and hashlib.sha256(pb).hexdigest()!=x.expect_pdf_sha256:
        raise SystemExit("pdf source digest mismatch")
    r=summarize(eb,pb)
    if x.require_clean and (r["unmatched_references"] or r["unapproved_or_missing_source_paths"] or r["disabled_pdf_source_flags"]):
        raise SystemExit("reference-integrity gate failed")
    print(json.dumps(r,sort_keys=True))
    return 0

if __name__=="__main__":
    raise SystemExit(main())
