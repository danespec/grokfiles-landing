// Fix-pack metadata-only rebind: IDs, locators and relationships unchanged; no new factual certification.
// Explicit review of public citation membership, not a factual or guilt finding.
// Source: published Atlas v3.117 (unchanged previously reviewed memberships) + existing identifier registry + live HTML canonical checks.
// Any Atlas byte change invalidates the entire reviewed projection.
// The immutable retrieval models still identify v3.82; this exact reviewed
// v3.117 rebind preserves the existing citation memberships, not new edges.
export const ATLAS_GRAPH_MODEL_REBIND = Object.freeze({
  model_publication_sha256:"ab1a5c339cc025ea50b1b9d430f11ab699273aadc4a5777440ffb25002375760",
  published_data_sha256:"17cac59178c8aea5250b4e29935bbd749b7d3d9235053bd5646aaaf09874c694",
  published_registry_sha256:"eb6c72e5a1660d0233a6a5a637e3b3d4517f829e2356c637ff464752accda638"
});
export const ATLAS_GRAPH_REVIEW = Object.freeze({
  published_data_sha256:"17cac59178c8aea5250b4e29935bbd749b7d3d9235053bd5646aaaf09874c694",
  published_registry_sha256:"eb6c72e5a1660d0233a6a5a637e3b3d4517f829e2356c637ff464752accda638",
  stories:Object.freeze([
    Object.freeze({id:"3",document_ids:Object.freeze(["EFTA00022062","EFTA02731082"])}),
    Object.freeze({id:"13",document_ids:Object.freeze(["EFTA00356456"])}),
    Object.freeze({id:"P4",document_ids:Object.freeze(["EFTA02730996","EFTA02731023"])}),
    Object.freeze({id:"P13",document_ids:Object.freeze(["EFTA00022062"])}),
    Object.freeze({id:"P15",document_ids:Object.freeze(["EFTA00016622"])})
  ]),
  editorial_paths:Object.freeze({
    EFTA00016622:"/reels/indyke-kahn-civil-complaint-flight-records",
    EFTA00022062:"/reels/andrew-doj-judicial-review-efta00088020",
    EFTA00356456:"/investigations/barak-st-thomas-dec-2014",
    EFTA02730996:"/reels/leon-black-dechert-158-million-efta02730996",
    EFTA02731023:"/reels/leon-black-dechert-158-million-efta02730996",
    EFTA02731082:"/reels/les-wexner-attorney-proffer-efta02731082"
  })
});
