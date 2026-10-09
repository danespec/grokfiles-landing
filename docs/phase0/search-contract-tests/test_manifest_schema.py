"""Validate a sample manifest instance against GAH_SEARCH_MANIFEST_SCHEMA.json."""
import sys, os, json
from jsonschema import validate, ValidationError
DEV = os.path.expanduser("~/workspace/gah-dev")

schema = json.load(open(os.path.join(DEV, "GAH_SEARCH_MANIFEST_SCHEMA.json")))

# Sample instance: values taken from the verified in-repo snapshot.
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
            "meaning": "Files checked in under evidence-data/** in the repo snapshot. This is the one public archive-file count.",
            "verified_in": "frontdoor/archive-status.json (generatedFrom: evidence-data/**)",
            "verified_at": "2026-10-09T12:00:00Z",
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
            "verified_in": "visual-evidence-index/manifest.json served_items",
            "verified_at": "2026-10-09T12:00:00Z",
            "reconciliation_note": "manifest_rows 76,948 includes 888 duplicate_rows_skipped; not the item count.",
        },
        "barak_portal_rows": {
            "value": 305,
            "meaning": "Review rows in the public Barak portal index snapshot.",
            "verified_in": "assets/barak-data.v298.js",
            "reconciliation": "pending",
        },
        "book_of_black_pages": {
            "value": 1639, "meaning": "Pages in the Book of Black source manifest.",
            "verified_in": "frontdoor/archive-status.json",
        },
        "birthday_book_pages": {
            "value": 238, "meaning": "Pages in the birthday-book manifest.",
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
    validate(instance=instance, schema=schema)
except ValidationError as e:
    print("SCHEMA VALIDATION FAILED:", e.message)
    print("at:", list(e.absolute_path))
    sys.exit(1)
print("test_manifest_schema: sample manifest instance validates against the schema")
