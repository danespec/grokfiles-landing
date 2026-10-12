"""Synthetic-only tests: private manifest auditor emits no source content."""
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile

source=Path(__file__).resolve().parents[1]/'scripts/barak/audit_slot_manifest.py'
canary='PRIVATE_VICTIM_EMAIL@EXAMPLE.INVALID'
with tempfile.TemporaryDirectory(prefix='gah-bslot-test-') as folder:
    base=Path(folder)
    em={"version":1,"items":[
      {"id":"first","archiveId":"first-ar","mailbox":"Inbox","messageSlot":11,"slotClass":"attachment_backed_slot","sender":canary,"sourceFile":"/private/hidden.pdf"},
      {"id":"second","archiveId":"second-ar","mailbox":"inbox","messageSlot":"11","slotClass":"metadata_only_slot","subject":canary},
      {"id":"third","archiveId":"third-ar","mailbox":"Outbox","messageSlot":32,"slotClass":"recovered_email","parentPdfMirror":"source-mirror-placeholder","sourceFile":"/private/doc.pdf"}
    ]}
    pdf={"version":1,"items":[
      {"id":"p1","linkedEmailId":"first","category":"document","originalText":canary},
      {"id":"p2","linkedEmailId":"nonexistent","category":"legal","originalText":canary}
    ]}
    (base/'emails.json').write_text(json.dumps(em));(base/'pdfs.json').write_text(json.dumps(pdf))
    cmd=[sys.executable,str(source),'--emails',str(base/'emails.json'),'--pdfs',str(base/'pdfs.json')]
    a=subprocess.run(cmd,capture_output=True,text=True,check=True)
    b=subprocess.run(cmd,capture_output=True,text=True,check=True)
    j=json.loads(a.stdout)
    assert a.stdout==b.stdout, 'deterministic output'
    assert canary not in a.stdout and '/private/' not in a.stdout
    assert j['email_rows']==3 and j['canonical_pair_unique_count']==2
    assert j['repeated_pair_groups']==1 and j['rows_above_one_per_pair']==1
    assert j['repeated_pair_class_patterns']=={'attachment_backed_slot + metadata_only_slot':1}
    assert j['class_rows']=={'attachment_backed_slot':1,'metadata_only_slot':1,'recovered_email':1}
    assert j['pdf_rows']==2 and j['pdf_email_link_unresolved_rows']==1
    assert j['recovered_rows_source_file_present']==1
    assert j['public_count_gate']=='BLOCKED'
print('PASS 10 private Barak manifest audit checks; no raw source content exposed')
