import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gahPrepareAtlasForBuild} from '../_worker.js';
const root=new URL('../',import.meta.url),raw=await fs.readFile(new URL('atlas.html',root));
const built=await gahPrepareAtlasForBuild(raw.toString('utf8'));
const hash=value=>createHash('sha256').update(value).digest('hex');
const manifest={schema:'gah.atlas.prepared-reader.v1',source_html_sha256:hash(raw),html_sha256:hash(built.html),markdown_sha256:hash(built.markdown),markdown_tokens:Math.max(1,Math.ceil(built.markdown.length/4)),original_tokens:Math.max(1,Math.ceil(built.html.length/4))};
const outputs={'atlas/prepared-reader.html':built.html,'atlas/prepared-reader.md':built.markdown,'content/atlas-prepared-reader.mjs':'// Generated from the published Atlas and current reader transforms.\nexport const ATLAS_PREPARED_READER = Object.freeze('+JSON.stringify(manifest)+');\n'};
for(const [name,value] of Object.entries(outputs)){
 const file=new URL(name,root);
 if(process.argv.includes('--check')){if(await fs.readFile(file,'utf8')!==value)throw Error('Prepared Atlas drift: regenerate '+name);}else await fs.writeFile(file,value);
}
console.log('PASS prepared published Atlas HTML/Markdown, source hash and deterministic build');
