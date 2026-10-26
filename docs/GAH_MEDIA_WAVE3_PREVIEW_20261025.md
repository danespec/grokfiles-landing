# Media catalog wave 3 — preview receipts

Three new reel pages; production is unchanged until Thomas authorizes deployment.

| Route | Source receipts | Sections / schema / discovery |
|---|---|---|
| /reels/larry-summers-harvard-planning-efta02239873 | EFTA02239873; EFTA02239649 | Full original caption, analysis, receipts, limits, questions, source trail; Article required fields parsed; generated sitemap and inbound links |
| /reels/reid-hoffman-island-logistics-efta02300238 | EFTA02300238 | Full original caption, analysis, receipts, limits, questions, source trail; Article required fields parsed; generated sitemap and inbound links |
| /reels/steve-bannon-barak-calendar-efta02240144 | EFTA02240144 | Full original caption, analysis, receipts, limits, questions, source trail; Article required fields parsed; generated sitemap and inbound links |

Each page has its own named /entities fragment and links from /topics, /latest and /reels. All four public archive records and all three original Instagram posts returned 200 on October 25. Captions and HTML hashes saved in evidence-data/media-wave3/captions.json. Existing routes and source publications were checked for duplicates before adding records; no existing reel page was found. The pages link existing archive sources rather than inventing full investigations. Shared document/text card; no real-person images.

Editorial limits: Summers emails are scheduling, not a meeting confirmation. The caption's historical Harvard funding context is attributed and not independently substantiated by those scheduling documents. Hoffman email is departure coordination, not boarding proof; its caption's earlier Vancouver itinerary and 2019 statement remain separately attributed, with primary records explicitly listed as open. Bannon dinner/breakfast entries are plans, not attendance. Corpus counts are attributed original-publication search findings, not meetings, contacts or wrongdoing. No new criminal allegation is made.

Checks passed: actual Worker integration for all 13 media pages, 2 hubs, sitemap membership and uniqueness, exact full captions, metadata, indexability, JSON-LD parsing and required fields, source anchors, generated entity links, narrow video CSP and held/draft exclusions; original St. Thomas eight-section regression; 20 staging checks; generator idempotency; git diff --check. Public HTTP 200 for the three new routes and post-deploy sitemap lines remain pending production approval. Third-party rich-results validation and Google indexing are not certified.

Live discovery audit: main sitemap currently 169 URLs. Apex homepage 200 and self-canonical; wiki homepage 200 and already canonicalizes to the apex. Files homepage 200 and self-canonical as a separate file-host service. Do not redirect every subdomain or claim a canonical guarantees Google's selection. Ren's reported rankings were not independently reproduced in a controlled location/device search. GSC subscription remains unavailable; no performance numbers or ranking movement claimed. Full remaining catalog and transcripts are still pending.

Preview-only release: Thomas reviews the protected preview, then explicitly authorizes production. On deploy verify public routes, source/social/card links, sitemap entries, incoming navigation and indexing headers.
