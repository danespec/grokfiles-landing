import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const worker=readFileSync(new URL("../_worker.js",import.meta.url),"utf8");
function mapBody(name){
 const head="const "+name+" = new Map([";
 const start=worker.indexOf(head);
 assert.ok(start>=0,"missing map "+name);
 const end=worker.indexOf("]);",start+head.length);
 assert.ok(end>start,"unterminated "+name);
 return worker.slice(start+head.length,end);
}
const eligible=mapBody("AD_ELIGIBLE_EXACT_PATHS");
const limited=mapBody("AD_LIMITED_RISK_EXACT_PATHS");
const manual=mapBody("AD_MANUAL_REVIEW_EXACT_PATHS");
const protectedPaths=[
 "/investigations/barak-receipts-presence-not-conduct",
 "/investigations/barak-entity-control-layer",
 "/investigations/barak-timeline-without-causation",
 "/investigations/fara-review-signals-not-legal-conclusions"
];
for(const route of protectedPaths) {
 const exact='["'+route+'"';
 assert.ok(manual.includes(exact),"must be manual review: "+route);
 assert.ok(!eligible.includes(exact),"cannot be ad eligible: "+route);
 assert.ok(!limited.includes(exact),"cannot permit limited ads: "+route);
}
assert.ok(worker.includes("adPlacementAllowed = status === AD_ROUTE_STATUS.eligible || status === AD_ROUTE_STATUS.limited"));
assert.ok(worker.includes("return routePolicy(AD_ROUTE_STATUS.manual, AD_MANUAL_REVIEW_EXACT_PATHS.get(path), \"index,follow\")"));
assert.ok(worker.includes("approvedDefault: false"));
assert.ok(worker.includes('return routePolicy(AD_ROUTE_STATUS.exclude, "unclassified-route-ad-excluded"'));
for(const p of ["/photos","/barak/emails","/privacy"]){
 assert.ok(!manual.includes('["'+p+'"'),"previous exclusions must stay excluded");
}
console.log("PASS GAH-ADSENSE-046: 4 sensitive articles held for editorial review, indexable, no placements");
