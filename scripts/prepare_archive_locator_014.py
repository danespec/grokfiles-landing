"""Produce the private, revocation-aware locator manifest from verified ledger state."""
import argparse,json
from pathlib import Path
from archive_admission_014 import ROOT,build,verify_prior,write_private,digest,locked_evidence
def active_manifest(entries,pilot,report,ledger):
    prior=verify_prior(pilot,report)
    current=build(entries,prior,ledger.get('revoked',[]))
    if current!=ledger:raise ValueError('Stale or altered admission ledger')
    allowed={r['id'] for r in current['records'] if r['status']=='prior_audit_locator_eligible'}
    # Deliberately export identifiers, page mappings, and hashes only.
    docs=[prior[i] for i in sorted(allowed)]
    result={'schema':'gah.archive.active-locators.v1','ledger_version':current['version'],'records':docs,'scope':'verified locator references only; no source text or personal metadata'}
    result['version']=digest(result)
    return result
def main():
    p=argparse.ArgumentParser();p.add_argument('--evidence',type=Path,required=True);p.add_argument('--check',action='store_true');a=p.parse_args()
    ev=a.evidence.resolve()
    if ev==ROOT or ROOT in ev.parents:raise ValueError('Evidence must be outside checkout')
    with locked_evidence(ev):
        entries=json.loads((ROOT/'content/identifier-dossiers.json').read_text())['entries']
        pilot=json.loads((ev/'archive-locator-manifest.private.json').read_text())
        report=json.loads((ev/'archive-locator-pilot-report.json').read_text())
        ledger=json.loads((ev/'archive-admission-ledger.private.json').read_text())
        out=ev/'archive-active-locators.private.json'
        result=active_manifest(entries,pilot,report,ledger)
        if a.check:
            if json.loads(out.read_text())!=result:raise ValueError('Active locator manifest stale')
        else:write_private(out,result)
        print(json.dumps({'active_locators':len(result['records']),'version':result['version'],'ledger_version':result['ledger_version'],'raw_text':False}))
if __name__=='__main__':main()
