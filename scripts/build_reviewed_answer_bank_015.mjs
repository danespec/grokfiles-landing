// Compile only independently approved source-bound answers; pending reviews never activate.
import fs from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';
import MODEL from '../content/research-corpus-010.mjs';
import {assembleEvidenceAnswer015} from '../content/evidence-answers-015.mjs';
const root=fs.realpathSync(new URL('..',import.meta.url)),directory=fs.realpathSync(process.argv[2]||''),output=path.resolve(process.argv[3]||'');
if(!process.argv[3]||[directory,fs.realpathSync(path.dirname(output))].some(p=>p===root||p.startsWith(root+path.sep)))throw Error('Private review/output directories outside checkout required');
const packets=[];let pending=0;
for(const file of fs.readdirSync(directory).filter(x=>x.endsWith('.json')).sort()){
 const packet=JSON.parse(fs.readFileSync(path.join(directory,file)));if(packet.review?.approved!==true){pending++;continue;}
 if(packet.sources?.some(s=>s.text!==MODEL.documents.find(d=>d.url===s.url)?.description))throw Error('Only current verbatim public metadata can enter the first answer bank');
 const result=assembleEvidenceAnswer015({...packet,production:true});if(result.abstained)throw Error('Approved packet failed evidence/review gate: '+result.reason);
 if(packets.some(p=>p.question===packet.question))throw Error('Duplicate approved question');packets.push({question:packet.question,result});
}
const data={schema:'gah.reviewed.answer.bank.v1',corpus_version:MODEL.version,packets};data.version=createHash('sha256').update(JSON.stringify(data)).digest('hex');const text='export default '+JSON.stringify(data)+';\n';
if(process.argv.includes('--check')){if(fs.readFileSync(output,'utf8')!==text)throw Error('Answer bank stale');}else{const temporary=output+'.tmp-'+process.pid;try{fs.writeFileSync(temporary,text,{mode:0o600,flag:'wx'});fs.renameSync(temporary,output);}finally{if(fs.existsSync(temporary))fs.unlinkSync(temporary);}}
console.log(JSON.stringify({approved:packets.length,pending,version:data.version,public_answers_activated:false}));
