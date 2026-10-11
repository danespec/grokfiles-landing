#!/usr/bin/env python3
"""GAH-SIGNALS-009: narrow, official FEC Schedule E filing monitor.

DO NOT attribute issue-specific ad spending from Schedule E records. A filing
may describe a mailer, consulting expense or general independent expenditure;
no creative content is retrieved by this program. Runs locally, no public posts.
"""
import argparse
import datetime as dt
import fcntl
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
from urllib.parse import urlencode

ROOT=Path(__file__).resolve().parent
DEFAULT_PRIVATE=Path.home()/"_gah_builds"/"GAH-FEC-009-private"
CANDIDATES={
    "H6CO05142":"CO-05 Jeff Crank",
    "H6CO05324":"CO-05 Jessica Killin",
}
API="https://api.open.fec.gov/v1/schedules/schedule_e/"
FIELDS=("sub_id","candidate_id","committee_id","image_number","file_number",
        "expenditure_amount","expenditure_date","filing_date",
        "support_oppose_indicator","expenditure_description")
UTC=dt.timezone.utc

def now_iso():
    return dt.datetime.now(UTC).isoformat(timespec="seconds").replace("+00:00","Z")

def record_id(row):
    return str(row["sub_id"])

def pull(candidate_id, transport=None):
    if candidate_id not in CANDIDATES:
        raise ValueError("unknown_candidate_id")
    args={"api_key":"DEMO_KEY","candidate_id":candidate_id,
          "two_year_transaction_period":"2026","per_page":"100"}
    url=API+"?"+urlencode(args)
    if transport:
        raw=transport(url)
    else:
        proc=subprocess.run(
            ["curl","--silent","--show-error","--location","--proto","=https",
             "--proto-redir","=https","--max-redirs","2","--max-time","18",
             "--max-filesize","1000000","--compressed",
             "--user-agent","GAH-SourceWatch/0.2 (+https://grokarchivehub.com/methodology)",
             "--write-out","\\n__FEC_HTTP__%{http_code} %{url_effective}",url],
            capture_output=True,timeout=22)
        marker=b"\n__FEC_HTTP__"
        if marker not in proc.stdout:
            raise RuntimeError("fec_transport_failure")
        raw,rest=proc.stdout.rsplit(marker,1)
        pieces=rest.decode(errors="replace").strip().split(maxsplit=1)
        if len(pieces)<2 or not pieces[1].startswith("https://api.open.fec.gov/"):
            raise RuntimeError("fec_redirect_invalid")
        if proc.returncode or pieces[0]!="200":
            raise RuntimeError("fec_source_unavailable")
    if not raw or len(raw)>1000000:
        raise RuntimeError("fec_response_invalid_size")
    data=json.loads(raw)
    rows=data.get("results")
    pagination=data.get("pagination")
    if not isinstance(rows,list) or not isinstance(pagination,dict):
        raise RuntimeError("fec_schema_invalid")
    if len(rows)>100 or not isinstance(pagination.get("count"),int):
        raise RuntimeError("fec_pagination_invalid")
    records={}
    for item in rows:
        if not isinstance(item,dict) or item.get("candidate_id")!=candidate_id:
            raise RuntimeError("fec_candidate_identity_mismatch")
        if not item.get("sub_id"):
            raise RuntimeError("fec_transaction_id_missing")
        record={k:item.get(k) for k in FIELDS}
        key=record_id(record)
        if key in records and records[key]!=record:
            raise RuntimeError("fec_duplicate_conflict")
        records[key]=record
    return {
        "candidate_id":candidate_id,"records":records,
        "result_count":pagination["count"],
        "first_page_only":bool(pagination["count"]>len(rows)),
        "digest":hashlib.sha256(json.dumps(records,sort_keys=True).encode()).hexdigest(),
    }

