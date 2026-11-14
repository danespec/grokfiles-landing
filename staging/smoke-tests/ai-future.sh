#!/usr/bin/env bash
# Owner-authorized staging-only smoke. Secrets must be supplied in environment.
set -euo pipefail
python3 - "$@" <<'PY'
import json,os,re,ssl,sys,time,urllib.request,urllib.error
from urllib.parse import urlsplit
if len(sys.argv)!=2: raise SystemExit("Supply the exact staging preview URL")
url=urlsplit(sys.argv[1])
if url.scheme!="https" or not re.fullmatch(r"(?:[a-z0-9-]+\.)?gah-staging-517b8499\.pages\.dev",url.netloc) or url.path not in ("","/") or url.query or url.fragment:
    raise SystemExit("Refusing non-staging or malformed target")
base="https://"+url.netloc
class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self,*args,**kwargs): return None
# Some Homebrew Python installations lack a default CA bundle. Use the
# operating system trust bundle, never turn off certificate verification.
ctx=ssl.create_default_context()
if not ctx.get_ca_certs() and os.path.isfile("/etc/ssl/cert.pem"):
    ctx.load_verify_locations(cafile="/etc/ssl/cert.pem")
opener=urllib.request.build_opener(NoRedirect,urllib.request.HTTPSHandler(context=ctx))
def call_raw(path,method="GET",headers=None,payload=None,auth=True):
    h=dict(headers or {})
    if auth:
        h.update({"CF-Access-Client-Id":os.environ["CF_ACCESS_CLIENT_ID"],"CF-Access-Client-Secret":os.environ["CF_ACCESS_CLIENT_SECRET"]})
    req=urllib.request.Request(base+path,data=payload,headers=h,method=method)
    try: r=opener.open(req,timeout=20)
    except urllib.error.HTTPError as e: r=e
    with r: return r.status,r.headers,r.read()
rate_seen=False
def call(path,method="GET",headers=None,payload=None,auth=True):
    global rate_seen
    for attempt in range(3):
        result=call_raw(path,method,headers,payload,auth)
        if result[0]!=429: return result
        rate_seen=True
        wait=int(result[1].get("Retry-After","60"));assert 1<=wait<=60
        print("PASS observed rate limit; waiting for next window",flush=True)
        time.sleep(wait)
    raise AssertionError("Rate limit did not reset")
for p in ("/llms.txt","/api/v1/stories","/api/v1/atlas/graph"):
    status,h,_=call(p,auth=False)
    assert status in (302,401,403) and (status!=302 or urlsplit(h.get("Location","")).hostname=="grokfiles.cloudflareaccess.com"),(p,status)
print("PASS unauthenticated Access boundary")
if not all(os.environ.get(k) for k in ("CF_ACCESS_CLIENT_ID","CF_ACCESS_CLIENT_SECRET")):
    raise SystemExit("Authenticated checks not run: owner-authorized staging service credentials not supplied")
def get(path,status=200):
    code,h,b=call(path); assert code==status,(path,code)
    assert "noindex" in h.get("X-Robots-Tag","").lower(),path
    return h,b
h,b=get("/llms.txt");assert b"Story Atlas" in b
h,b=get("/api/v1/stories?limit=2");data=json.loads(b);assert len(data["stories"])==2
assert h.get("Cache-Control")=="no-store"
code,_,body=call("/api/v1/stories?limit=2",headers={"If-None-Match":h["ETag"]});assert code==304 and not body
_,b=get("/api/v1/atlas/graph");g=json.loads(b)
assert g["review_status"]=="partial_citation_pilot" and g["reviewed_story_count"]==5
assert len(g["edges"])==7 and len(g["document_nodes"])==6
_,b=get("/api/v1/atlas/graph?document=EFTA00022062"); reverse=json.loads(b)
assert {e["from"] for e in reverse["edges"]}=={"3","P13"}
assert all(e["relation"]=="cites_public_record" for e in reverse["edges"])
_,b=get("/openapi.json");assert "/api/v1/atlas/graph" in json.loads(b)["paths"]
payload=json.dumps({"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"get_atlas_citation_graph","arguments":{}}}).encode()
status,h,b=call("/mcp","POST",{"Content-Type":"application/json"},payload)
assert status==200 and not json.loads(b)["result"].get("isError"),status
# Full release census; retry only the staging limiter, never redirect credentials.
all_stories=[];cursor=0
while True:
    _,body=get("/api/v1/stories?limit=50&cursor="+str(cursor));page=json.loads(body)
    all_stories.extend(page["stories"])
    if page["next_cursor"] is None: break
    cursor=page["next_cursor"]
assert len(all_stories)==82 and len({s["id"] for s in all_stories})==82
for number,story in enumerate(all_stories):
    _,body=get("/api/v1/stories/"+story["id"])
    assert json.loads(body)["story"]==story
    if (number+1)%20==0:print("PASS story locators",number+1,flush=True)
for sid in ("3","13","P4","P13","P15"):
    _,body=get("/api/v1/atlas/graph?story="+sid)
    selected=json.loads(body);assert selected["edges"] and all(e["from"]==sid for e in selected["edges"])
code,h,b=call("/about",headers={"Accept":"text/markdown"});assert code==200 and "text/markdown" in h.get("Content-Type","")
code,_,b=call("/api/v1/stories",method="HEAD");assert code==200 and not b
code,_,_=call("/mcp","POST",{"Content-Type":"application/json","Origin":"https://untrusted.invalid"},payload);assert code==403
assert rate_seen,"No live atomic limiter denial observed during bounded locator census"
print("PASS authenticated staging: all 82 locators, 5 stories, 7 edges/6 records, Markdown, reverse lookup, HEAD/304, MCP, origin and live rate limit")
PY
