#!/usr/bin/env node
// Owner-authenticated Wrangler binding; never read or export credentials.
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
const model='@cf/baai/bge-small-en-v1.5';
const input=JSON.parse(await new Promise((resolve,reject)=>{let s='';process.stdin.setEncoding('utf8');process.stdin.on('data',c=>{s+=c;if(s.length>100000)reject(Error('Input too large'));});process.stdin.on('end',()=>resolve(s));process.stdin.on('error',reject);}));
const corpus=JSON.parse((await fs.readFile(new URL('../content/research-corpus-010.mjs',import.meta.url),'utf8')).trim().replace(/^export default /,'').replace(/;$/,''));
const authorized=new Set(corpus.documents.map(d=>d.title+' '+d.description));
if(input.model!==model||!Array.isArray(input.texts)||input.texts.length<1||input.texts.length>16||input.texts.some(t=>!authorized.has(t)))throw Error('Only eligible publication metadata may be embedded');
const require=createRequire(import.meta.url);
const wrangler=process.env.GAH_WRANGLER_MODULE||require.resolve('wrangler');
const temp=await fs.mkdtemp(path.join(os.tmpdir(),'gah-encoder-'));
const originalWrite=process.stdout.write.bind(process.stdout);
let platform;
try{
  // Wrangler progress is not part of the machine-readable encoder response.
  process.stdout.write=process.stderr.write.bind(process.stderr);
  const config=path.join(temp,'wrangler.json');
  await fs.writeFile(config,JSON.stringify({name:'gah-editorial-encoder-local',compatibility_date:'2026-11-18',ai:{binding:'AI',remote:true}}),{mode:0o600});
  const {getPlatformProxy}=await import(pathToFileURL(wrangler).href);
  platform=await getPlatformProxy({configPath:config,persist:false,remoteBindings:true});
  const vectors=[];
  for(const text of input.texts){
    const result=await platform.env.AI.run(model,{text:[text]});
    const v=result.data?.[0];
    if(!Array.isArray(v)||v.length!==384||!v.every(Number.isFinite))throw Error('Invalid embedding shape');
    const norm=Math.sqrt(v.reduce((sum,n)=>sum+n*n,0));
    if(!Number.isFinite(norm)||norm<=0)throw Error('Invalid embedding norm');
    vectors.push(v.map(n=>n/norm));
  }
  await platform.dispose();platform=null;
  process.stdout.write=originalWrite;
  console.log(JSON.stringify({vectors}));
}finally{
  if(platform)await platform.dispose();
  process.stdout.write=originalWrite;
  await fs.rm(temp,{recursive:true,force:true});
}
