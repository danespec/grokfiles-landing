"""Invalidate private locator indexes after verified source-byte changes. Never admits."""
import argparse,json
from pathlib import Path
from archive_admission_014 import ROOT,build,verify_prior,write_private,canonical_id,canonical_hash,digest,locked_evidence
from prepare_archive_locator_014 import active_manifest
from verify_archive_sources_014 import PUBLIC_HOSTS

def source_revocations(prior,observations):
 if not isinstance(observations,list):raise ValueError('Invalid observations')
 parents={}
 for item in prior.values():parents.setdefault(item['parent_id'],set()).add(item['source_sha256'])
 revoked=set();seen={}
 for row in observations:
  if not isinstance(row,dict) or not canonical_id(row.get('id')):raise ValueError('Invalid observation ID')
  item=prior.get(row['id']);parent=item['parent_id'] if item else row['id']
  if parent not in parents:continue # Unadmitted historical candidates never gain eligibility.
  if row.get('http')!='200' or row.get('curl_exit')!=0 or row.get('pdf') is not True:continue
  if row.get('source_host') not in PUBLIC_HOSTS:raise ValueError('Unapproved source host')
  expected,actual=row.get('expected_sha256'),row.get('sha256')
  if not canonical_hash(expected) or not canonical_hash(actual) or parents[parent]!={expected}:raise ValueError('Source observation fingerprint is not bound to prior audit')
  if type(row.get('bytes')) is not int or row['bytes']<=0:raise ValueError('Missing byte observation')
  if type(row.get('matches')) is not bool or row['matches']!=(actual==expected):raise ValueError('Inconsistent hash result')
  if parent in seen and seen[parent]!=actual:raise ValueError('Conflicting source observations')
  seen[parent]=actual
  if actual!=expected:revoked.add(parent)
 return revoked

def reconcile(entries,pilot,report,ledger,observations):
 prior=verify_prior(pilot,report)
 if build(entries,prior,ledger.get('revoked',[]))!=ledger:raise ValueError('Stale or altered ledger')
 changed=source_revocations(prior,observations)
 result=build(entries,prior,set(ledger['revoked'])|changed)
 active=active_manifest(entries,pilot,report,result)
 return result,active,sorted(changed)

def main():
 parser=argparse.ArgumentParser();parser.add_argument('--evidence',type=Path,required=True);parser.add_argument('--observations',type=Path,required=True);parser.add_argument('--apply',action='store_true');a=parser.parse_args()
 ev=a.evidence.resolve();observed=a.observations.resolve()
 if any(x==ROOT or ROOT in x.parents for x in [ev,observed]):raise ValueError('Private evidence outside checkout required')
 with locked_evidence(ev):
  read=lambda name:json.loads((ev/name).read_text())
  observations=json.loads(observed.read_text())
  entries=json.loads((ROOT/'content/identifier-dossiers.json').read_text())['entries']
  ledger,active,changed=reconcile(entries,read('archive-locator-manifest.private.json'),read('archive-locator-pilot-report.json'),read('archive-admission-ledger.private.json'),observations['rows'])
  receipt={'schema':'gah.archive.source-invalidation.v1','observation_sha256':digest(observations),'changed_parents':changed,'ledger_version':ledger['version'],'active_version':active['version'],'active_records':len(active['records']),'new_admissions':0,'applied':a.apply}
  def write_changed(target,value):
   if not target.exists() or json.loads(target.read_text())!=value:write_private(target,value)
  if a.apply:
   # Ledger first: readers reject the old active manifest during an interrupted update.
   write_changed(ev/'archive-admission-ledger.private.json',ledger)
   write_changed(ev/'archive-active-locators.private.json',active)
  write_changed(ev/'archive-source-invalidation-receipt.private.json',receipt)
  print(json.dumps(receipt))
if __name__=='__main__':main()
