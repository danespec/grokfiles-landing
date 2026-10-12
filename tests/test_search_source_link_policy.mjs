import fs from 'node:fs';
import assert from 'node:assert/strict';
const js = fs.readFileSync(new URL('../assets/v3-newsletter-062.js', import.meta.url), 'utf8');
const pickSource = js.slice(js.indexOf('  function pick(obj, keys) {'), js.indexOf('  function sourceHrefForResult(row) {'));
const hrefSource = js.slice(js.indexOf('  function sourceHrefForResult(row) {'), js.indexOf('  function initSearch() {'));
assert.ok(pickSource.includes('function pick('), 'pick helper located');
assert.ok(hrefSource.includes('function sourceHrefForResult('), 'policy helper located');
const sourceHrefForResult = new Function(`${pickSource}\n${hrefSource}\nreturn sourceHrefForResult;`)();
const scenarios = [
  [{id:'EFTA00000001',read_url:'/archive/EFTA00000001'},'/archive/EFTA00000001','verified source link is preserved'],
  [{id:'GAH-INV-1',read_url:'/investigations/verified-audit'},'/investigations/verified-audit','editorial source links preserved'],
  [{id:'EFTA99999999',missing:true,read_url:'/archive/EFTA99999999'},'','missing record never receives a link'],
  [{id:'BARAK-EML-001',result_type:'missing_record',read_url:'/archive/BARAK-EML-001'},'','cross-index missing record never receives a link'],
  [{id:'EFTA00000001',unverified:true,url:'/archive/EFTA00000001'},'','unverified flag defeats supplied URL'],
  [{id:'EFTA00000001',verified:false,pdf_url:'/archive/EFTA00000001'},'','explicit false verification defeats supplied URL'],
  [{id:'EFTA00000001',verification_status:'UNVERIFIED',read_url:'/archive/EFTA00000001'},'','unverified status defeats supplied URL'],
  [{id:'EFTA00000001',read_url:'/Volumes/homes/admin/source.pdf'},'','internal path suppressed'],
  [{id:'EFTA00000001',read_url:'/volume1/homes/admin/source.pdf'},'','NAS volume path suppressed'],
  [{id:'EFTA00000001'},'','identifier alone does not create source link']
];
for (const [row,expected,label] of scenarios) {
  assert.equal(sourceHrefForResult(row),expected,label);
  console.log('PASS',label);
}
assert.ok(!js.includes('if (!href && /^EFTA[0-9]{8}$/i.test(id)) href = "/archive/"'), 'no automatic EFTA link fallback');
assert.ok(!js.includes('if (!found) addResult(wanted, "Exact archive identifier route.'), 'no synthesized exact-ID route');
assert.ok(!js.includes('addResult("Source-grounded summary", answer,'), 'no answer-only source summary card');
assert.ok(js.includes('No verified source file was returned') || js.includes('no verified source record'), 'clear missing record notice');
console.log('PASS all 14 search source-link checks');
