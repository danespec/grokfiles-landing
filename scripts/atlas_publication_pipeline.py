"""Offline graph review packages. Never writes a public asset or contacts a service."""
import argparse
import datetime as dt
import hashlib
import json
import re
from pathlib import Path

SCHEMA = 'gah.atlas.review-candidate.v1'
MAX_ROWS = 10000
STOPS = {'source_ends', 'missing_record', 'unresolved_chronology', 'review_incomplete', 'documented_endpoint'}
LIMITS = {'citation_membership_only', 'content_not_independently_verified', 'redactions_preserved',
          'date_uncertain', 'incomplete_chain', 'association_not_wrongdoing'}


def require(ok, code):
    if not ok:
        raise ValueError(code)


def canonical(value):
    return (json.dumps(value, sort_keys=True, separators=(',', ':'), ensure_ascii=True) + '\n').encode()


def digest(raw):
    return hashlib.sha256(raw).hexdigest()


def keys(obj, required, optional=()):
    require(isinstance(obj, dict) and set(required) <= set(obj) <= set(required) | set(optional), 'invalid_fields')


def rows(value):
    require(isinstance(value, list) and len(value) <= MAX_ROWS, 'invalid_row_count')
    return value


def build(atlas_raw, registry_raw, spec):
    """Only project explicit machine fields; never infer evidence roles from anchors."""
    atlas, registry = json.loads(atlas_raw), json.loads(registry_raw)
    require(atlas.get('internal_only') is False, 'unpublished_source')
    require(bool(re.fullmatch(r'v[0-9]+(?:\.[0-9]+)*', atlas.get('version', ''))), 'invalid_version')
    keys(spec, {'schema', 'revision', 'previous_candidate_sha256', 'stories', 'events', 'chains', 'corrections'})
    require(spec['schema'] == 'gah.atlas.review-spec.v1', 'invalid_schema')
    require(type(spec['revision']) is int and spec['revision'] >= 1, 'invalid_revision')
    previous = spec['previous_candidate_sha256']
    require((spec['revision'] == 1 and previous is None) or
            (spec['revision'] > 1 and isinstance(previous, str) and bool(re.fullmatch('[a-f0-9]{64}', previous))), 'invalid_lineage')
    source_stories = {s['id']: s for s in atlas['stories']}
    require(len(source_stories) == len(atlas['stories']), 'duplicate_source_story')
    public = {r['id'] for r in registry['entries'] if r.get('indexable') is True}
    excluded = set(atlas.get('privacy_minimized_document_ids', []))
    selected, documents, event_map = {}, {}, {}

    def citation(c, sid):
        keys(c, {'document_id', 'role'})
        doc, role = c['document_id'], c['role']
        require(isinstance(doc, str) and bool(re.fullmatch('EFTA[0-9]{8}', doc)), 'invalid_document')
        require(role in {'substantive_anchor', 'supporting_citation'}, 'invalid_evidence_role')
        require(doc in public and doc not in excluded, 'document_not_public')
        mentions = {d for text in source_stories[sid].get('anchors', []) for d in re.findall(r'\bEFTA[0-9]{8}\b', text)}
        require(doc in mentions, 'citation_not_in_published_story')
        documents[doc] = {'id': doc, 'archive_url': 'https://grokarchivehub.com/archive/' + doc}
        return {'document_id': doc, 'role': role}

    def citations(value, sid):
        result = [citation(c, sid) for c in rows(value)]
        require(len({c['document_id'] for c in result}) == len(result), 'duplicate_citation')
        return sorted(result, key=lambda c: c['document_id'])

    def classification(value, sid):
        require(value in {'confirmed', 'probable', 'incomplete'}, 'invalid_classification')
        require(value != 'confirmed' or source_stories[sid]['tier'] == 'confirmed', 'unpublished_tier_upgrade')
        return value

    def limitations(value):
        require(isinstance(value, list) and value and all(isinstance(x, str) and x in LIMITS for x in value), 'missing_or_invalid_limits')
        require(len(set(value)) == len(value), 'duplicate_limits')
        return sorted(value)

    for story in rows(spec['stories']):
        keys(story, {'id', 'classification', 'citations', 'stopping_point', 'limitations'})
        sid = story['id']
        require(isinstance(sid, str) and sid in source_stories and sid not in selected, 'invalid_story')
        require(story['stopping_point'] in STOPS, 'invalid_stopping_point')
        selected[sid] = {'id': sid, 'classification': classification(story['classification'], sid),
                         'citations': citations(story['citations'], sid), 'stopping_point': story['stopping_point'],
                         'limitations': limitations(story['limitations'])}
    for event in rows(spec['events']):
        keys(event, {'id', 'story_id', 'date', 'date_precision', 'classification', 'citations', 'limitations'})
        eid, sid = event['id'], event['story_id']
        require(isinstance(eid, str) and bool(re.fullmatch('E[1-9][0-9]{0,8}', eid)) and eid not in event_map, 'invalid_event')
        require(sid in selected, 'unknown_event_story')
        date, precision = event['date'], event['date_precision']
        require(precision in {'day', 'unknown'}, 'invalid_date_precision')
        require((precision == 'unknown' and date is None) or
                (precision == 'day' and isinstance(date, str) and bool(re.fullmatch(r'\d{4}-\d{2}-\d{2}', date))), 'invalid_date')
        if precision == 'day':
            dt.date.fromisoformat(date)
        evidence = citations(event['citations'], sid)
        require(bool(evidence), 'event_without_citation')
        require(all(c in selected[sid]['citations'] for c in evidence), 'event_citation_not_in_story')
        lim = limitations(event['limitations'])
        require(precision != 'unknown' or 'date_uncertain' in lim, 'unknown_date_without_limit')
        event_map[eid] = {'id': eid, 'story_id': sid, 'date': date, 'date_precision': precision,
                          'classification': classification(event['classification'], sid), 'citations': evidence, 'limitations': lim}
    chains, chain_ids = [], set()
    for chain in rows(spec['chains']):
        keys(chain, {'id', 'story_id', 'events', 'stopping_point'})
        cid, sid = chain['id'], chain['story_id']
        require(isinstance(cid, str) and bool(re.fullmatch('C[1-9][0-9]{0,8}', cid)) and cid not in chain_ids, 'invalid_chain')
        chain_ids.add(cid)
        require(sid in selected and chain['stopping_point'] in STOPS, 'invalid_chain_story_or_stop')
        events = rows(chain['events'])
        require(events and all(isinstance(e, str) and e in event_map for e in events) and len(set(events)) == len(events), 'invalid_chain_events')
        require(all(event_map[e]['story_id'] == sid for e in events), 'cross_story_chain')
        dates = [event_map[e]['date'] for e in events if event_map[e]['date'] is not None]
        require(dates == sorted(dates), 'chronology_reversed')
        require(all(event_map[e]['date'] is not None for e in events) or chain['stopping_point'] != 'documented_endpoint', 'uncertain_endpoint')
        chains.append({'id': cid, 'story_id': sid, 'events': events, 'stopping_point': chain['stopping_point']})
    corrections = []
    for correction in rows(spec['corrections']):
        keys(correction, {'kind', 'target_type', 'target_id'})
        require(correction['kind'] in {'withdraw', 'replace', 'reclassify', 'citation_fix'}, 'invalid_correction')
        target_type, target = correction['target_type'], correction['target_id']
        patterns = {'story': r'P?[1-9][0-9]{0,5}', 'event': r'E[1-9][0-9]{0,8}', 'chain': r'C[1-9][0-9]{0,8}'}
        require(target_type in patterns and isinstance(target, str) and bool(re.fullmatch(patterns[target_type], target)), 'invalid_correction_target')
        corrections.append(dict(correction))
    stories = sorted(selected.values(), key=lambda x: x['id'])
    reverse = {}
    for story in stories:
        for c in story['citations']:
            reverse.setdefault(c['document_id'], []).append({'story_id': story['id'], 'role': c['role']})
    return {'schema': SCHEMA, 'state': 'review_pending', 'revision': spec['revision'],
            'previous_candidate_sha256': previous, 'atlas_version': atlas['version'],
            'published_data_sha256': digest(atlas_raw), 'published_registry_sha256': digest(registry_raw),
            'stories': stories, 'documents': sorted(documents.values(), key=lambda x: x['id']),
            'events': sorted(event_map.values(), key=lambda x: x['id']), 'chains': sorted(chains, key=lambda x: x['id']),
            'document_to_story': reverse, 'corrections': sorted(corrections, key=lambda x: canonical(x)),
            'limitations': ['association_not_wrongdoing', 'redactions_preserved', 'review_required_before_publication']}


