import assert from "node:assert/strict";
import fs from "node:fs";
const html=fs.readFileSync(new URL("../guides/epstein-2007-npa-chronology.html",import.meta.url),"utf8");
for (const phrase of [
  "Document 6-1, Exhibit 1",
  "15 filed pages",
  "three separate signed counterparts of original NPA page 7 of 7",
  "24, 25 and 26",
  "8, 9 and 10 of 15",
  "government's assistant U.S. attorney appears blank",
  "do not establish that the United States failed to execute",
  "Matching the secondary-host file byte-for-byte",
  "remain outstanding",
  "c7bd315dd0f93572d7709675fc4615591f6c6beb736ddb7f59ccdaac4cb8b59d"
]) assert.ok(html.includes(phrase),"missing source guardrail: "+phrase);
assert.ok(html.includes("https://www.justice.gov/multimedia/Court%20Records/United%20States%20v.%20Epstein"));
assert.ok(html.includes("https://www.courthousenews.com/wp-content/uploads/2019/07/Epstein-bail.pdf"));
assert.ok(html.includes("age verification"));
assert.ok(!html.includes("government never signed"));
assert.ok(!html.includes("government signature proven forged"));
console.log("PASS NPA-028 signed-counterpart pagination, source URLs, hash and unverified government-copy caveat");
