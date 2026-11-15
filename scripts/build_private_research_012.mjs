// Build server bundles outside the checkout; production excludes experimental data.
import fs from 'node:fs';import path from 'node:path';import {pathToFileURL,fileURLToPath} from 'node:url';
const production=process.argv[2]==='--production';
const root=fs.realpathSync(fileURLToPath(new URL('..',import.meta.url))),index=production?null:fs.realpathSync(process.argv[2]||''),destination=path.resolve(process.argv[3]||''),modulePath=process.argv[4];
const inside=p=>p===root||p.startsWith(root+path.sep);
if(!process.argv[2]||!process.argv[3]||!modulePath||index&&inside(index)||inside(destination))throw Error('Private paths outside checkout required');
const parent=fs.realpathSync(path.dirname(destination));if(inside(parent))throw Error('Symlink output inside checkout');
if(!production){const raw=fs.readFileSync(index,'utf8');if(!raw.startsWith('export default ')||!raw.includes('gah.editorial.passages.v1'))throw Error('Invalid private input');}
const esbuild=await import(pathToFileURL(fs.realpathSync(modulePath)).href);
const plugin={name:'isolated-research',setup(b){
 if(production){
  b.onResolve({filter:/editorial-search-012\.mjs$/},()=>({path:'disabled-passages',namespace:'production-disabled'}));
  b.onLoad({filter:/.*/,namespace:'production-disabled'},()=>({contents:"export async function deepHttp012(){return new Response(JSON.stringify({error:'not_found'}),{status:404,headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Robots-Tag':'noindex,nofollow'}})}",loader:'js'}));
 }else b.onResolve({filter:/editorial-passages-012\.mjs$/},()=>({path:index}));
}};
const built=await esbuild.build({write:false,entryPoints:[path.join(root,'_worker.js')],outfile:destination,bundle:true,format:'esm',platform:'browser',target:'es2022',plugins:[plugin]});
const payload=built.outputFiles[0].contents,text=new TextDecoder().decode(payload);
if(production&&['gah.editorial.passages.v1','gah.evidence.answer.v1','Xenova/all-MiniLM'].some(s=>text.includes(s)))throw Error('Experimental data or model in production bundle');
const temporary=destination+'.tmp-'+process.pid;
try{fs.writeFileSync(temporary,payload,{flag:'wx',mode:0o600});fs.renameSync(temporary,destination);}finally{if(fs.existsSync(temporary))fs.unlinkSync(temporary);}
console.log(JSON.stringify({built:true,mode:production?'production-experiments-omitted':'protected-staging',private_input:!production,private_output:true,bytes:payload.length,public_upload:false}));
