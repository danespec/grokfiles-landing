#!/usr/bin/env python3
"""Explicit Phang docket verification checklist; NOT legal-compliance findings.

Court-ordered dates are review triggers. A missing public item, RSS entry,
private in-camera submission, or response does NOT establish non-compliance.
External case rulings may supersede these deadlines at any time.
"""
import datetime as dt

UTC=dt.timezone.utc
# UTC dates are review/checkpoint days, not purported filing timestamps.
CHECKPOINTS=(
    ("list-ecf42-20261001","2026-10-11",
     "Review October 1 certified-list deadline: ECF42 ordered filing with the court; ECF51 seeks postponement; verify current ruling or actual filing before stating status.",
     "https://www.govinfo.gov/content/pkg/USCOURTS-dcd-1_26-cv-01417/pdf/USCOURTS-dcd-1_26-cv-01417-1.pdf"),
    ("ecf51-government-reply-20261013","2026-10-13",
     "Review reported government October 13 reply deadline on ECF51 postponement motion; confirm current court scheduling order, not a completed filing.",
     "https://ecf.dcd.uscourts.gov/cgi-bin/rss_outside.pl"),
    ("record-preflight-20261014","2026-10-14",
     "Preflight court-record delivery due October 15; review any newer postponement order and hearing activity.",
     "https://ecf.dcd.uscourts.gov/cgi-bin/rss_outside.pl"),
    ("record-to-plaintiff-20261015","2026-10-15",
     "October 15 ECF42 deadline: produce administrative record TO PLAINTIFF, potentially private; source absence cannot prove delivery or nondelivery.",
     "https://www.govinfo.gov/content/pkg/USCOURTS-dcd-1_26-cv-01417/pdf/USCOURTS-dcd-1_26-cv-01417-1.pdf"),
    ("in-camera-redacted-notes-20261016","2026-10-16",
     "October 16 NOON Eastern ECF57 deadline: submit redacted handwritten FBI notes underlying three specified FD302s for in-camera review; may not be publicly docketed.",
     "https://storage.courtlistener.com/recap/gov.uscourts.dcd.291779/gov.uscourts.dcd.291779.57.0_1.pdf"),
)

def due_reviews(on_date=None):
    if on_date is None:
        on_date=dt.datetime.now(UTC).date()
    if isinstance(on_date,str):
        on_date=dt.date.fromisoformat(on_date)
    items=[]
    for identifier,day,notice,source_url in CHECKPOINTS:
        if on_date<dt.date.fromisoformat(day):
            continue
        items.append({
            "source":"phang-"+identifier,
            "kind":"manual_verification_milestone",
            "id":"review-"+identifier,
            "url":source_url,
            "label":notice,
            "review_required":True,
            "note":"SCHEDULED REVIEW ONLY; no new evidence, legal ruling, or compliance result is implied",
            "milestone_date":day,
            "event_id":"gah-phang-review-"+identifier
        })
    return items
