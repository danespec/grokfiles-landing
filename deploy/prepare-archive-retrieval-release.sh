#!/bin/sh
# Private archive index gate; verified changes withdraw sources, never admit them.
set -eu
cd "$(dirname "$0")/.."
: "${GAH_ARCHIVE_EVIDENCE:?Private evidence directory required}"
: "${GAH_ARCHIVE_SOURCE_OBSERVATIONS:?Verified source observation batch required}"
PYTHON="${GAH_RESEARCH_PYTHON:-python3}"
"$PYTHON" scripts/apply_archive_source_changes_014.py --evidence "$GAH_ARCHIVE_EVIDENCE" --observations "$GAH_ARCHIVE_SOURCE_OBSERVATIONS" --apply
"$PYTHON" scripts/archive_admission_014.py --evidence "$GAH_ARCHIVE_EVIDENCE" --check
"$PYTHON" scripts/prepare_archive_locator_014.py --evidence "$GAH_ARCHIVE_EVIDENCE" --check
