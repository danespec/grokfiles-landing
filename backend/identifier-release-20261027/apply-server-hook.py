#!/usr/bin/env python3
"""Prepare the wiki hook from the audited live server; never deploy or change credentials."""
from pathlib import Path
import hashlib,sys
source=Path(sys.argv[1]);target=Path(sys.argv[2]);text=source.read_text()
expected='9b45d64fa970a1ced1d8675e1b4149456bee24793ae7c3286649585bfd666672'
assert hashlib.sha256(source.read_bytes()).hexdigest()==expected,'Wiki server changed; reconcile the newer source before continuing.'
needle='  if (enforceWikiRateLimit(req, res)) return;'
assert text.count(needle)==1
text="import { identifierHostPolicy } from './identifier-host-policy.mjs';\n"+text.replace(needle,needle+'\n  if (identifierHostPolicy(req, res)) return;',1)
target.write_text(text)
print('Prepared server hook after existing service-authentication and rate-limit guards.')