def validate_review(candidate, review, atlas_raw, registry_raw):
    keys(review, {'schema', 'candidate_sha256', 'decision', 'privacy_review', 'evidence_roles_review', 'chronology_review'})
    require(candidate.get('schema') == SCHEMA and candidate.get('state') == 'review_pending', 'invalid_candidate')
    require(review['schema'] == 'gah.atlas.review-attestation.v1' and review['decision'] == 'approved', 'review_required')
    require(all(review[x] is True for x in ['privacy_review', 'evidence_roles_review', 'chronology_review']), 'incomplete_review')
    require(review['candidate_sha256'] == digest(canonical(candidate)), 'candidate_changed')
    require(candidate['published_data_sha256'] == digest(atlas_raw) and
            candidate['published_registry_sha256'] == digest(registry_raw), 'source_publication_changed')
    # Rebuild from the candidate projection: approval alone cannot waive safety validation.
    spec = {k: candidate[k] for k in ['revision', 'previous_candidate_sha256', 'stories', 'events', 'chains', 'corrections']}
    spec['schema'] = 'gah.atlas.review-spec.v1'
    require(build(atlas_raw, registry_raw, spec) == candidate, 'candidate_projection_changed')
    return {'schema': 'gah.atlas.release-validation.v1', 'candidate_sha256': review['candidate_sha256'],
            'atlas_version': candidate['atlas_version'], 'review_valid': True, 'publication_activated': False}


