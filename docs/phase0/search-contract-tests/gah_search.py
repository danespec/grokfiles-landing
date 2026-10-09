"""Reference implementation of the GAH search contract (§2, §7).

Pure functions only: ID normalization and missing-record response construction.
The production Worker (TypeScript/JS) must implement identical semantics;
these tests pin the expected behavior.
"""
import re

EFTA_CANONICAL = re.compile(r"^EFTA\d{8}$")
BARAK_CANONICAL = re.compile(r"^BARAK-\d{3}-\d{3}$")


def normalize_efta(raw):
    """Normalize to canonical EFTA + 8 digits, or return None.

    Contract §2.1: strip whitespace/separators, uppercase, pad digit run to 8.
    """
    if not isinstance(raw, str):
        return None
    s = raw.strip().upper()
    s = re.sub(r"[\s\-_.]", "", s)
    m = re.fullmatch(r"EFTA(\d{1,8})", s)
    if not m:
        return None
    return "EFTA" + m.group(1).zfill(8)


def normalize_barak(raw):
    """Normalize to canonical BARAK-XXX-XXX, or return None.

    Contract §2.2: exactly two digit groups; separators required between groups
    (a bare 'BARAK-174' is rejected, not split). An unseparated 6-digit run is
    split 3+3 ('BARAK174001' -> 'BARAK-174-001').
    """
    if not isinstance(raw, str):
        return None
    s = raw.strip().upper()
    m = re.fullmatch(r"BARAK(\d{6})", s)
    if m:
        d = m.group(1)
        return "BARAK-%s-%s" % (d[:3], d[3:])
    s = re.sub(r"[\s_.]+", "-", s)
    s = re.sub(r"-{2,}", "-", s)
    m = re.fullmatch(r"BARAK-(\d{1,3})-(\d{1,3})", s)
    if not m:
        return None
    return "BARAK-%s-%s" % (m.group(1).zfill(3), m.group(2).zfill(3))


def classify_query(raw):
    """Return (kind, canonical) where kind is 'efta' | 'barak' | 'text'."""
    efta = normalize_efta(raw)
    if efta:
        return ("efta", efta)
    barak = normalize_barak(raw)
    if barak:
        return ("barak", barak)
    return ("text", raw.strip())


def missing_record_response(kind, identifier, searched_collection):
    """Build the §7 missing-record response row. Never returns silence."""
    if kind == "barak" and searched_collection == "efta":
        return {
            "result_type": "missing_record",
            "collection": "efta",
            "collection_hint": "barak",
            "message": "%s is not an EFTA record \u2014 it belongs to the Barak email archive." % identifier,
            "suggested_route": "/barak/search?receipt=",
        }
    if kind == "efta" and searched_collection == "barak":
        return {
            "result_type": "missing_record",
            "collection": "barak",
            "collection_hint": "efta",
            "message": "%s is not a Barak archive record \u2014 it is a DOJ release document." % identifier,
            "suggested_route": "/archive/" + identifier,
        }
    if kind == "efta":
        return {
            "result_type": "missing_record",
            "collection": searched_collection,
            "collection_hint": "efta",
            "message": "No EFTA record %s in the public index. The DOJ release may hold material not yet indexed." % identifier,
            "suggested_route": None,
        }
    if kind == "barak":
        return {
            "result_type": "missing_record",
            "collection": searched_collection,
            "collection_hint": "barak",
            "message": "No Barak archive record %s. Recovered parents and open slots are listed on /barak." % identifier,
            "suggested_route": "/barak",
        }
    return {
        "result_type": "missing_record",
        "collection": searched_collection,
        "collection_hint": None,
        "message": "No records matched. Identifiers look like EFTA00033413 or BARAK-174-001.",
        "suggested_route": None,
    }
