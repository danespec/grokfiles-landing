#!/usr/bin/env python3
"""GAH source-watch private outbound email channel.

Reads only the existing local source-event queue and critical court-health
status. Sends a small *redacted* alert via a domain-scoped Resend sending key.
No article bodies, witness names, source URLs, or local ledger contents leave
the Mac. Never confuses Resend acceptance with mailbox delivery.
"""
import argparse
import datetime as dt
import fcntl
import hashlib
import json
import os
from pathlib import Path
import re
import urllib.error
import urllib.request

API_URL="https://api.resend.com/emails"
EXPECTED_FROM="Grok Archive Hub Alerts <alerts@grokarchivehub.com>"
EXPECTED_TO="grokcloudflare@gmail.com"
CRITICAL=("phang-dcd-official-rss","phang-dc-circuit-appeals-rss")
PRIVATE_DIR=Path.home()/"_gah_builds/GAH-SIGNALS-004-private"
BATCH_LIMIT=20
SOURCE_RE=re.compile(r"^[a-z0-9][a-z0-9-]{0,80}$")

def secure_file(path, label):
    path=Path(path)
    if path.is_symlink() or not path.is_file():
        raise RuntimeError(label+"_missing_or_symlink")
    if (path.stat().st_mode & 0o077):
        raise RuntimeError(label+"_permissions_not_private")
    return path

def load_config(path):
    data=json.loads(secure_file(path,"email_config").read_text(encoding="utf-8"))
    if data.get("from")!=EXPECTED_FROM or data.get("to")!=EXPECTED_TO:
        raise RuntimeError("email_sender_or_recipient_not_approved")
    if data.get("enabled") is not True:
        raise RuntimeError("email_channel_not_enabled")
    credential=secure_file(data["key_file"],"email_key").read_text(encoding="utf-8").strip()
    if not credential.startswith("re_") or len(credential)<16 or len(credential)>256:
        raise RuntimeError("invalid_email_key_format")
    return data,credential

def safe_title(value):
    text=str(value or "")
    return text if SOURCE_RE.fullmatch(text) else "source-redacted"

def read_review_events(logfile, acked):
    if not logfile.exists():
        return []
    if logfile.stat().st_size>8_000_000:
        raise RuntimeError("event_log_too_large_for_safe_delivery")
    ordered={}
    from notify import event_id
    for line in logfile.read_text(encoding="utf-8").splitlines():
        if not line.strip(): continue
        item=json.loads(line)
        ident=item.get("event_id") or event_id(item)
        if not re.fullmatch(r"[A-Za-z0-9-]{8,100}",str(ident)):
            raise RuntimeError("invalid_private_event_id")
        if ident not in acked and ident not in ordered:
            ordered[ident]={
                "source":safe_title(item.get("source")),
                "kind":safe_title(item.get("kind")),
                "id":ident,
            }
    return list(ordered.values())[:BATCH_LIMIT]

def court_health(current_report, sent, now):
    unavailable=current_report.get("unavailable",{})
    if not isinstance(unavailable,dict):
        raise RuntimeError("invalid_monitor_health")
    broken=sorted(s for s in CRITICAL if s in unavailable)
    if not broken:
        return [],None
    marker="court-health:"+now.strftime("%Y-%m-%d")+":"+";".join(broken)
    if marker in sent:
        return [],None
    return broken,marker

def plan(private_dir, acknowledged, now=None):
    now=now or dt.datetime.now(dt.timezone.utc)
    events=read_review_events(private_dir/"events.jsonl",set(acknowledged))
    report_file=private_dir/"latest-report.json"
    health=json.loads(report_file.read_text()) if report_file.exists() else {"unavailable":{}}
    broken,health_marker=court_health(health,set(acknowledged),now)
    ids=[r["id"] for r in events]
    if health_marker:ids.append(health_marker)
    if not ids:return None
    identifiers=sorted(ids)
    token=hashlib.sha256("|".join(identifiers).encode()).hexdigest()
    lines=["GAH Source Watch -- PRIVATE OPERATIONAL ALERT",
           "This is an automated review notice; it is not a published finding.",
           "Evidence and all underlying documents remain in the private Mac ledger.",""]
    if events:
        lines.append("New source items to review: "+str(len(events)))
        for item in events:
            lines.append(" - "+item["source"]+" / "+item["kind"])
        lines.append("")
    if broken:
        lines.extend(["Official Phang court feed unavailable: "+str(len(broken)),
                      " - "+", ".join(broken),
                      "This is an access/health warning, NOT evidence of a filing or missed deadline.",""])
    lines.extend(["Review private diagnostics on the authorized Mac.",
                  "Resend acceptance does not prove delivery to the inbox."])
    subject="GAH court watch unavailable" if broken else "GAH Source Watch: "+str(len(events))+" review item(s)"
    return {"ids":identifiers,"idempotency":"gah-monitor-"+token[:48],
            "subject":subject,"body":"\n".join(lines),
            "event_count":len(events),"court_outage":len(broken)}

