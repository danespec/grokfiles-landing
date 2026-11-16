# Archive incremental indexing validation — November 16, 2026

Production baseline remains deployment 02378862-ee36-4b4d-86b9-7ce1fe76cf84, commit e3675b2e. The new builder is an offline private operational component; this change does not replace the production Worker or activate unreviewed answers.

## Implemented and tested

scripts/build_archive_vectors_014.py consumes an explicit privacy-cleared public passage manifest. It hashes source bytes and passage bytes separately, reuses unchanged 384-dimensional BGE vectors, normalizes/validates embeddings, discards changed or removed records, and preserves withdrawal tombstones. It never discovers private content, performs OCR or interprets source availability as privacy approval. Output stays outside the checkout with restrictive file permissions. Embeddings contain no copied passage text. The caller supplies the existing private encoder; no infrastructure purchase or new provider account is needed.

Manifest schema/policy is gah.public-archive-passages.v1. Each record needs id, publication_status=public, privacy_approved=true, redactions_preserved=true, policy, source_sha256, passages_sha256, source_file and passages_file. File references must resolve beneath the explicitly authorized private source root. The manifest is a trusted publication-policy input, not a public user API. Future records meeting this contract are included automatically without an additional individual admission gate. A privacy assertion must describe reviewed redacted passages, never unchecked raw PDF text.

Run python3 scripts/build_archive_vectors_014.py with --manifest, --source-root, --output and --encoder, all private paths outside the repository. Index receipts report actual indexed records/passages, exclusions, new embeddings and source bytes read. Source bytes are rehashed on every run; unchanged vectors alone are reused. A corrupt prior snapshot fails closed. Release integration and online archive semantic expansion are not claimed by this offline builder.

## Source reconciliation actually performed

The existing authorized archive SSH connection succeeded. A bounded search of its existing source manifest located twelve of sixty fingerprint-pending dossiers; 37,786,418 bytes were hashed. Two located dossiers matched a previously recorded source-manifest fingerprint. These are local byte corroborations, not new primary-source publication approvals. Twelve located does not imply the remaining 48 are absent from the broader archive.

The full 69-dossier sample still has seven eligible locator records, sixty fingerprint-pending dossiers (five historical candidates and fifty-five unresolved), and two mirror holds. There are zero newly privacy-admitted raw documents or public archive semantic passages. Historical local-availability metadata exists for 43 fingerprint-pending dossiers; it is not a fresh inventory.

## Answers and independent gates

Existing extraction tests verify source-bound quotation support, source changes, packet changes, classifications, withdrawals and privacy rejection. Twenty-four private review packets remain unapproved. No reviewer identity, date or independent approval was invented. The production answer bank remains empty and abstains. Multi-document factual synthesis, chronology and contradiction reasoning remain uncertified and are not activated by this change.

## Cost and rollback

This run purchased no infrastructure. The local hash pass read 37.8 MB; no fresh DOJ fetch or embedding inference was needed for that pass. New builder contract tests use synthetic vectors and incur no provider inference cost. Actual production cost per 1,000 generated answers remains unmeasured because unreviewed generation is disabled.

Production rollback is unchanged: Cloudflare Pages project grokfiles-landing deployment f477e7c8-eb90-4a08-9e4d-c7b8ca155f6e. To reverse the offline builder, revert its source commit; retain withdrawal tombstones and private evidence. Never reinstate withdrawn sources by deleting the prior snapshot.

## Certification limits and operating receipt

Actual additional production archive semantic coverage in this change: zero raw archive documents. Existing seven eligible locator records remain separate from the 104-publication, 6,363-passage editorial index. The sixty pending fingerprints and two mirror holds are not silently admitted. Twelve fresh local byte observations and two historical fingerprint matches do not remove source-mapping and privacy requirements.

GAH-015 review infrastructure and source-bound extraction tests pass, but the existing 24 review packets still have no independent approvals. Production therefore continues to return independent_review_required for unsupported answer requests. No public multi-document synthesis, contradiction resolution, citation-entailment certification or generated-answer latency certification is claimed. Existing source-selection contract tests explicitly distinguish model proposals from reviewed claims.

Validation: 44 archive unit tests passed, including nine new incremental-index tests; 17 reviewed-answer extraction controls passed; generation proposal/source-selection contract tests passed with the existing private passage index. No repeated compatibility benchmark was necessary because online retrieval code did not change. CI is required before merging.

Costs: zero infrastructure purchases, zero new inference calls for this validation, 37,786,418 source bytes read in the bounded archive check. The encoder's new_embeddings receipt measures actual future work, and unchanged records reuse vectors. This is not a total cost-per-1,000-query or throughput certification. Actual online billing and independently graded competitor performance remain uncertified.

Rollback: the offline builder can be reverted independently without changing the production Worker. Keep private evidence and withdrawal tombstones. For an unrelated material production regression, the previously recorded stable Pages rollback is f477e7c8-eb90-4a08-9e4d-c7b8ca155f6e; verify exact identifiers, archive retrieval, publication fingerprints and security controls after promotion. Beta remains because source/privacy admission and independent answer certification are incomplete.
