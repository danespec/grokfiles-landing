#!/bin/sh
# Standard release preparation. No network, approval fabrication, or deployment.
set -eu
cd "$(dirname "$0")/.."
PYTHON="${GAH_RESEARCH_PYTHON:-python3}"
: "${GAH_PRIVATE_PASSAGE_INDEX:?Set an external private passage index path}"
export NODE_OPTIONS="${NODE_OPTIONS:-} --experimental-loader=$PWD/scripts/private_passage_loader_012.mjs"
if [ "${1:-}" = "--check" ]; then
 "$PYTHON" scripts/build_research_corpus_010.py --check
 "$PYTHON" scripts/build_editorial_passages_012.py --output "$GAH_PRIVATE_PASSAGE_INDEX" --check
 "$PYTHON" scripts/build_research_runtime_010.py --check
else
 # New, corrected or removed eligible publications change this source snapshot.
 if ! "$PYTHON" scripts/build_research_corpus_010.py --check; then
  OPENBLAS_NUM_THREADS=1 OMP_NUM_THREADS=1 "$PYTHON" scripts/build_research_corpus_010.py
 fi
 "$PYTHON" scripts/build_editorial_passages_012.py --output "$GAH_PRIVATE_PASSAGE_INDEX"
 "$PYTHON" scripts/build_research_runtime_010.py
 "$PYTHON" scripts/build_research_corpus_010.py --check
 "$PYTHON" scripts/build_editorial_passages_012.py --output "$GAH_PRIVATE_PASSAGE_INDEX" --check
 "$PYTHON" scripts/build_research_runtime_010.py --check
fi
if [ -n "${GAH_PRIVATE_EDITORIAL_VECTORS:-}" ]; then
 "$PYTHON" scripts/build_editorial_vectors_013.py --output "$GAH_PRIVATE_EDITORIAL_VECTORS" --check
fi
node tests/test_public_research_011.mjs
