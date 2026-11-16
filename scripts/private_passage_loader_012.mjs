// Resolve the derived passage index from private storage, including in CI.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const root=fs.realpathSync(fileURLToPath(new URL('..',import.meta.url)));
export async function resolve(specifier,context,nextResolve){
 if(specifier.endsWith('/editorial-passages-012.mjs')||specifier.endsWith('/editorial-vectors-013.mjs')||specifier.endsWith('/reviewed-answers-015.mjs')){
  const configured=specifier.endsWith('/reviewed-answers-015.mjs')?process.env.GAH_PRIVATE_REVIEWED_ANSWERS:specifier.endsWith('/editorial-vectors-013.mjs')?process.env.GAH_PRIVATE_EDITORIAL_VECTORS:process.env.GAH_PRIVATE_PASSAGE_INDEX;
  if(!configured)throw Error('GAH_PRIVATE_PASSAGE_INDEX required');
  const index=fs.realpathSync(configured);
  if(index===root||index.startsWith(root+path.sep))throw Error('Passage index must be outside checkout');
  return {url:pathToFileURL(index).href,shortCircuit:true};
 }
 return nextResolve(specifier,context);
}
