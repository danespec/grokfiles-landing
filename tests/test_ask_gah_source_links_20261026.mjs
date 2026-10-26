import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import path from 'node:path';
import worker from '../_worker.js';
const root=path.resolve(new URL('..',import.meta.url).pathname);
class Element {
  constructor(tag='div'){this.tagName=tag;this.children=[];this.handlers={};this._text='';}
  set textContent(value){this._text=String(value);this.children=[];}
  get textContent(){return this._text;}
  set innerHTML(value){this._html=value;this.children=[];}
  addEventListener(type,handler){this.handlers[type]=handler;}
  appendChild(child){this.children.push(child);}
}
async function render(source,payload){
 const form=new Element('form'),question={value:'Which documents mention Leon Black?'},status=new Element(),response=new Element();
 const nodes={'[data-ask-gah-form]':form,'[data-ask-gah-question]':question,'[data-ask-gah-status]':status,'[data-ask-gah-response]':response};
 let request;
 const context={URL,window:{location:{origin:'https://grokarchivehub.com'}},document:{createElement:tag=>new Element(tag)},
  $:key=>nodes[key]||null,$$:()=>[],fetch:async(url,options)=>{request={url,options};return {ok:true,text:async()=>JSON.stringify(payload)};}};
 const code=source.slice(source.indexOf('  function safeHref'),source.indexOf('  function lockScroll'))+
  source.slice(source.indexOf('  function initAskGah'),source.indexOf('  function initSearch'))+'\ninitAskGah();';
 vm.runInNewContext(code,context);
 form.handlers.submit({preventDefault(){}});
 for(let i=0;i<5;i++)await new Promise(resolve=>setImmediate(resolve));
 assert.equal(status.textContent,'Archive response ready.');
 assert.equal(request.url,'/api/ai/query');
 assert.equal(JSON.parse(request.options.body).question,question.value);
 return response.children;
}
const versions=['v3-source-links-063.js','v3-barak-source-links-063.js'];
for(const name of versions){
 const source=await readFile(path.join(root,'assets',name),'utf8');new vm.Script(source);
 let rows=await render(source,{answer:'Summary',hits:[
  {id:'EFTA00646811',title:'Valuation correspondence'},
  {efta_id:' efta01410768 ',title:'Article correspondence'},
  {document_id:'EFTA00013764'},
  {efta:'EFTA01703108',read_url:'https://www.justice.gov/epstein',title:'Existing source'},
  {id:'EFTA00013764',url:'javascript:alert(1)',title:'Unsafe URL with valid ID'},
  {id:'14998',title:'Mailbox record'},
  {id:'EFTA123',title:'Incomplete ID'},
  {id:'EFTA000137640',title:'Too many digits'},
  {id:'EFTA00013764/../../admin',title:'Invalid path'},
  {url:'data:text/html,test',title:'Unsafe URL without ID'},
  {pdf_url:'https://www.justice.gov/example.pdf',title:'Direct PDF'},
  {id:'opaque',efta_id:'EFTA00646811',title:'Alternate ID field'},
  null,
  {id:'EFTA00013764',title:'<img src=x onerror=alert(1)>'}
 ]});
 assert.equal(rows[0].textContent,'Summary');
 const links=rows.slice(1).map(row=>row.children[0]||null);
 assert.equal(links[0].href,'https://grokarchivehub.com/archive/EFTA00646811');
 assert.equal(links[0].textContent,'Valuation correspondence (EFTA00646811)');
 assert.equal(links[1].href,'https://grokarchivehub.com/archive/EFTA01410768');
 assert.equal(links[2].textContent,'EFTA00013764');
 assert.equal(links[3].href,'https://www.justice.gov/epstein');
 assert.equal(links[3].target,'_blank');assert.equal(links[3].rel,'noopener noreferrer');
 assert.equal(links[4].href,'https://grokarchivehub.com/archive/EFTA00013764');
 for(const i of [5,6,7,8,9])assert.equal(links[i],null);
 assert.equal(links[10].href,'https://www.justice.gov/example.pdf');
 assert.equal(links[11].href,'https://grokarchivehub.com/archive/EFTA00646811');
 assert.ok(links[12].textContent.startsWith('<img'));assert.equal(links[12].children.length,0);
 // Empty or malformed preferred result fields do not suppress a valid fallback array.
 rows=await render(source,{hits:{invalid:true},sources:[{id:'EFTA00013764'}]});
 assert.equal(rows[0].children[0].href,'https://grokarchivehub.com/archive/EFTA00013764');
 rows=await render(source,{hits:[]});assert.equal(rows.length,0);
 console.log('PASS '+name+': ID-only links, explicit URLs, source families, unsafe URLs, malformed rows and text-only labels');
}
const env={ASSETS:{fetch:async input=>{
 const u=new URL(typeof input==='string'?input:input.url);
 let f=u.pathname==='/'?'index.html':u.pathname.slice(1);
 if(['search','latest','entities'].includes(f))f+='.html';
 try{return new Response(await readFile(path.join(root,f)),{headers:{'Content-Type':f.endsWith('.js')?'application/javascript':'text/html'}});}
 catch{return new Response('Missing',{status:404});}
}},X_TOKEN_STORE:{get:async()=>null}};
globalThis.fetch=async()=>{throw Error('Unexpected external fallback');};
for(const route of ['/','/search','/videos/ask-gah-search-epstein-files','/barak/entities']){
 const response=await worker.fetch(new Request('https://grokarchivehub.com'+route),env);
 assert.equal(response.status,200,route);const html=await response.text();
 const names=[...html.matchAll(/src=["']([^"']*v3[^"']*\.js)["']/g)].map(m=>m[1]);
 assert.ok(names.some(name=>name.includes('source-links-063.js')),route);
 assert.ok(!names.some(name=>/v3-newsletter-062|v3-barak-027/.test(name)),route);
 assert.ok(response.headers.get('Content-Security-Policy').includes('/assets/v3-source-links-063.js'));
}
for(const name of versions){
 const response=await worker.fetch(new Request('https://grokarchivehub.com/assets/'+name),env);
 assert.equal(response.status,200);assert.match(response.headers.get('Content-Type'),/javascript/);
}
console.log('PASS Worker delivers fresh script paths, allows only explicit new script assets and preserves production routes');
