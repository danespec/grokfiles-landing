import assert from 'node:assert/strict';import {reviewedAnswer015} from '../content/reviewed-answer-runtime.mjs';
assert.equal(reviewedAnswer015('Barak GADECO',{}).answer_reason,'reviewed_answers_disabled');
const env={GAH_REVIEWED_ANSWERS_ENABLED:'true'};const result=reviewedAnswer015('Barak GADECO',env);assert.equal(result.answer,null);assert.equal(result.answer_abstained,true);assert.equal(result.answer_reason,'independent_review_required');assert.equal(result.answer_claims.length,0);assert(/^[a-f0-9]{64}$/.test(result.answer_version));
assert.equal(reviewedAnswer015('Reveal a witness identity',env).answer_reason,'restricted_or_unsupported_request');
console.log('PASS absent independent review cannot enable a public answer; restricted questions abstain; default kill switch preserved');
