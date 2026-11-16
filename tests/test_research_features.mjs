import assert from 'node:assert/strict';import {researchFeatureEnabled} from '../content/research-features.mjs';
for(const key of ['passage','neural','exact_cache','reviewed_answers'])assert.equal(researchFeatureEnabled({},key),false);
assert.equal(researchFeatureEnabled({GAH_NEURAL_ENABLED:'true'},'neural'),true);assert.equal(researchFeatureEnabled({GAH_NEURAL_ENABLED:'false'},'neural'),false);assert.equal(researchFeatureEnabled({GAH_NEURAL_ENABLED:'true'},'passage'),false);assert.equal(researchFeatureEnabled({},'arbitrary'),false);
console.log('PASS safe standard-build feature defaults and independent explicit overrides; advanced artifact flags verified during staged build');
