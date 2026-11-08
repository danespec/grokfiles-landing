# AdSense editorial repair — November 8, 2026
Baseline: 295945d (main). No claim that these defects caused Google's rejection.

## Confirmed fresh-response defects
- /archive/ids called EFTA02300238 Barak travel, while its corrected dossier describes Hoffman travel planning.
- EFTA02346686 carried a Barak title and unrelated trip limitations around a Summers invitation summary.
- 29 dossiers copied identical source prose into Claim, Document context and What the record supports.

## Repair
Align the two register labels, navigation and document metadata with their existing source-context notes. Remove the unrelated Barak-trip limitation from the Summers invitation note. Remove only exact duplicate summary sections and claim fields; preserve distinct paragraphs, source links and limits. Add an idempotent normalization step to the existing historical rebuild path.
This is an editorial consistency repair using existing published source reviews, not a new primary-PDF authentication.

## Verification and review boundaries
- Reader regression covers all 69 dossiers and existing ad/consent gates.
- Preservation check compares unique paragraphs, all source/navigation URLs, canonical and policy metadata against baseline.
- Ads remain disabled; no AdSense resubmission is performed.
- AdSense loader with pauseAdRequests=1 is a documented Google mechanism, not proof of a violation.
- Fresh index labels Zuckerberg correctly; an earlier extracted search copy was stale.
- Verified advertising-crawler access requires authentic request logs. Simulated user agents and Search Console availability cannot establish it.
- Private account rejection timing and actual reviewed URLs remain unknown.
- The original build tests required identical seven-section structure; updated checks allow omitted redundant support sections while retaining required source/provenance/limits/navigation sections.
