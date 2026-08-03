#!/usr/bin/env bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
ALLOWLIST="$ROOT/deploy/cloudflare-pages-files.txt"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUTPUT="${1:-/Users/thomas/_gah_builds/GAH-PAGES-PACKAGE-$STAMP}"
MANIFEST="${OUTPUT}.manifest.tsv"

fail() {
  echo "PACKAGE_BUILD=FAIL"
  echo "ERROR=$1"
  exit 1
}

[ -f "$ALLOWLIST" ] ||
  fail "allowlist missing"

[ -z "$(git -C "$ROOT" status --porcelain=v1 --untracked-files=all)" ] ||
  fail "canonical repository is dirty"

[ ! -e "$OUTPUT" ] ||
  fail "output already exists: $OUTPUT"

DUPLICATES="$(sort "$ALLOWLIST" | uniq -d)"

[ -z "$DUPLICATES" ] ||
  fail "duplicate allowlist paths detected"

mkdir -p "$OUTPUT"

printf 'path\tsize\tsha256\n' > "$MANIFEST"

EXPECTED="$(
  awk 'NF {n++} END {print n+0}' "$ALLOWLIST"
)"

COPIED=0

while IFS= read -r RELATIVE || [ -n "$RELATIVE" ]; do
  [ -n "$RELATIVE" ] || continue

  case "$RELATIVE" in
    /*|..|../*|*/../*|*/..)
      fail "unsafe path: $RELATIVE"
      ;;
  esac

  case "$RELATIVE" in
    .git/*|.wrangler/*|node_modules/*|artifacts/*|\
.env|.env.*|*_worker.js.before-*|*_worker.js.pre-*|\
*.bak|*.backup|*.orig|*.tmp|*.swp|*~)
      fail "forbidden path: $RELATIVE"
      ;;
  esac

  SOURCE="$ROOT/$RELATIVE"
  TARGET="$OUTPUT/$RELATIVE"

  [ -f "$SOURCE" ] ||
    fail "missing source: $RELATIVE"

  SIZE="$(wc -c < "$SOURCE" | tr -d ' ')"

  [ "$SIZE" -le 26214400 ] ||
    fail "oversized file: $RELATIVE ($SIZE bytes)"

  mkdir -p "$(dirname "$TARGET")"
  cp -p "$SOURCE" "$TARGET"

  cmp -s "$SOURCE" "$TARGET" ||
    fail "copy mismatch: $RELATIVE"

  SHA="$(
    shasum -a 256 "$TARGET" |
    awk '{print $1}'
  )"

  printf '%s\t%s\t%s\n' \
    "$RELATIVE" \
    "$SIZE" \
    "$SHA" \
    >> "$MANIFEST"

  COPIED=$((COPIED + 1))
done < "$ALLOWLIST"

ACTUAL="$(
  find "$OUTPUT" -type f |
  awk 'NF {n++} END {print n+0}'
)"

[ "$COPIED" -eq "$EXPECTED" ] ||
  fail "copy count mismatch: expected $EXPECTED, copied $COPIED"

[ "$ACTUAL" -eq "$EXPECTED" ] ||
  fail "package count mismatch: expected $EXPECTED, found $ACTUAL"

node --check "$OUTPUT/_worker.js"

echo "PACKAGE_BUILD=PASS"
echo "PACKAGE=$OUTPUT"
echo "PACKAGE_FILES=$ACTUAL"
echo "PACKAGE_MANIFEST=$MANIFEST"
echo "WORKER_SYNTAX=PASS"
echo "PUSH_PERFORMED=NO"
echo "DEPLOYMENT_PERFORMED=NO"
