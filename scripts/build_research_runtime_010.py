import pathlib,hashlib,json,argparse
r=pathlib.Path(__file__).resolve().parents[1]
files=['_worker.js','content/research-pipeline-010.mjs','content/retrieval-routing.mjs','content/research-preview.mjs','content/public-research-011.mjs','content/retrieval-release.mjs','content/atlas-graph-reviewed.mjs','scripts/build_research_corpus_010.py','content/research-evidence-closeout.mjs']
hashes={n:hashlib.sha256((r/n).read_bytes()).hexdigest() for n in files}
v=hashlib.sha256(json.dumps(hashes,sort_keys=True,separators=(',',':')).encode()).hexdigest()
s='export default '+json.dumps({'schema':'gah.research.runtime.v1','version':v,'source_files':hashes},separators=(',',':'))+';\n'
p=argparse.ArgumentParser();p.add_argument('--check',action='store_true');a=p.parse_args();f=r/'content/research-runtime-010.mjs'
if a.check:assert f.read_text()==s,'Regenerate research runtime fingerprint after code changes'
else:f.write_text(s)
print('Research runtime fingerprint:',v)
