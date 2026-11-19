import {buildPublicAgent,AgentRegistry} from '../src/public-agent.mjs';
export {AgentRegistry};
export default buildPublicAgent('https://agent-pilot.example',{fetchStatus:async()=>Response.json({ok:true,public:true})});
