import {createHash} from 'node:crypto';
// Build server bundles outside the checkout; production excludes experimental data.
import fs from 'node:fs';import path from 'node:path';import {pathToFileURL,fileURLToPath} from 'node:url';
const production=process.argv[2]==='--production',advanced=process.argv[2]==='--advanced';
const root=fs.realpathSync(fileURLToPath(new URL('..',import.meta.url))),index=production?null:fs.realpathSync(advanced?process.env.GAH_PRIVATE_PASSAGE_INDEX:process.argv[2]||''),destination=path.resolve(process.argv[3]||''),modulePath=process.argv[4];
const inside=p=>p===root||p.startsWith(root+path.sep);
if(!process.argv[2]||!process.argv[3]||!modulePath||index&&inside(index)||inside(destination))throw Error('Private paths outside checkout required');
const parent=fs.realpathSync(path.dirname(destination));if(inside(parent))throw Error('Symlink output inside checkout');
if(!production){const raw=fs.readFileSync(index,'utf8');if(!raw.startsWith('export default ')||!raw.includes('gah.editorial.passages.v1'))throw Error('Invalid private input');}
const answerBank=production?null:fs.realpathSync(process.env.GAH_PRIVATE_REVIEWED_ANSWERS||'');if(answerBank&&inside(answerBank))throw Error('Private answer bank outside checkout required');
const vectors=production?null:fs.realpathSync(process.env.GAH_PRIVATE_EDITORIAL_VECTORS||'');
if(!production){if(inside(vectors))throw Error('Private vectors outside checkout required');const v=JSON.parse(fs.readFileSync(vectors,'utf8').replace(/^export default /,'').trim().replace(/;$/,''));if(v.fixture_only||v.model!=='@cf/baai/bge-small-en-v1.5')throw Error('Actual bound model snapshot required');}
const esbuild=await import(pathToFileURL(fs.realpathSync(modulePath)).href);
const flags={schema:'gah.research.flags.v1',passage:advanced,neural:advanced,exact_cache:advanced,reviewed_answers:advanced};
if(process.env.GAH_RESEARCH_BUILD_FLAGS){const override=JSON.parse(process.env.GAH_RESEARCH_BUILD_FLAGS);if(!override||Object.keys(override).some(k=>!['passage','neural','exact_cache','reviewed_answers'].includes(k)||typeof override[k]!=='boolean'))throw Error('Invalid research release flags');Object.assign(flags,override);}
if(production&&Object.entries(flags).some(([k,v])=>k!=='schema'&&v===true))throw Error('Standard production build cannot enable advanced flags');
flags.version=createHash('sha256').update(JSON.stringify(flags)).digest('hex');
const plugin={name:'isolated-research',setup(b){
 b.onResolve({filter:/research-feature-config\.mjs$/},()=>({path:'release-flags',namespace:'release-flags'}));
 b.onLoad({filter:/.*/,namespace:'release-flags'},()=>({contents:'export default '+JSON.stringify(flags),loader:'js'}));
 if(production){
  b.onResolve({filter:/reviewed-answer-runtime\.mjs$/},()=>({path:'disabled-answers',namespace:'production-disabled-answers'}));
  b.onLoad({filter:/.*/,namespace:'production-disabled-answers'},()=>({contents:"export function reviewedAnswer015(){return {answer:null,answer_claims:[],answer_abstained:true,answer_reason:'reviewed_answers_disabled'}}",loader:'js'}));
  b.onResolve({filter:/practical-retrieval\.mjs$/},()=>({path:'disabled-advanced',namespace:'production-disabled-advanced'}));
  b.onLoad({filter:/.*/,namespace:'production-disabled-advanced'},()=>({contents:"export const practicalVersion='disabled';export function practicalRetrieval(){throw Error('advanced_disabled')}",loader:'js'}));
  b.onResolve({filter:/editorial-search-012\.mjs$/},()=>({path:'disabled-passages',namespace:'production-disabled'}));
  b.onLoad({filter:/.*/,namespace:'production-disabled'},()=>({contents:"export async function deepHttp012(){return new Response(JSON.stringify({error:'not_found'}),{status:404,headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Robots-Tag':'noindex,nofollow'}})}",loader:'js'}));
 }else {b.onResolve({filter:/editorial-passages-012\.mjs$/},()=>({path:index}));b.onResolve({filter:/editorial-vectors-013\.mjs$/},()=>({path:vectors}));b.onResolve({filter:/reviewed-answers-015\.mjs$/},()=>({path:answerBank}));}
}};
const built=await esbuild.build({write:false,entryPoints:[path.join(root,'_worker.js')],outfile:destination,bundle:true,format:'esm',platform:'browser',target:'es2022',plugins:[plugin]});
const payload=built.outputFiles[0].contents,text=new TextDecoder().decode(payload);
if(production&&['gah.editorial.passages.v1','gah.evidence.answer.v1','Xenova/all-MiniLM'].some(s=>text.includes(s)))throw Error('Experimental data or model in production bundle');
const temporary=destination+'.tmp-'+process.pid;
try{fs.writeFileSync(temporary,payload,{flag:'wx',mode:0o600});fs.renameSync(temporary,destination);}finally{if(fs.existsSync(temporary))fs.unlinkSync(temporary);}
console.log(JSON.stringify({built:true,mode:production?'production-experiments-omitted':advanced?'public-bounded-retrieval':'protected-staging',private_input:!production,private_output:true,bytes:payload.length,feature_flags:flags,public_upload:false}));
