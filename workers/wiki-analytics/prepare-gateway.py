#!/usr/bin/env python3
"""Prepare a separate gateway candidate. Never edits or restarts a live service."""
import argparse,hashlib,json,pathlib,shutil
p=argparse.ArgumentParser();p.add_argument('--source',required=True);p.add_argument('--output',required=True);a=p.parse_args()
source=pathlib.Path(a.source);out=pathlib.Path(a.output);out.mkdir(mode=0o700,parents=True,exist_ok=False)
server=(source/'server.js').read_text();policy=(source/'identifier-host-policy.mjs').read_text()
def change(text,needle,replacement):
 if text.count(needle)!=1:raise RuntimeError('Gateway source contract changed; candidate not prepared: '+needle[:70])
 return text.replace(needle,replacement,1)
server="import { attachWikiAnalytics } from './gah-analytics/gateway-analytics.mjs';\n"+server
server=change(server,'  if (enforceWikiRateLimit(req, res)) return;','  if (enforceWikiRateLimit(req, res)) return;\n  if (attachWikiAnalytics(req, res)) return;')
for name in ['sendText','sendTextNoEdgeCache']:
 needle="function "+name+"(res, code, text, type = 'text/plain') {"
 server=change(server,needle,needle+"\n  if (code === 200 && type.startsWith('text/html') && res.gahPublicAnalytics) text = res.gahPublicAnalytics(text);")
needle="function send(req,res,status,body,type='text/html; charset=utf-8',index='noindex,follow'){"
policy=change(policy,needle,needle+"\n if(status===200&&type.startsWith('text/html')&&res.gahPublicAnalytics)body=res.gahPublicAnalytics(body);")
(out/'server.js').write_text(server);(out/'identifier-host-policy.mjs').write_text(policy)
repo=pathlib.Path(__file__).resolve().parents[2];assets=out/'gah-analytics';assets.mkdir(mode=0o700)
for f in ['analytics.js','consent.js','consent.css']:shutil.copy2(repo/'frontdoor'/f,assets/f)
shutil.copy2(repo/'workers/lib/analytics-html.mjs',assets/'analytics-html.mjs');shutil.copy2(pathlib.Path(__file__).with_name('gateway-analytics.mjs'),assets/'gateway-analytics.mjs')
sha=lambda f:hashlib.sha256(f.read_bytes()).hexdigest()
receipt={f:{'before':sha(source/f),'candidate':sha(out/f)} for f in ['server.js','identifier-host-policy.mjs']}
(out/'receipt.json').write_text(json.dumps(receipt,indent=2));print(json.dumps(receipt))
