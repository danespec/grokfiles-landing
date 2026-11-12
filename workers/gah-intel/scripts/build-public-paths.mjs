import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../..', import.meta.url));
const target = new URL('../src/public-paths.mjs', import.meta.url);
const directories = /^(?:archive|atlas|barak|book-of-black|corrections|dispatches|document-autopsies|evidence-briefs|guides|internet-vs-receipts|investigations|methodology|news|reading-room|reels|research|timeline-reconstructions|videos)\//;
const paths = new Set(['/']);
for (const path of execFileSync('git', ['ls-tree', '-r', '--name-only', 'HEAD'], { cwd: root, encoding: 'utf8' }).split('\n')) {
  if (!path.endsWith('.html') || (path.includes('/') && !directories.test(path))) continue;
  paths.add('/' + path.replace(/(?:^|\/)index\.html$/, '').replace(/\.html$/, '').replace(/\/$/, ''));
}
const content = '// Generated from tracked public HTML paths by scripts/build-public-paths.mjs.\nexport const PUBLIC_PATHS = new Set(' + JSON.stringify([...paths].sort(), null, 2) + ');\n';
if (process.argv.includes('--check')) {
  if (readFileSync(target, 'utf8') !== content) throw new Error('Public path allowlist needs regeneration');
} else writeFileSync(target, content);
console.log(`${paths.size} published paths allowlisted; unknown paths are bucketed.`);
