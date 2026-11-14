import fs from 'node:fs/promises';
const root=new URL('../',import.meta.url);
const catalog=JSON.parse(await fs.readFile(new URL('atlas/agent-catalog.json',root),'utf8'));
const html=await fs.readFile(new URL('atlas/prepared-reader.html',root),'utf8');
const markdown=await fs.readFile(new URL('atlas/prepared-reader.md',root),'utf8');
const serialized='// Generated, reviewed public publication only. No runtime asset-service dependency.\nexport const ATLAS_BUNDLED_PUBLICATION = Object.freeze('+JSON.stringify({catalog,html,markdown})+');\n';
const file=new URL('content/atlas-bundled-publication.mjs',root);
if(process.argv.includes('--check')){if(await fs.readFile(file,'utf8')!==serialized)throw Error('Bundled publication drift: regenerate after an approved source release');}else await fs.writeFile(file,serialized);
console.log('PASS atomic bundled publication matches current minimized catalog and prepared reader');
