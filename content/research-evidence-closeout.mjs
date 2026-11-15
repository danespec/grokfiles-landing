// Public editorial metadata only. No raw document, private index, or claim synthesis.
import MODEL from './research-corpus-010.mjs';
const PUB=new Map(MODEL.documents.map(d=>[d.url,d]));
const sha=/^[a-f0-9]{64}$/;
const eid=/^EFTA[0-9]{8}$/;
const story=/^(?:P)?[0-9]+$/;
const restricted=/\b(?:unredact\w*|passwords?|credentials?|authentication cookies?|session tokens?|administrative (?:api )?token|private\s+(?:nas|intel|records?|files?|data)|restricted evidence|(?:reverse|undo|remove|defeat|reconstruct|recover|bypass).{0,24}redact\w*|(?:victims?|survivors?|witness(?:es)?|minors?|children).{0,40}(?:identit\w*|names?|addresses?|contact|phone|email|locat\w*)|(?:identif\w*|name|locate|dox\w*|reveal).{0,40}(?:victims?|survivors?|witness(?:es)?|minors?|children)|ignore.{0,40}(?:safeguards|instructions|restrictions|privacy rules)|social security|home address|phone number|passport number|date of birth|(?:association|flight.log|passenger entry).{0,30}(?:proof|prove|establish).{0,30}(?:guilt|wrongdoing)|(?:prove|confirm|establish).{0,50}(?:guilt|wrongdoing).{0,35}(?:alone|only|based))\b/i;
export function editorialGuard(q){
 if(restricted.test(q)||/<\/?[a-z][^>]*>/i.test(q)||/\b(?:drop|alter|truncate|delete)\s+(?:table|database|from)\b/i.test(q)||/\.\.\//.test(q))return 'restricted_or_unsupported_request';
 if(/\bBARAK[-_][0-9]+(?:[-_][0-9]+)?\b/i.test(q))return 'unsupported_identifier_namespace';
 if(/\b(?:unknown initials|identified only as [a-z]{2,3}|ambiguous acronym|person or location|which black entity)\b/i.test(q))return 'specify_entity_or_document';
 return null;
}
const admin=[
 [/^(?:open|find|show|browse|locate|take me to) (?:the )?corrections(?: page| hub)?$/i,'/corrections','Corrections'],
 [/^(?:open|find|show|browse|locate) (?:the )?(?:editorial )?methodology(?: page)?$/i,'/methodology','Editorial methodology'],
 [/^(?:open|find|show|browse|locate) (?:the )?investigation(?:s| index)?$/i,'/investigations','Published investigations'],
 [/^(?:(?:open|find|show|locate) (?:the )?(?:versioned publication changes|publication feed|latest bounded editorial register)|which publication hashes changed)$/i,'/api/v1/publications/changes','Versioned publication changes'],
 [/^(?:what atlas revision is actually published|(?:open|show|find|locate) (?:the )?(?:published )?atlas (?:release )?(?:status|version))$/i,'/api/v1/atlas/status','Published Atlas release status'],
 [/^(?:open|find|show|locate) (?:the )?(?:machine )?api documentation$/i,'/openapi.json','Public API documentation']
];
export function administrativeLocator(q,options={}){
 if(Object.keys(options).length)return null;
 const row=admin.find(([r])=>r.test(q.trim().replace(/[?!.]+$/,'')));
 return row?{url:'https://grokarchivehub.com'+row[1],title:row[2],channel:'navigation',score:1,citations:[]}:null;
}
export function citationPacket(result){
 const items=[];
 const seen=new Set();
 for(const row of result.results||[]){
  const d=PUB.get(row.url);
  if(!d||seen.has(d.url)||!sha.test(d.source_sha256)||row.source_sha256!==d.source_sha256)continue;
  seen.add(d.url);
  // Only public editorial bytes are fingerprinted here. Membership is not entailment.
  const membership=(row.related_atlas||[]).filter(x=>x&&eid.test(x.document_id)&&Array.isArray(x.story_ids)&&x.story_ids.every(s=>story.test(s))&&x.relation==='reviewed_citation_membership_only').map(x=>({document_id:x.document_id,story_ids:[...new Set(x.story_ids)],relation:'reviewed_citation_membership_only'}));
  items.push({url:d.url,title:d.title,publication_sha256:d.source_sha256,publication_date:d.publication_date??null,document_type:d.document_type,scope:'published_editorial_locator',claim_entailment:'not_verified',reviewed_atlas_membership:membership});
 }
 return {schema:'gah.research.citation-packet.v1',version:result.version,status:items.length?'citation_candidates':'no_editorial_citations',items,claim_verification:'not_performed',generated_claims:0,scope:'Editorial publication fingerprints, not primary-source authenticity or claim verification.'};
}