def send(payload, credential, transport=None):
    body={"from":EXPECTED_FROM,"to":[EXPECTED_TO],
          "subject":payload["subject"],"text":payload["body"]}
    req=urllib.request.Request(API_URL,
        data=json.dumps(body,ensure_ascii=False).encode("utf-8"),
        headers={"Authorization":"Bearer "+credential,
                 "Content-Type":"application/json",
                 "Idempotency-Key":payload["idempotency"]},
        method="POST")
    if transport:
        status,reply=transport(req)
    else:
        with urllib.request.urlopen(req,timeout=18) as res:
            status,reply=res.status,res.read(200_000)
    if status not in (200,201,202):
        raise RuntimeError("email_server_did_not_accept")
    try:
        answer=json.loads(reply)
    except (json.JSONDecodeError,UnicodeError) as e:
        raise RuntimeError("email_response_invalid_json") from e
    if not isinstance(answer,dict) or not isinstance(answer.get("id"),str) or not answer["id"]:
        raise RuntimeError("email_response_missing_id")
    return answer["id"]

def deliver(private_dir=PRIVATE_DIR, config_file=None, transport=None, now=None):
    from watch import write_secure
    private_dir=Path(private_dir)
    config_file=Path(config_file or private_dir/"resend-alerts-config.json")
    config,key=load_config(config_file)
    private_dir.mkdir(parents=True,exist_ok=True,mode=0o700)
    if (private_dir.stat().st_mode & 0o077):
        raise RuntimeError("private_directory_permissions")
    with (private_dir/".resend.lock").open("a+") as fd:
        os.chmod(private_dir/".resend.lock",0o600)
        fcntl.flock(fd,fcntl.LOCK_EX|fcntl.LOCK_NB)
        ack_path=private_dir/"resend-alerts-ack.json"
        ack=json.loads(secure_file(ack_path,"email_ack").read_text()) if ack_path.exists() else {"schema":"gah.resend.alert_ack.v1","ids":[]}
        if ack.get("schema")!="gah.resend.alert_ack.v1":
            raise RuntimeError("email_ack_schema_invalid")
        sent=set(ack.get("ids",[]))
        batch=plan(private_dir,sent,now)
        if not batch:
            return {"status":"idle","pending":0}
        try:
            accepted_id=send(batch,key,transport=transport)
        except (urllib.error.HTTPError,urllib.error.URLError,TimeoutError,OSError,RuntimeError) as e:
            # Do not expose remote API errors, body, or credential in logs.
            return {"status":"send_failed","pending":len(batch["ids"]),
                    "error_class":type(e).__name__}
        sent.update(batch["ids"])
        write_secure(ack_path,{"schema":"gah.resend.alert_ack.v1","ids":sorted(sent)})
        write_secure(private_dir/"resend-alerts-last.json",
            {"schema":"gah.resend.alert_receipt.v1","accepted_at":dt.datetime.now(dt.timezone.utc).isoformat(),
             "provider_message_id":accepted_id,"sent_event_count":batch["event_count"],
             "court_feed_outages":batch["court_outage"],
             "delivery_status":"accepted_by_resend_not_inbox_confirmed"})
        return {"status":"accepted_by_resend","pending":len(batch["ids"]),
                "events":batch["event_count"],"court_feed_outages":batch["court_outage"]}

def test_message(private_dir=PRIVATE_DIR,config_file=None,transport=None):
    _,key=load_config(config_file or Path(private_dir)/"resend-alerts-config.json")
    stamp=dt.datetime.now(dt.timezone.utc).strftime("%Y%m%dT%H%M")
    payload={"subject":"GAH Mac alert bridge -- verification",
             "body":"Verification from the authorized Mac source-watch Resend bridge. This is a delivery test, not a new source finding or deadline alert.",
             "idempotency":"gah-mac-alert-test-"+stamp}
    provider_id=send(payload,key,transport)
    return {"status":"accepted_by_resend","provider_message_id":provider_id,
            "meaning":"Resend accepted test; recipient inbox delivery not confirmed"}

if __name__=="__main__":
    parser=argparse.ArgumentParser()
    parser.add_argument("--private-dir",type=Path,default=PRIVATE_DIR)
    parser.add_argument("--config",type=Path)
    parser.add_argument("--test-email",action="store_true")
    args=parser.parse_args()
    try:
        result=(test_message(args.private_dir,args.config)
                if args.test_email else deliver(args.private_dir,args.config))
    except Exception as exc:
        # Strictly redact potentially sensitive exception messages.
        print(json.dumps({"status":"failed","error_class":type(exc).__name__}))
        raise SystemExit(1)
    print(json.dumps(result))
    raise SystemExit(0 if result["status"] in ("idle","accepted_by_resend") else 1)
