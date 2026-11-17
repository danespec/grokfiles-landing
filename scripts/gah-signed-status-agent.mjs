// Operator-only status bot. Key file is provisioned outside the repository.
import {readFile} from 'node:fs/promises';
import {signedStatusRequest} from '../workers/lib/web-bot-auth.mjs';
if(process.argv.length!==3)throw Error('Usage: node scripts/gah-signed-status-agent.mjs /secure/path/to/key.jwk');
const raw=await readFile(process.argv[2],'utf8');
const request=await signedStatusRequest(raw,'https://grokarchivehub.com/api/archive-status');
const response=await fetch(request);if(!response.ok)throw Error('Status request HTTP '+response.status);
console.log(JSON.stringify({ok:true,status:response.status,signature_agent:'https://grokarchivehub.com',signed:true,scope:'public archive status only'}));
