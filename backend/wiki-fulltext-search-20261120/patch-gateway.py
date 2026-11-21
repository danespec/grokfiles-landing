#!/usr/bin/env python3
"""Apply the standalone, testable safe OCR search route to the current wiki gateway."""
from pathlib import Path
import argparse
p=argparse.ArgumentParser()
p.add_argument('--server',type=Path,required=True)
p.add_argument('--output',type=Path,required=True)
a=p.parse_args()
s=a.server.read_text()
needle="import { identifierHostPolicy } from './identifier-host-policy.mjs';"
assert s.count(needle)==1
s=s.replace(needle,
    "import { identifierHostPolicy, eftaCatalogFlags } from './identifier-host-policy.mjs';\n"
    "import { catalogSafeSearchHandler } from './catalog-safe-search.mjs';",1)
needle="  if (identifierHostPolicy(req, res)) return;\n"
assert s.count(needle)==1
s=s.replace(needle,needle+
    "  if (await catalogSafeSearchHandler(req, res, { postSearch, catalogFlags:eftaCatalogFlags })) return;\n",1)
a.output.parent.mkdir(parents=True,exist_ok=True)
a.output.write_text(s)
print('PATCHED_EXISTING_WIKI_SERVER_SAFE_KEYWORD_SEARCH',len(s))
