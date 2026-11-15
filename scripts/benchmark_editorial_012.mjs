import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import {performance} from 'node:perf_hooks';
import {deepSearch012} from '../content/editorial-search-012.mjs';import {researchPipeline010} from '../content/research-pipeline-010.mjs';
const raw=fs.readFileSync(new URL('../tests/fixtures/retrieval-010-queries.json',import.meta.url));
const hash=crypto.createHash('sha256').update(raw).digest('hex');
const freeze=JSON.parse(fs.readFileSync(new URL('../tests/fixtures/benchmark-freeze.json',import.meta.url)));
if(hash!==freeze.sha256)throw Error('Frozen fixture changed');
const out=path.resolve(process.argv[2]||'');if(!process.argv[2]||out.startsWith(process.cwd()+path.sep)||out===process.cwd())throw Error('Use evidence directory outside repository');fs.mkdirSync(out,{recursive:true});
const rows=[];
for(const q of JSON.parse(raw)){
 const entry={id:q.id,category:q.category,query:q.query};
 for(const [name,fn] of [['baseline',researchPipeline010],['candidate',deepSearch012]]){
  const t=performance.now();try{const x=fn(q.query,5);entry[name]={results:x.results.map(r=>r.url),abstained:x.abstained,answer_null:x.answer===null,generated_claims:x.generated_claims,origin_requests:x.origin_requests,nas_reads:x.nas_reads,ms:performance.now()-t,error:null}}catch(e){entry[name]={error:String(e.message),ms:performance.now()-t}}
 }rows.push(entry);
}
const summarize=rs=>Object.fromEntries(['baseline','candidate'].map(k=>{const a=rs.map(x=>x[k]),t=a.map(x=>x.ms).sort((a,b)=>a-b);return [k,{cases:a.length,errors:a.filter(x=>x.error).length,abstentions:a.filter(x=>x.abstained).length,generated_answers:a.filter(x=>x.answer_null===false).length,origin_requests:a.reduce((n,x)=>n+(x.origin_requests||0),0),nas_reads:a.reduce((n,x)=>n+(x.nas_reads||0),0),median_ms:t[Math.floor(t.length/2)],p95_ms:t[Math.ceil(.95*t.length)-1]}]}));
const summary={...summarize(rows),changed_first_destination:rows.filter(r=>r.baseline.results?.[0]!==r.candidate.results?.[0]).length,category_counts:Object.fromEntries([...new Set(rows.map(r=>r.category))].map(c=>[c,summarize(rows.filter(r=>r.category===c))]))};
const report={fixture_sha256:hash,scope:'Local execution on frozen 250-query fixture; no new independent judgments, no quality certification or production CPU/latency claim.',summary,rows};fs.writeFileSync(out+'/comparison-250.json',JSON.stringify(report,null,2));console.log(JSON.stringify(summary));