def report_for(before,after):
    events=[]
    for cid in CANDIDATES:
        if cid not in after or cid not in before:
            continue
        prev=before[cid]["records"]
        current=after[cid]["records"]
        for sub_id,row in current.items():
            if sub_id not in prev:
                events.append({
                    "source":"fec-schedule-e-"+cid.lower(),
                    "kind":"official_fec_independent_expenditure_filing",
                    "event_id":"fec-"+sub_id,
                    "url":"https://www.fec.gov/data/independent-expenditures/",
                    "review_required":True,
                    "candidate_id":cid,
                    "committee_id":row.get("committee_id"),
                    "filing_date":row.get("filing_date"),
                    "amount_usd":row.get("expenditure_amount"),
                    "note":"FEC filing only; NOT proof of Epstein-themed ad or expenditure",
                })
    return events

def save(path,obj):
    path.parent.mkdir(parents=True,exist_ok=True,mode=0o700)
    os.chmod(path.parent,0o700)
    fd,tmp=tempfile.mkstemp(prefix=".fec-",dir=str(path.parent))
    try:
        with os.fdopen(fd,"w") as f:
            json.dump(obj,f,sort_keys=True,indent=2)
            f.write("\n")
            f.flush()
            os.fsync(f.fileno())
        os.chmod(tmp,0o600)
        os.replace(tmp,path)
    finally:
        if os.path.exists(tmp):
            os.unlink(tmp)

def execute(private_dir=DEFAULT_PRIVATE,transport=None,update=False):
    private_dir=Path(private_dir)
    private_dir.mkdir(parents=True,exist_ok=True,mode=0o700)
    os.chmod(private_dir,0o700)
    with (private_dir/".lock").open("a+") as lock:
        fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
        state=private_dir/"state.json"
        old=json.loads(state.read_text()) if state.exists() else {}
        if old and old.get("schema")!="gah.fec.watch.state.v1":
            raise RuntimeError("fec_existing_state_wrong_schema")
        before=old.get("candidates",{})
        snapshots=dict(before)
        errors={}
        for cid in CANDIDATES:
            try:
                fresh=pull(cid,transport)
                previous=snapshots.get(cid)
                if previous:
                    # Rolling 100-row results: retain earlier observed IDs.
                    union={**previous.get("records",{}),**fresh["records"]}
                    if len(union)>5000:
                        raise RuntimeError("fec_history_cap_reached")
                    fresh["records"]=union
                snapshots[cid]=fresh
            except Exception as exc:
                cause=str(exc)
                errors[cid]=cause if cause.startswith("fec_") else type(exc).__name__
        events=report_for(before,snapshots)
        result={"schema":"gah.fec.watch.report.v1",
                "generated_at":now_iso(),
                "health":"degraded" if errors else "partial_latest_page_only",
                "working_candidates":sorted(set(CANDIDATES)-set(errors)),
                "errors":errors,
                "new_review_events":len(events),
                "first_baselines":sorted(set(snapshots)-set(before)),
                "issue_attribution_proved":False,
                "disclaimer":"FEC Schedule E reflects expenditures, not ad creatives, text, audience, or Epstein-themed content; only latest index page checked"}
        if update:
            # Append before moving baseline; no duplicate event IDs on failed replay.
            log=private_dir/"events.jsonl"
            present=set()
            if log.exists():
                present={json.loads(line)["event_id"] for line in log.read_text().splitlines() if line.strip()}
            with log.open("a") as f:
                for event in events:
                    if event["event_id"] not in present:
                        f.write(json.dumps({**event,"observed_at":result["generated_at"]})+"\n")
                f.flush()
                os.fsync(f.fileno())
            os.chmod(log,0o600)
            save(state,{"schema":"gah.fec.watch.state.v1","candidates":snapshots})
            # Optional desktop alerts share the existing generic, redacted notifier.
            sibling=ROOT.parent
            sys.path.insert(0,str(sibling))
            from notify import deliver
            result["desktop_notification"]=deliver(private_dir)
            save(private_dir/"latest-report.json",result)
        return result

if __name__=="__main__":
    p=argparse.ArgumentParser()
    p.add_argument("--update",action="store_true")
    p.add_argument("--private-dir",type=Path,default=DEFAULT_PRIVATE)
    a=p.parse_args()
    print(json.dumps(execute(a.private_dir,update=a.update)))
