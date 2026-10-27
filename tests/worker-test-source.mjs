// Resolve production dependencies when a test appends exports through a data URL.
export function workerTestSource(source) {
 const base=new URL('../_worker.js',import.meta.url);
 return source.replace(/^import ([^\n]+) from (["'])(\.[^"']+)\2;?$/gm,(_,clause,quote,specifier)=>'import '+clause+' from '+JSON.stringify(new URL(specifier,base).href)+';');
}
