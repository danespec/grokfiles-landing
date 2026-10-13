import assert from "node:assert/strict";
import fs from "node:fs";

const articles=[
  ["investigations/efta-compliance-tracker.html",["DOJ's July 30 in-camera submission","rulings not yet in the acquired record"],true],
  ["investigations/new-mexico-doj-epstein-records.html",["New Mexico DOJ's Epstein records request","unresolved questions"],true],
  ["evidence-briefs/todd-blanche-no-evidence.html",["scope-limited Senate answer","Association is not guilt"],true],
  ["guides/epstein-2007-draft-federal-indictment.html",["EFTA01703108","53-page accounts","60-count proposal"],false],
];
const root=new URL("../",import.meta.url);
const parse=(head,tag,attribute)=>{
 const match=head.match(new RegExp('<meta '+attribute+'="'+tag+'" content="([^"]+)"','i'));
 assert.ok(match,'Missing '+tag+' metadata');
 return match[1];
};
for(const [file,required,hasSocial] of articles){
 const html=fs.readFileSync(new URL(file,root),"utf8");
 const head=html.split("</head>")[0];
 const description=parse(head,"description","name");
 assert.ok(description.length>=90 && description.length<=170,
  file+" description not succinct or appears cut off: "+description.length);
 assert.ok(/[.!?]$/.test(description),"Description must end in complete sentence");
 for(const phrase of required) assert.ok(description.includes(phrase),
   file+" missing source-bound qualifier: "+phrase);
 assert.ok(/<title>.+<\/title>/i.test(head),"Unique article title remains");
 assert.ok(/rel="canonical"/i.test(head),"Canonical remains");
 assert.ok(/<h1[^>]*>.+<\/h1>/i.test(html),"Article heading remains");
 if(hasSocial){
  assert.equal(parse(head,"og:description","property"),description,file+" Open Graph mismatch");
  assert.equal(parse(head,"twitter:description","name"),description,file+" Twitter mismatch");
 }
}
console.log("PASS GAH-SEO-031: four complete and source-bounded public metadata summaries");
