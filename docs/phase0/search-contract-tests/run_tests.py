#!/usr/bin/env python3
"""Run the full GAH search-contract test suite. Usage: python3 run_tests.py"""
import subprocess, sys, os
D = os.path.dirname(os.path.abspath(__file__))
tests = ["test_id_normalization.py", "test_visual_manifest.py",
         "test_barak_ids.py", "test_manifest_schema.py"]
ok = True
for t in tests:
    r = subprocess.run([sys.executable, os.path.join(D, t)], capture_output=True, text=True)
    print("=" * 60)
    print("$", t, "->", "PASS" if r.returncode == 0 else "FAIL")
    out = (r.stdout + r.stderr).strip()
    if out:
        print(out)
    if r.returncode != 0:
        ok = False
print("=" * 60)
print("SUITE", "PASSED" if ok else "FAILED")
sys.exit(0 if ok else 1)
