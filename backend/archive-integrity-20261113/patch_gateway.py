#!/usr/bin/env python3
"""Apply the narrowly scoped, reviewed source registry without changing other routes."""
import sys
from pathlib import Path

def once(s,a,b):
    if s.count(a)!=1:raise ValueError('Expected one source anchor: '+a[:80])
    return s.replace(a,b,1)
def patch(s):
    if 'GAH_ARCHIVE_INTEGRITY_001' in s:raise ValueError('Already patched')
    s=once(s,"const PORT = Number(process.env.PORT || 80);","import { createArchiveIntegrity } from './archive-integrity-v1.mjs';\n// GAH_ARCHIVE_INTEGRITY_001: verified existing sources only.\nconst archiveIntegrityV1 = createArchiveIntegrity({isMissing:grokIsMissingSourceIdV160C});\nconst PORT = Number(process.env.PORT || 80);")
    s=once(s,"async function apiSource(res, id) {\n","async function apiSource(res, id) {\n  if (archiveIntegrityV1.source(res, id)) return;\n")
    s=once(s,"function grokIncomingPdfrawOverrideV176E(clean) {\n  const id = String(clean || '').toUpperCase();\n  if (!id) return null;","function grokIncomingPdfrawOverrideV176E(clean) {\n  const id = String(clean || '').toUpperCase();\n  if (!id) return null;\n  const verified = archiveIntegrityV1.pdfPath(id);\n  if (verified) return verified;")
    s=once(s,"    // GROK_PDFRAW_RANGE_SUPPORT_V165\n    if", "    if (archiveIntegrityV1.handleHttp(req, res, url)) return;\n\n    // GROK_PDFRAW_RANGE_SUPPORT_V165\n    if")
    s=once(s, "  let m;\n  while (related.length < limit && (m = re.exec(String(text || '')))) {", "  let m;\n  let candidatesChecked = 0;\n  while (related.length < limit && candidatesChecked < 64 && (m = re.exec(String(text || '')))) {")
    s=once(s, "    seen.add(relatedId);\n    related.push(relatedId);", "    seen.add(relatedId);\n    candidatesChecked++;\n    if (!archiveIntegrityV1.page(relatedId) && !archiveRecordIsResolvableFast(relatedId)) continue;\n    related.push(relatedId);")
    s=once(s, '<h2 id="connected-records-heading">Identifiers mentioned in the OCR</h2>', '<h2 id="connected-records-heading">Available records mentioned in the OCR</h2>')
    return s
if __name__=='__main__':
    Path(sys.argv[2]).write_text(patch(Path(sys.argv[1]).read_text()))
