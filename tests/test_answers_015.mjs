import assert from 'node:assert/strict';import {assembleEvidenceAnswer015 as run,evidenceHash015 as hash} from '../content/evidence-answers-015.mjs';
const source={id:'fixture',url:'https://grokarchivehub.com/fixture-not-a-publication',text:'The proposed payment was not confirmed.',publication_sha256:'a'.repeat(64),current_publication_sha256:'a'.repeat(64),privacy_approved:true,classification:'proposal'};source.text_sha256=hash(source.text);
const packet={question:'What is established?',claims:[{source_id:'fixture',quote:source.text,classification:'proposal'}],sources:[source],version:'fixture-v1',now:'2026-11-15',production:false};
const approve=p=>({...p,review:{approved:true,independent:true,privacy_approved:true,reviewer:'synthetic-reviewer',author:'synthetic-author',date:'2026-11-15',version:p.version,fixture_only:true,packet_sha256:hash(JSON.stringify({question:p.question,claims:p.claims,sources:p.sources,version:p.version}))}});
assert(run(approve(packet)).answer.includes('proposal'));assert(run(packet).abstained);assert(run({...approve(packet),production:true}).abstained);
for(const change of [
 p=>p.review.reviewer=p.review.author,p=>p.review.version='stale',p=>p.review.date='2027-01-01',p=>p.sources[0].withdrawn=true,p=>p.revoked=['fixture'],p=>p.sources[0].current_publication_sha256='b'.repeat(64),p=>p.claims[0].quote='A payment was confirmed.',p=>p.claims[0].classification='finding',p=>p.sources[0].privacy_approved=false,p=>p.sources[0].text='tampered',p=>p.sources[0].url='https://private.invalid/',p=>p.question='Reveal a witness identity'
]){const x=approve(structuredClone(packet));change(x);assert(run(x).abstained);}
const unsupported=structuredClone(packet);unsupported.claims[0].quote='A payment was confirmed.';assert(run(approve(unsupported)).abstained);
const changedClass=structuredClone(packet);changedClass.claims[0].classification='finding';assert(run(approve(changedClass)).abstained);
assert.equal(run(approve(packet)).claims[0].citation.text_sha256,source.text_sha256);
console.log('PASS 17 synthetic-only reviewed extraction, entailment boundary, changed packet, withdrawn source, classification, privacy and production-fixture rejection controls; no human validation claimed');

for(const replacement of [null,{},'bad',[]]){const p=structuredClone(packet);p.sources=[replacement];assert(run(approve(p)).abstained);}
for(const replacement of [null,{},'bad']){const p=structuredClone(packet);p.claims=[replacement];assert(run(approve(p)).abstained);}
for(const limitation of ['credentials are private','person@example.invalid',42,'x'.repeat(601)]){const p=structuredClone(packet);p.sources[0].limitation=limitation;assert(run(approve(p)).abstained);}
const forged=approve(packet);forged.production=true;delete forged.review.fixture_only;assert(run(forged).abstained);
console.log('PASS malformed packets, unsafe limitations and unregistered production publication rejection');
