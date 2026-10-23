import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve(new URL('..',import.meta.url).pathname);
const source=await readFile(path.join(root,'_worker.js'),'utf8');
const {default:worker,enhanceHtmlText}=await import('data:text/javascript;base64,'+Buffer.from(source+'\nexport {enhanceHtmlText};').toString('base64'));
for(const file of ['index.html','about.html','investigations/hold-the-letter.html']){
  const input=await readFile(path.join(root,file),'utf8');
  const url='https://grokarchivehub.com/'+(file==='index.html'?'':file.replace(/\.html$/,''));
  const rendered=enhanceHtmlText(input,url,{},{});
  assert.equal((rendered.match(/href="\/assets\/header-responsive-063\.css"/g)||[]).length,1,file+' shared stylesheet');
  assert.equal((enhanceHtmlText(rendered,url,{},{}).match(/href="\/assets\/header-responsive-063\.css"/g)||[]).length,1,file+' idempotence');
  assert.match(rendered,/data-menu\b/);
  assert.match(rendered,/aria-controls="gah-v3-mobile-nav"/);
  assert.doesNotMatch(rendered,/pagead\/js\/adsbygoogle\.js/);
}
const css=await readFile(path.join(root,'assets/header-responsive-063.css'),'utf8');
const env={ASSETS:{fetch:async request=>{
  const url=new URL(typeof request==='string'?request:request.url);
  try{return new Response(await readFile(path.join(root,url.pathname.slice(1))),{headers:{'Content-Type':'text/css'}})}
  catch{return new Response('missing',{status:404})}
}}};
for(const method of ['GET','HEAD']){
  const response=await worker.fetch(new Request('https://grokarchivehub.com/assets/header-responsive-063.css',{method}),env);
  assert.equal(response.status,200);
  assert.match(response.headers.get('Content-Type'),/text\/css/);
  const body=await response.text();
  if(method==='GET')assert.equal(body,css);
}
const fixture=await readFile(path.join(root,'frontdoor/responsive-check-063.html'),'utf8');
assert.match(fixture,/name="robots" content="noindex,nofollow"/);
assert.match(fixture,/iframe title="Responsive site preview" src="about:blank"/);
console.log('PASS shared stylesheet delivery and idempotent integration across homepage, trust page and investigation; ads remain disabled; maintenance fixture is noindex');
