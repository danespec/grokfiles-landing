// Private build only: generated input and output must remain outside public checkout.
import fs from 'node:fs';import path from 'node:path';import {pathToFileURL,fileURLToPath} from 'node:url';
const root=fs.realpathSync(fileURLToPath(new URL('..',import.meta.url))),index=fs.realpathSync(process.argv[2]||''),destination=path.resolve(process.argv[3]||''),modulePath=process.argv[4];
const inside=p=>p===root||p.startsWith(root+path.sep);
if(!process.argv[2]||!process.argv[3]||!modulePath||inside(index)||inside(destination))throw Error('Private paths outside checkout required');
const parent=fs.realpathSync(path.dirname(destination));if(inside(parent))throw Error('Symlink output inside checkout');
const raw=fs.readFileSync(index,'utf8');if(!raw.startsWith('export default ')||!raw.includes('gah.editorial.passages.v1'))throw Error('Invalid private input');
const esbuild=await import(pathToFileURL(fs.realpathSync(modulePath)).href);
const built=await esbuild.build({write:false,entryPoints:[path.join(root,'_worker.js')],outfile:destination,bundle:true,format:'esm',platform:'browser',target:'es2022',plugins:[{name:'private-passages',setup(b){b.onResolve({filter:/editorial-passages-012\.mjs$/},()=>({path:index}));}}]});
const temporary=destination+'.tmp-'+process.pid;
try{fs.writeFileSync(temporary,built.outputFiles[0].contents,{flag:'wx',mode:0o600});fs.renameSync(temporary,destination);}finally{if(fs.existsSync(temporary))fs.unlinkSync(temporary);}
console.log(JSON.stringify({built:true,private_input:true,private_output:true,bytes:fs.statSync(destination).size,public_upload:false}));
