"""Human acceptance gate. Never turns assistant draft labels into human judgments."""
import argparse,json,math

def score(review):
 cases=review['cases'];done=[c for c in cases if c.get('approved') is True and c.get('reviewer') and c.get('reviewed_at') and isinstance(c.get('answerable_in_reviewed_corpus'),bool) and all(isinstance(r.get('human_grade'),int) and not isinstance(r.get('human_grade'),bool) and 0<=r['human_grade']<=3 and isinstance(r.get('citation_verified_by_human'),bool) for r in c['results'])]
 if len(done)!=len(cases):return {'status':'blocked_missing_human_judgments','cases':len(cases),'reviewed':len(done),'MRR':None,'Recall@5':None,'nDCG@5':None,'acceptance_passed':False}
 metrics=[];subject=[]
 for c in done:
  grades=[r['human_grade'] for r in c['results'][:5]];missing=c.get('missing_relevant_urls',[]);ideal=sorted(grades+[r.get('grade',2) if isinstance(r,dict) else 2 for r in missing],reverse=True)[:5]
  if c['answerable_in_reviewed_corpus']:
   rank=next((i+1 for i,g in enumerate(grades) if g>=2),None);den=sum(g>=2 for g in grades)+len(missing);dcg=lambda v:sum((2**g-1)/math.log2(i+2) for i,g in enumerate(v));metrics.append([1/rank if rank else 0,sum(g>=2 for g in grades)/den if den else 0,dcg(grades)/dcg(ideal) if dcg(ideal) else 0])
  if c['intent'] in ['subject','financial','flight','timeline','multi_source']:subject.append(sum(g>=2 for g in grades[:3])/3)
 n=len(metrics);return {'status':'human_review_complete','cases':len(cases),'reviewed':len(done),'MRR':sum(x[0] for x in metrics)/n if n else None,'Recall@5':sum(x[1] for x in metrics)/n if n else None,'nDCG@5':sum(x[2] for x in metrics)/n if n else None,'subject_Precision@3':sum(subject)/len(subject) if subject else None,'citation_human_verification':sum(r['citation_verified_by_human'] for c in done for r in c['results'])/max(sum(len(c['results']) for c in done),1),'acceptance_passed':False,'remaining_gates':'Combine with exact/nav controls, runtime latency, NAS/security receipts; this review alone does not authorize promotion.'}
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--review',required=True);p.add_argument('--output',required=True);a=p.parse_args();out=score(json.load(open(a.review)));open(a.output,'w').write(json.dumps(out,indent=2));print(json.dumps(out));raise SystemExit(2 if out['status'].startswith('blocked') else 0)
