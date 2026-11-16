// Convert real private model selections into unapproved, source-bound review packets.
import fs from 'node:fs';import path from 'node:path';
import MODEL from '../content/research-corpus-010.mjs';
import {evidenceHash015,evidenceUnsafe015} from '../content/evidence-answers-015.mjs';
const root=fs.realpathSync(new URL('..',import.meta.url)),evaluation=JSON.parse(fs.readFileSync(process.argv[2])),output=path.resolve(process.argv[3]||'');if(!process.argv[3]||output===root||output.startsWith(root+path.sep))throw Error('Private review directory outside checkout required');fs.mkdirSync(output,{recursive:true,mode:0o700});if(fs.realpathSync(output).startsWith(root+path.sep))throw Error('Private directory required');
const questions=new Map(JSON.parse(fs.readFileSync(new URL('../tests/fixtures/retrieval-010-queries.json',import.meta.url))).map(q=>[q.id,q.query])),docs=new Map(MODEL.documents.map(d=>[d.url,d]));let count=0;
for(const row of evaluation.rows){if(row.abstained||!row.accepted_source_quotations)continue;const question=questions.get(row.id);if(!question||evidenceUnsafe015.test(question))continue;
 const sources=row.source_urls.map(url=>{const d=docs.get(url);if(!d||evidenceUnsafe015.test(d.description))throw Error('Unsafe/unknown source');const id=evidenceHash015(url);return {id,url,text:d.description,text_sha256:evidenceHash015(d.description),publication_sha256:d.source_sha256,current_publication_sha256:d.source_sha256,privacy_approved:false,classification:'unresolved',limitation:'Published editorial summary, not independently verified primary evidence. Reviewer must check classification, privacy and source entailment.'};});
 const claims=sources.map(s=>({source_id:s.id,quote:s.text,classification:s.classification})),version=evidenceHash015(MODEL.version+':'+row.id),packet={question,claims,sources,version};packet.review={approved:false,independent:false,privacy_approved:false,author:'GAH automated draft preparation',reviewer:null,date:null,version,packet_sha256:evidenceHash015(JSON.stringify(packet))};
 fs.writeFileSync(path.join(output,row.id+'.json'),JSON.stringify(packet,null,2),{mode:0o600});count++;
}
console.log(JSON.stringify({review_packets:count,approved:0,human_validation_completed:false,automatic_admission_approval_requested:false}));
