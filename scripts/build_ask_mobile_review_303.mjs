// Responsive QA fixture only. Main-site frame/security policy is unchanged.
import fs from 'node:fs/promises';
import path from 'node:path';
import worker from '../_worker.js';
const root=path.resolve(new URL('..',import.meta.url).pathname),out=path.resolve(process.argv[2]||'');
if(!process.argv[2]||out===root||out.startsWith(root+path.sep))throw Error('External fixture output required');
const ASSETS={fetch:async request=>{let p=new URL(request.url).pathname;if(p==='/')p='/index.html';try{return new Response(await fs.readFile(path.join(root,p)),{headers:{'Content-Type':p.endsWith('.html')?'text/html':'application/octet-stream'}})}catch{return new Response('missing',{status:404})}}};
const rendered=await worker.fetch(new Request('https://ask-editorial-review.gah-staging-517b8499.pages.dev/'),{GAH_STAGING:'true',ASSETS});
if(!rendered.ok)throw Error('Stage markup unavailable');
const html=(await rendered.text()).replace('</body>','<button class="btn btn-fill ask-launcher" data-overlay-open="ask-gah-panel" style="position:fixed;right:16px;bottom:24px;z-index:80;min-height:44px">Ask GAH</button></body>'),escaped=html.replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const template=await fs.readFile(new URL('../tests/fixtures/ask-mobile-review.html',import.meta.url),'utf8');
await fs.mkdir(path.dirname(out),{recursive:true});
await fs.writeFile(out,template.replace('src="/"','srcdoc="'+escaped+'"'));
console.log(JSON.stringify({mobile_viewport:[390,844],markup:'actual Worker staging render',api:'same-origin deployed endpoint',main_csp_unchanged:true}));
