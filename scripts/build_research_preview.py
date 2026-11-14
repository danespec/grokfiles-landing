from pathlib import Path
import json,base64,hashlib
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.decomposition import TruncatedSVD
p=Path(__file__).resolve().parents[1]/'content'
corpus=json.loads((p/'approved-public-metadata.json').read_text())
# Published metadata only; retain original strings. No inferred titles or subjects.
corpus=sorted({d['url']:d for d in corpus}.values(),key=lambda d:d['url'])
v=TfidfVectorizer(lowercase=True,token_pattern=r'(?u)\b[a-zA-Z0-9]{2,}\b',stop_words='english',sublinear_tf=False)
x=v.fit_transform([d['title']+' '+d['description'] for d in corpus]);svd=TruncatedSVD(n_components=min(12,len(corpus)-1),random_state=6);z=svd.fit_transform(x);z/=np.maximum(np.linalg.norm(z,axis=1,keepdims=True),1e-12)
model={'schema':'gah.research.preview.v1','method':'TF-IDF + latent semantic analysis (LSA), exact identifiers and lexical overlap; not neural embeddings','documents':corpus,'vocabulary':v.vocabulary_,'idf':v.idf_.round(8).tolist(),'components':svd.components_.round(8).tolist(),'vectors':z.round(8).tolist(),'exact_ids':['EFTA00022062'],'scope':'published metadata pilot only; no underlying source text; associations are not findings'}
model['version']=hashlib.sha256(json.dumps(model,sort_keys=True).encode()).hexdigest();(p/'research-preview-model.json').write_text(json.dumps(model,separators=(',',':')))
print('documents',len(corpus),'vocabulary',len(v.vocabulary_),'latent dimensions',z.shape[1],'model bytes',(p/'research-preview-model.json').stat().st_size)
(p/'research-preview-model.mjs').write_text('export default '+json.dumps(model,separators=(',',':'))+';\n')
