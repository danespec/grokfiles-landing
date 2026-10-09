"""Validate a sample manifest instance against GAH_SEARCH_MANIFEST_SCHEMA.json.

Portable: resolves the repo root from this file's location (fresh checkout
at any path). Stdlib only — no third-party dependencies.

The validator below implements the subset of JSON Schema draft-07 used by
GAH_SEARCH_MANIFEST_SCHEMA.json: type, properties, required,
additionalProperties, items, minItems, enum, const, pattern, minimum,
and format (date-time only). It is intentionally strict: unknown keywords
are ignored, but every asserted keyword is enforced.
"""
import sys
import os
import json
import re
from datetime import datetime

from gah_search import repo_root

REPO = repo_root()
SCHEMA_PATH = os.path.join(REPO, "docs", "phase0", "GAH_SEARCH_MANIFEST_SCHEMA.json")
schema = json.load(open(SCHEMA_PATH))

DATE_TIME_RE = re.compile(
    r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:?\d{2})?$"
)


class SchemaViolation(Exception):
    pass


def _fail(path, msg):
    raise SchemaViolation(f"{path or '$'}: {msg}")


def _check_type(value, expected, path):
    table = {
        "object": dict,
        "array": list,
        "string": str,
        "boolean": bool,
        "null": type(None),
    }
    if expected == "integer":
        if not (isinstance(value, int) and not isinstance(value, bool)):
            _fail(path, f"expected integer, got {type(value).__name__}")
    elif expected == "number":
        if not (isinstance(value, (int, float)) and not isinstance(value, bool)):
            _fail(path, f"expected number, got {type(value).__name__}")
    elif expected in table:
        if not isinstance(value, table[expected]):
            _fail(path, f"expected {expected}, got {type(value).__name__}")
    else:
        _fail(path, f"unsupported type keyword {expected!r}")


def _validate(instance, subschema, path=""):
    if not isinstance(subschema, dict):
        return
    if "type" in subschema:
        _check_type(instance, subschema["type"], path)
    if "const" in subschema and instance != subschema["const"]:
        _fail(path, f"value {instance!r} != const {subschema['const']!r}")
    if "enum" in subschema and instance not in subschema["enum"]:
        _fail(path, f"value {instance!r} not in enum {subschema['enum']!r}")
    if isinstance(instance, dict):
        for req in subschema.get("required", []):
            if req not in instance:
                _fail(path, f"missing required property {req!r}")
        props = subschema.get("properties", {})
        for key, value in instance.items():
            sub = props.get(key)
            if sub is None:
                if subschema.get("additionalProperties") is False:
                    _fail(path, f"additional property {key!r} not allowed")
                continue
            _validate(value, sub, f"{path}.{key}" if path else key)
    if isinstance(instance, list):
        if "minItems" in subschema and len(instance) < subschema["minItems"]:
            _fail(path, f"expected at least {subschema['minItems']} items")
        items = subschema.get("items")
        if isinstance(items, dict):
            for i, value in enumerate(instance):
                _validate(value, items, f"{path}[{i}]")
    if isinstance(instance, str):
        if "pattern" in subschema and not re.search(subschema["pattern"], instance):
            _fail(path, f"{instance!r} does not match pattern {subschema['pattern']!r}")
        if "format" in subschema:
            fmt = subschema["format"]
            if fmt == "date-time" and not DATE_TIME_RE.match(instance):
                _fail(path, f"{instance!r} is not a valid date-time")
            # unknown formats: pass (annotation-only), matching draft-07 default
    if isinstance(instance, (int, float)) and not isinstance(instance, bool):
        if "minimum" in subschema and instance < subschema["minimum"]:
            _fail(path, f"{instance!r} < minimum {subschema['minimum']}")


