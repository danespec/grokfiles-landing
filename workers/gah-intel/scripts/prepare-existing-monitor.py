#!/usr/bin/env python3
"""Produce a reviewed candidate; never replace or run the active monitor."""
import hashlib
from pathlib import Path
import sys

EXPECTED = '83f4bd52fea29695a5874c9841a12eeed51382635a07c85986c88998f5d38289'
source, target = map(Path, sys.argv[1:3])
if source.resolve() == target.resolve():
    raise SystemExit('Use a separate candidate path')
data = source.read_bytes()
if hashlib.sha256(data).hexdigest() != EXPECTED:
    raise SystemExit('Active monitor changed; reconcile it before preparing a patch')
text = data.decode()
needle = 'utc() { date -u'
if text.count(needle) != 1 or text.count('$(curl -k ') != 4:
    raise SystemExit('Unexpected monitor structure')
wrapper = 'gah_intel_curl() { python3 "$ROOT/bin/gah_intel_curl.py" "$@"; }\n\n'
text = text.replace(needle, wrapper + needle, 1).replace('$(curl -k ', '$(gah_intel_curl -k ')
with target.open('x') as output:
    output.write(text)
target.chmod(0o700)
print('Prepared candidate with four signed probe calls; active monitor unchanged.')
