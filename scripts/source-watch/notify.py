#!/usr/bin/env python3
"""Private, credential-free macOS Notification Center delivery for GAH review events.

No victim names, URL parameters, document excerpts, or Mac evidence ledger
contents are displayed in lock-screen notifications. Never claims phone push.
"""
import hashlib
import json
import os
import subprocess
from pathlib import Path

def event_id(event):
    fields = {k: event.get(k) for k in ("source", "kind", "url", "label", "count", "observed_digest")}
    return hashlib.sha256(json.dumps(fields,sort_keys=True,ensure_ascii=False).encode()).hexdigest()

def deliver(private_dir, runner=subprocess.run):
    private_dir=Path(private_dir)
    log=private_dir/"events.jsonl"
    ack=private_dir/"notified.json"
    if not log.exists():
        return {"pending":0,"delivered":0,"failed":0}
    done = set(json.loads(ack.read_text()).get("ids", [])) if ack.exists() else set()
    pending=[]
    for raw in log.read_text(encoding="utf-8").splitlines():
        if not raw.strip():
            continue
        evt=json.loads(raw)
        key=evt.get("event_id") or event_id(evt)
        if key not in done:
            pending.append((key,evt))
    pending_by_id={k:e for k,e in pending}
    if not pending_by_id:
        return {"pending":0,"delivered":0,"failed":0}
    # A single batched desktop notification avoids an alert storm on large indexes.
    count=len(pending_by_id)
    court=any("court" in e.get("source","") or e.get("source","").startswith("phang") for e in pending_by_id.values())
    body=f"{count} evidence item(s) need review in the private GAH ledger."
    if court:
        body=f"{count} item(s), including court activity, need review in GAH."
    script='display notification '+json.dumps(body)+' with title "GAH Source Watch"'
    try:
        result=runner(["/usr/bin/osascript","-e",script],capture_output=True,timeout=12)
        okay=(result.returncode==0)
    except (OSError,subprocess.TimeoutExpired):
        okay=False
    if okay:
        # ack is atomic and persisted before returning success
        from watch import write_secure
        done.update(pending_by_id)
        write_secure(ack,{"schema":"gah.source_watch.notified.v1","ids":sorted(done)})
    return {"pending":count,"delivered":count if okay else 0,"failed":0 if okay else count,
            "channel":"mac_notification_center_only"}

CRITICAL_COURT_SOURCES=("phang-dcd-official-rss","phang-dc-circuit-appeals-rss")

def deliver_court_health(private_dir, report, runner=subprocess.run):
    """Alert only for unavailable *court* feeds, at most once per condition/day.

    Do not confuse access failure with no docket filing, legal noncompliance,
    an underlying PACER document, or an evidence event. No remote delivery.
    """
    from datetime import datetime, timezone
    private_dir=Path(private_dir)
    unavailable=report.get("unavailable",{})
    broken=sorted(name for name in CRITICAL_COURT_SOURCES if name in unavailable)
    if not broken:
        return {"critical_sources_unavailable":0,"delivered":0,"failed":0}
    date=datetime.now(timezone.utc).strftime("%Y-%m-%d")
    fingerprint=date+"|"+"|".join(broken)
    path=private_dir/"court-health-notified.json"
    history=set(json.loads(path.read_text()).get("fingerprints",[])) if path.exists() else set()
    if fingerprint in history:
        return {"critical_sources_unavailable":len(broken),"delivered":0,"failed":0,"already_notified_today":True}
    body="Official court activity feed unavailable; check GAH's private source-watch diagnostics."
    script='display notification '+json.dumps(body)+' with title "GAH Court Watch degraded"'
    try:
        result=runner(["/usr/bin/osascript","-e",script],capture_output=True,timeout=12)
        okay=(result.returncode==0)
    except (OSError,subprocess.TimeoutExpired):
        okay=False
    if okay:
        # Bound history to 365 entries and persist only on successful send.
        from watch import write_secure
        history.add(fingerprint)
        write_secure(path,{"schema":"gah.source_watch.court_health.v1",
                           "fingerprints":sorted(history)[-365:]})
    return {"critical_sources_unavailable":len(broken),"delivered":1 if okay else 0,
            "failed":0 if okay else 1,"channel":"mac_notification_center_only"}

if __name__=="__main__":
    import sys
    dest=Path(sys.argv[1]) if len(sys.argv)>1 else Path.home()/"_gah_builds/GAH-SIGNALS-004-private"
    print(json.dumps(deliver(dest)))
