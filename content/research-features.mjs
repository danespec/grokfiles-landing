import RELEASE from './research-feature-config.mjs';
const names={passage:'GAH_PASSAGE_ENABLED',neural:'GAH_NEURAL_ENABLED',exact_cache:'GAH_EXACT_CACHE_ENABLED',reviewed_answers:'GAH_REVIEWED_ANSWERS_ENABLED'};
export function researchFeatureEnabled(env,key){
 if(!Object.hasOwn(names,key))return false;
 return env&&Object.hasOwn(env,names[key])?String(env[names[key]]).toLowerCase()==='true':RELEASE[key]===true;
}
