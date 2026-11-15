"""Independent relevance metrics. Never substitutes algorithm-generated grades."""
import argparse,json,math,datetime,hashlib
from pathlib import Path
METRICS=['MRR','Recall@5','Recall@10','Precision@3','Precision@5','nDCG@5','nDCG@10','citation_validity','retrieval_abstention_accuracy','applicable_subject_precision_at_3']
def score(review):
 cases=review['cases'];validated=[]
 for c in cases:
  qs=c.get('qrels',[])
  ok=c.get('approved') is True and isinstance(c.get('reviewer'),str) and c['reviewer'].strip() and isinstance(c.get('reviewed_at'),str) and type(c.get('answerable_in_reviewed_corpus')) is bool and c.get('judgment_pool_complete') is True and type(c.get('applicable_top3')) is bool
  try:datetime.date.fromisoformat(c.get('reviewed_at',''))
  except (ValueError,TypeError):ok=False
  urls=[q.get('url') for q in qs]
  ok=ok and len(urls)==len(set(urls)) and all(type(q.get('human_grade')) is int and 0<=q['human_grade']<=3 and type(q.get('citation_verified_by_human')) is bool for q in qs) and set(c.get('result_urls',[])).issubset(set(urls))
  if ok:validated.append(c)
 out={'status':'human_review_complete' if len(validated)==len(cases) and len(cases)>=250 else 'blocked_missing_independent_review','cases':len(cases),'reviewed':len(validated),**dict.fromkeys(METRICS),'acceptance_passed':False,'scope':'Judged publication pool, not corpus-wide relevance proof; requires separate runtime/security/cost gates'}
 if out['status']!='human_review_complete':return out
 vals={m:[] for m in METRICS};citations=[]
 for c in validated:
  grades={r['url']:r['human_grade'] for r in c['qrels']};hits=c['result_urls'];relevant={u for u,g in grades.items() if g>=2};answerable=c['answerable_in_reviewed_corpus'];vals['retrieval_abstention_accuracy'].append((not hits)==(not answerable));citations.extend(r['citation_verified_by_human'] for r in c['qrels'] if r['url'] in hits)
  if not answerable:continue
  if not relevant:raise ValueError('Answerable case requires independently judged relevant publications')
  vals['MRR'].append(next((1/(i+1) for i,u in enumerate(hits) if u in relevant),0))
  for k in [5,10]:
   vals['Recall@'+str(k)].append(len(set(hits[:k])&relevant)/len(relevant));ideal=sorted(grades.values(),reverse=True)[:k];dcg=lambda gs:sum((2**g-1)/math.log2(i+2) for i,g in enumerate(gs));vals['nDCG@'+str(k)].append(dcg([grades[u] for u in hits[:k]])/dcg(ideal) if dcg(ideal) else 0)
  for k in [3,5]:vals['Precision@'+str(k)].append(sum(u in relevant for u in hits[:k])/k)
  if c['applicable_top3'] and c['category'] in ['subject','finance','flight','chronology','complex']:vals['applicable_subject_precision_at_3'].append(sum(u in relevant for u in hits[:3])/3)
 for m,v in vals.items():out[m]=sum(v)/len(v) if v else None
 out['citation_validity']=sum(citations)/len(citations) if citations else None;return out
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--review',required=True);p.add_argument('--experiment',required=True);p.add_argument('--output',required=True);a=p.parse_args();review=json.loads(Path(a.review).read_text());raw=Path(a.experiment).read_bytes();experiment=json.loads(raw);fixture=(Path(__file__).resolve().parents[1]/'tests/fixtures/retrieval-010-queries.json').read_bytes();assert review['fixture_sha256']==hashlib.sha256(fixture).hexdigest()==experiment['fixture_sha256'],'Fixture mismatch';assert review['experiment_sha256']==hashlib.sha256(raw).hexdigest(),'Experiment changed';qs={q['id']:q for q in json.loads(fixture)};cases=review['cases'];assert len(cases)==len(qs)==len({c['id'] for c in cases})==250;results={r['id']:r for run in experiment['runs'] if run['strategy']==review['strategy'] for r in run['rows']};assert len(results)==250
 for c in cases:
  assert c['query']==qs[c['id']]['query'] and c['split']==qs[c['id']]['split'] and c['category']==qs[c['id']]['category'],'Case changed'
  assert c['result_urls']==[r['url'] for r in results[c['id']]['results']],'Ranking changed after review'
 out=score(review);Path(a.output).write_text(json.dumps(out,indent=2));print(json.dumps(out));raise SystemExit(2 if out['status'].startswith('blocked') else 0)
