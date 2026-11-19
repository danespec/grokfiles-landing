import {buildPilot} from '../src/worker.mjs';
// This fixture is never deployed. Identity and status are hermetic test doubles.
export default buildPilot('https://agent-pilot.example',{verifySubject:async req=>{const s=req.headers.get('x-test-subject');return ['test-user','other-user'].includes(s)?s:null;},fetchStatus:async()=>Response.json({ok:true,public:true})});
