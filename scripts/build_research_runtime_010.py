import pathlib,hashlib,json,argparse,os
r=pathlib.Path(__file__).resolve().parents[1]
files=['content/ask-editorial-staging.mjs','content/reviewed-live-016.mjs','content/review-certification-016.mjs','_worker.js','content/research-pipeline-010.mjs','content/retrieval-routing.mjs','content/research-preview.mjs','content/public-research-011.mjs','content/retrieval-release.mjs','content/atlas-graph-reviewed.mjs','scripts/build_research_corpus_010.py','scripts/build_editorial_passages_012.py','content/editorial-search-012.mjs','content/editorial-passages-012.mjs','content/research-evidence-closeout.mjs','content/practical-retrieval.mjs','content/exact-result-cache.mjs','scripts/build_editorial_vectors_013.py','content/reviewed-answer-runtime.mjs','content/evidence-answers-015.mjs','scripts/build_reviewed_answer_bank_015.mjs','content/research-features.mjs','content/research-feature-config.mjs']
private=pathlib.Path(os.environ['GAH_PRIVATE_PASSAGE_INDEX']).resolve()
if private==r or r in private.parents:raise ValueError('Passage index must be outside checkout')
hashes={n:hashlib.sha256((private if n=='content/editorial-passages-012.mjs' else r/n).read_bytes()).hexdigest() for n in files}
v=hashlib.sha256(json.dumps(hashes,sort_keys=True,separators=(',',':')).encode()).hexdigest()
s='export default '+json.dumps({'schema':'gah.research.runtime.v1','version':v,'source_files':hashes},separators=(',',':'))+';\n'
p=argparse.ArgumentParser();p.add_argument('--check',action='store_true');a=p.parse_args();f=r/'content/research-runtime-010.mjs'
if a.check:assert f.read_text()==s,'Regenerate research runtime fingerprint after code changes'
else:f.write_text(s)
print('Research runtime fingerprint:',v)
