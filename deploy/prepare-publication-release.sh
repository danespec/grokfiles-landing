#!/bin/sh
# Standard release preparation. No network, approval fabrication, or deployment.
set -eu
cd "$(dirname "$0")/.."
PYTHON="${GAH_RESEARCH_PYTHON:-python3}"
if [ "${1:-}" = "--check" ]; then
 "$PYTHON" scripts/build_research_corpus_010.py --check
 "$PYTHON" scripts/build_research_runtime_010.py --check
else
 # New, corrected or removed eligible publications change this source snapshot.
 if ! "$PYTHON" scripts/build_research_corpus_010.py --check; then
  OPENBLAS_NUM_THREADS=1 OMP_NUM_THREADS=1 "$PYTHON" scripts/build_research_corpus_010.py
 fi
 "$PYTHON" scripts/build_research_runtime_010.py
 "$PYTHON" scripts/build_research_corpus_010.py --check
 "$PYTHON" scripts/build_research_runtime_010.py --check
fi
node tests/test_public_research_011.mjs
