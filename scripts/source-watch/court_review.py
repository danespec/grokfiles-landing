#!/usr/bin/env python3
"""Phang docket review calendar and time-aware NON-VERDICT compliance ledger.

All states are review bookkeeping, not legal findings. A missing RSS entry,
RECAP mirror document, or inaccessible private in-camera record NEVER proves
failure to file, fulfill a deadline, or comply with an order.
"""
import datetime as dt
from zoneinfo import ZoneInfo

DENVER=ZoneInfo("America/Denver")
EASTERN=ZoneInfo("America/New_York")
UTC=dt.timezone.utc
NOTES_DUE_EASTERN=dt.datetime(2026,10,16,12,0,tzinfo=EASTERN)
NOTES_DUE_DENVER=NOTES_DUE_EASTERN.astimezone(DENVER)
OCT16_MORNING_PASS=dt.datetime(2026,10,16,8,30,tzinfo=DENVER)
OCT17_DOCKET_PASS=dt.datetime(2026,10,17,8,30,tzinfo=DENVER)
ECF57_PDF=("https://storage.courtlistener.com/recap/gov.uscourts.dcd.291779/"
           "gov.uscourts.dcd.291779.57.0_1.pdf")
ECF42_PDF=("https://www.govinfo.gov/content/pkg/USCOURTS-dcd-1_26-cv-01417/pdf/"
           "USCOURTS-dcd-1_26-cv-01417-1.pdf")
DISTRICT_RSS="https://ecf.dcd.uscourts.gov/cgi-bin/rss_outside.pl"

# Date and local clock are review checkpoints, NOT filing/receipt timestamps.
CHECKPOINTS=(
    ("list-ecf42-20261001","2026-10-11","00:00",
     "Review Oct 1 certified list ordered filed with court; verify ruling on ECF51 and actual list by complete docket. No automatic nonfiling claim.",ECF42_PDF),
    ("ecf51-government-reply-20261013","2026-10-13","00:00",
     "Review reported Oct 13 ECF51 government reply date against signed schedule; a motion is not a stay.",DISTRICT_RSS),
    ("record-preflight-20261014","2026-10-14","00:00",
     "Preflight Oct 15 record delivery, separately confirm ECF51 ruling and Oct 1 certified-list docket filing.",DISTRICT_RSS),
    ("record-to-plaintiff-20261015","2026-10-15","00:00",
     "Oct 15 administrative record due TO PLAINTIFF, potentially delivered privately. No inference from absent public docket.",ECF42_PDF),
    ("in-camera-redacted-notes-20261016","2026-10-16","08:30",
     "PENDING, DUE NOON EASTERN / 10:00 MDT Oct 16: ECF57 redacted FBI handwritten notes for private judge review. An 08:30 MDT pass CANNOT mark missing or satisfied.",ECF57_PDF),
    ("in-camera-docket-review-20261017","2026-10-17","08:30",
     "Oct 17 post-deadline docket/authorized-record verification of Oct 16 redacted-note submission. Also recheck signed ECF51 ruling and Oct 1 certified list. Absent public entry alone remains UNRESOLVED.",DISTRICT_RSS),
)

def local_as_of(as_of=None):
    if as_of is None:
        return dt.datetime.now(DENVER)
    if isinstance(as_of,dt.datetime):
        if as_of.tzinfo is None or as_of.utcoffset() is None:
            raise ValueError("a timezone-aware datetime is required")
        return as_of.astimezone(DENVER)
    if isinstance(as_of,str):
        as_of=dt.date.fromisoformat(as_of)
    if isinstance(as_of,dt.date):
        # Historical date-only calls mean midday MDT, not midnight UTC.
        return dt.datetime.combine(as_of,dt.time(12,0),DENVER)
    raise TypeError("expected date or timezone-aware datetime")

def current_status(as_of=None):
    """A rolling snapshot of verification work; no automated legal verdicts."""
    when=local_as_of(as_of)
    if when<NOTES_DUE_DENVER:
        notes="pending_due_noon_eastern"
    elif when<OCT17_DOCKET_PASS:
        notes="deadline_elapsed_verification_deferred_to_oct17"
    else:
        notes="post_deadline_check_required_not_verified"
    return {
        "schema":"gah.phang.compliance_review.v1",
        "as_of":when.isoformat(timespec="seconds"),
        "ecf51_postponement_order":"unverified_requires_signed_court_order",
        "oct01_certified_record_list":"unverified_requires_complete_docket",
        "oct15_record_to_plaintiff":"unverified_private_delivery_possible",
        "oct16_redacted_fbi_notes":notes,
        "oct16_deadline_eastern":NOTES_DUE_EASTERN.isoformat(timespec="minutes"),
        "oct16_deadline_denver":NOTES_DUE_DENVER.isoformat(timespec="minutes"),
        "oct16_morning_check":OCT16_MORNING_PASS.isoformat(timespec="minutes"),
        "oct17_docket_review":OCT17_DOCKET_PASS.isoformat(timespec="minutes"),
        "compliance_verdict":"unresolved_without_independent_primary_confirmation",
        "rule":"public-feed silence and elapsed deadlines are not proof of compliance or noncompliance",
    }

def due_reviews(on_date=None):
    when=local_as_of(on_date)
    milestones=[]
    for identifier,date,clock,notice,source_url in CHECKPOINTS:
        hour,minute=(int(piece) for piece in clock.split(":"))
        start=dt.datetime.combine(dt.date.fromisoformat(date),dt.time(hour,minute),DENVER)
        if when<start:
            continue
        label=notice
        if identifier=="in-camera-redacted-notes-20261016" and when>=NOTES_DUE_DENVER:
            label=("DEADLINE ELAPSED, COMPLIANCE UNVERIFIED: Oct 16 noon Eastern "
                   "(10:00 MDT) in-camera redacted FBI notes. Review on Oct 17; "
                   "never classify as missing based on public feed silence.")
        status=("pending_due_noon_eastern" if
                identifier=="in-camera-redacted-notes-20261016" and when<NOTES_DUE_DENVER
                else "review_required_not_a_compliance_verdict")
        milestones.append({
            "source":"phang-"+identifier,
            "kind":"manual_verification_milestone",
            "id":"review-"+identifier,
            "url":source_url,
            "label":label,
            "review_required":True,
            "obligation_state":status,
            "note":"SCHEDULED REVIEW ONLY; no new evidence, legal ruling, or compliance result implied",
            "milestone_date":date,
            "event_id":"gah-phang-review-"+identifier,
        })
    return milestones
