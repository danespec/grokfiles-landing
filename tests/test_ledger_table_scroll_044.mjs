import assert from "node:assert/strict";
import fs from "node:fs";
const html=fs.readFileSync(new URL("../investigations/black-family-partners-18m-to-5-5m-repricing.html",import.meta.url),"utf8");
const style='<style data-gah-ledger-scroll-044>.table-scroll{max-width:100%;overflow-x:auto;overscroll-behavior-x:contain;-webkit-overflow-scrolling:touch;}</style>';
assert.ok(html.includes(style),"one scoped horizontal table-scrolling rule");
assert.equal(html.split(style).length,2,"no duplicate style injection");
const wrappers=[...html.matchAll(/<div class="table-scroll"[^>]*>/g)].map(x=>x[0]);
assert.equal(wrappers.length,2,"both source ledger tables available");
assert.ok(wrappers.every(x=>x.includes('tabindex="0"')&&x.includes('role="region"')&&x.includes('aria-label="')),"keyboard-focusable accessible regions");
assert.ok(wrappers[0].includes("Draft and closing allocation"));
assert.ok(wrappers[1].includes("Claim, source and evidence"));
assert.equal((html.match(/<table class="ledger-table"/g)||[]).length,2,"no table removed");
for(const number of ["$18,000,000","$5,500,000","$7,793,608","$3,496,424"]){
 assert.ok(html.includes(number),"source financial value preserved: "+number);
}
assert.ok(html.includes("Source")&&html.includes("Limit"),"claim/source/limit table remains visible");
console.log("PASS GAH-LEDGER-044: both original financial tables retained inside labeled focusable horizontal scrollers");