# Sample instance. Count values and their verification notes reflect the
# 2026-10-09 fresh verification against this snapshot:
#
# - curated_files = 3,628 comes from frontdoor/archive-status.json
#   (evidenceDataFiles), whose note claims it is "exact for the checked-in
#   source tree". FRESH VERIFICATION FAILED: this snapshot holds 546 files
#   under evidence-data/ (373 json + 172 txt + 1 tsv); 48 in-repo manifests
#   sum to 1,004 list entries. The 3,628 figure predates the snapshot's
#   ~1.4GB binary exclusion (REN_README.md) and its archive-status.json was
#   not regenerated after sanitization. It is therefore recorded here as
#   operator-attested, NOT snapshot-verified. The manifest MUST NOT present
#   it as verified-in-snapshot until ChatGPT re-derives it from the
#   production tree.
# - indexed_research_records = 1,380,648: operator's offline corpus row
#   count (verified against corpus.db by the operator; not in this repo).
# - visual_evidence_items = 76,060: snapshot-verified (served items;
#   76,948 manifest rows include 888 skipped duplicates).
instance = {
    "schema": "gah.search-manifest.v1",
    "manifest_version": "1.0.0",
    "generated_at": "2026-10-09T12:00:00Z",
    "source_snapshot": {
        "repo": "https://github.com/danespec/grokfiles-landing",
        "branch": "ren/production-snapshot-20261009",
        "commit": "7bfc664f5ca7d6b11ead53fdd606b54221ae7d15",
    },
    "counts": {
        "curated_files": {
            "value": 3628,
            "meaning": "Files under evidence-data/** in the production source tree, per frontdoor/archive-status.json. This is the one public archive-file count.",
            "verification": "operator_records",
            "verified_in": "frontdoor/archive-status.json (evidenceDataFiles)",
            "verified_at": "2026-10-09T12:00:00Z",
            "reconciliation_note": "NOT snapshot-verified: this snapshot holds 546 files under evidence-data/; the 3,628 figure predates the ~1.4GB binary exclusion and archive-status.json was not regenerated after sanitization. Re-derivation from the production tree required (ChatGPT).",
        },
        "indexed_research_records": {
            "value": 1380648,
            "meaning": "Rows in the operator's offline OCR/index corpus. Index rows, not individually downloadable files, not individually verified.",
            "verification": "operator_records",
            "verified_at": "2026-10-09T12:00:00Z",
        },
        "visual_evidence_items": {
            "value": 76060,
            "meaning": "Served photo/screenshot items in the visual-evidence index (duplicates excluded).",
            "verification": "snapshot_verified",
            "verified_in": "visual-evidence-index/manifest.json served_items",
            "verified_at": "2026-10-09T12:00:00Z",
            "reconciliation_note": "manifest_rows 76,948 includes 888 duplicate_rows_skipped; not the item count.",
        },
        "barak_portal_rows": {
            "value": 305,
            "meaning": "Review rows in the public Barak portal index snapshot.",
            "verification": "snapshot_verified",
            "verified_in": "assets/barak-data.v298.js",
            "reconciliation": "pending",
        },
        "book_of_black_pages": {
            "value": 1639, "meaning": "Pages in the Book of Black source manifest.",
            "verification": "snapshot_verified",
            "verified_in": "frontdoor/archive-status.json",
        },
        "birthday_book_pages": {
            "value": 238, "meaning": "Pages in the birthday-book manifest.",
            "verification": "snapshot_verified",
            "verified_in": "frontdoor/archive-status.json",
        },
        "searchable_documents": {"value": 670469, "status": "blocked",
                                 "blocker": "No in-repo provenance; confirm or remove."},
    },
    "collections": [
        {"id": "efta", "name": "DOJ release documents", "badge": "EFTA record",
         "description": "DOJ Epstein release documents by Bates number.",
         "searchable": True,
         "identifiers": {"canonical_pattern": "^EFTA\\d{8}$",
                         "normalization": ["trim", "uppercase", "strip separators", "pad to 8 digits"],
                         "example": "EFTA00033413"},
         "provenance_fields": ["identifier", "data_set", "date", "record_type", "subject",
                               "snippet", "confidence", "document_bundle_url", "archive_url",
                               "doj_library_url", "checksum_sha256", "visual_evidence",
                               "what_it_shows", "what_it_does_not_prove"],
         "record_count_ref": "indexed_research_records",
         "source_availability": "mixed",
         "endpoints": [{"method": "POST", "path": "/api/search", "purpose": "unified search (proxies wiki proof layer)"},
                       {"method": "GET", "path": "/api/document-bundle/{efta}", "purpose": "evidence bundle"}]},
        {"id": "barak", "name": "Barak email archive", "badge": "Barak archive",
         "description": "Ehud Barak 2007-2016 email-leak archive review rows.",
         "searchable": True,
         "identifiers": {"canonical_pattern": "^BARAK-\\d{3}-\\d{3}$",
                         "normalization": ["trim", "uppercase", "collapse separators", "pad groups to 3"],
                         "aliases": ["source-row ids like barak-174-ehud-barak-01"],
                         "example": "BARAK-174-001"},
         "provenance_fields": ["identifier", "source_row_id", "date", "parties", "subject",
                               "snippet", "attachment_status", "confidence", "viewer_url",
                               "acquisition_note", "recovery_method", "parent_pdf_hash",
                               "what_it_shows", "what_it_does_not_prove"],
         "record_count_ref": "barak_portal_rows",
         "source_availability": "in_repo"},
        {"id": "visual", "name": "Visual evidence", "badge": "Visual evidence",
         "description": "Photo/screenshot artifacts extracted from EFTA documents.",
         "searchable": True,
         "identifiers": {"canonical_pattern": "^EFTA\\d{8}$",
                         "normalization": ["same as efta"],
                         "example": "EFTA00033413"},
         "provenance_fields": ["thumbnail_url", "image_url", "efta", "name", "chunk", "pdf",
                               "class", "archive_url"],
         "record_count_ref": "visual_evidence_items",
         "source_availability": "in_repo"},
        {"id": "editorial", "name": "Investigations", "badge": "Investigation",
         "description": "GAH investigations, briefs, autopsies, timelines.",
         "searchable": True,
         "identifiers": {"canonical_pattern": "^/[a-z0-9][a-z0-9\\-/]*$",
                         "normalization": ["route path as-is"], "example": "/investigations/..."},
         "provenance_fields": ["title", "route", "page_type", "date", "snippet"],
         "result_types": ["editorial"],
         "source_availability": "in_repo"},
    ],
    "confidence_labels": [
        {"label": "HIGH_SOURCE_ROW_CLEAR", "level": "high", "quality_dimension": "transcription",
         "definition": "Source row fully legible; parsed without loss"},
        {"label": "LOW_CONFIDENCE_EXCLUSION", "level": "low", "quality_dimension": "transcription",
         "definition": "Excluded from findings use; retained for audit"},
        {"label": "OPEN_TRANSCRIPT_SLOT", "level": "open", "quality_dimension": "placeholder",
         "definition": "Placeholder for material not yet recovered; not a record"},
    ],
    "identifier_rules": {"exact_id_pinning": True, "default_sort": "date_desc",
                         "route_verification": True},
    "missing_record_responses": [
        {"case": "BARAK- id searched in EFTA index",
         "response_template": "{id} is not an EFTA record — it belongs to the Barak email archive.",
         "collection_hint": "barak"},
        {"case": "EFTA id searched in Barak index",
         "response_template": "{id} is not a Barak archive record — it is a DOJ release document.",
         "collection_hint": "efta"},
    ],
    "availability": {
        "verified_in_repo": ["visual-evidence-index/", "assets/barak-data*.js",
                             "frontdoor/archive-status.json", "_worker.js routing"],
        "requires_live_services": ["/api/search proof-layer corpus (wiki host)", "/research-index (wiki host)"],
        "excluded_from_snapshot": ["large binary evidence files (~1.4GB)", "production databases",
                                   "Cloudflare runtime state", "credentials"],
    },
}

try:
    _validate(instance, schema)
except SchemaViolation as e:
    print("SCHEMA VALIDATION FAILED:", e)
    sys.exit(1)
print("test_manifest_schema: sample manifest instance validates against the schema (stdlib validator)")