def changes(previous, current):
    """Machine-only change set for two separately reviewed candidates; no publication side effect."""
    require(previous['schema'] == current['schema'] == SCHEMA, 'invalid_schema')
    require(current['revision'] == previous['revision'] + 1 and
            current['previous_candidate_sha256'] == digest(canonical(previous)), 'lineage_mismatch')
    result = {'schema': 'gah.atlas.change-set.v1', 'from_sha256': digest(canonical(previous)),
              'to_sha256': digest(canonical(current)), 'review_required': True}
    for kind in ['stories', 'events', 'chains']:
        a, b = ({x['id']: x for x in v[kind]} for v in [previous, current])
        result[kind] = {'added': sorted(b.keys() - a.keys()), 'withdrawn': sorted(a.keys() - b.keys()),
                        'changed': sorted(k for k in a.keys() & b.keys() if a[k] != b[k])}
        target_type = {'stories': 'story', 'events': 'event', 'chains': 'chain'}[kind]
        for target in result[kind]['withdrawn']:
            require(any(c['target_type'] == target_type and c['target_id'] == target and c['kind'] == 'withdraw'
                        for c in current['corrections']), 'withdrawal_without_correction')
    return result


def read_json(path):
    require(path.stat().st_size <= 8 * 1024 * 1024, 'input_too_large')
    return json.loads(path.read_bytes())


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('command', choices=['prepare', 'check-review', 'changes'])
    parser.add_argument('--atlas', type=Path, required=True)
    parser.add_argument('--registry', type=Path, required=True)
    parser.add_argument('--input', type=Path, required=True)
    parser.add_argument('--review', type=Path)
    parser.add_argument('--previous', type=Path)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[1]
    require(not args.output.resolve().is_relative_to(root), 'output_must_be_outside_checkout')
    for path in [args.atlas, args.registry]:
        require(path.stat().st_size <= 8 * 1024 * 1024, 'input_too_large')
    atlas, registry = args.atlas.read_bytes(), args.registry.read_bytes()
    value = read_json(args.input)
    if args.command == 'prepare':
        result = build(atlas, registry, value)
    elif args.command == 'check-review':
        require(args.review is not None, 'review_required')
        result = validate_review(value, read_json(args.review), atlas, registry)
    else:
        require(args.previous is not None, 'previous_required')
        result = changes(read_json(args.previous), value)
    require(not args.output.exists(), 'output_exists')
    # Exclusive create prevents accidentally overwriting a prior reviewed package.
    with args.output.open('xb') as f:
        f.write(canonical(result))
    args.output.chmod(0o600)
    print(json.dumps({'schema': result['schema'], 'sha256': digest(canonical(result)), 'publication_activated': False}))


if __name__ == '__main__':
    main()
