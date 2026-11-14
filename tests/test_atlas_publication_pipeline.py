"""Publication safety, privacy and lineage checks using synthetic records only."""
import copy
import importlib.util
import json
from pathlib import Path
import subprocess
import tempfile
import unittest

root = Path(__file__).resolve().parents[1]
module_spec = importlib.util.spec_from_file_location('pipeline', root / 'scripts/atlas_publication_pipeline.py')
p = importlib.util.module_from_spec(module_spec)
module_spec.loader.exec_module(p)


class PublicationTests(unittest.TestCase):
    def setUp(self):
        self.atlas = {'version': 'v3.84', 'internal_only': False,
                      'privacy_minimized_document_ids': ['EFTA00000003'],
                      'stories': [{'id': '1', 'tier': 'confirmed', 'anchors': ['EFTA00000001 EFTA00000002 EFTA00000003']},
                                  {'id': 'P1', 'tier': 'probable', 'anchors': ['EFTA00000001']}]}
        self.registry = {'entries': [{'id': f'EFTA0000000{i}', 'indexable': True} for i in range(1, 5)]}
        self.a, self.r = p.canonical(self.atlas), p.canonical(self.registry)
        self.spec = {'schema': 'gah.atlas.review-spec.v1', 'revision': 1, 'previous_candidate_sha256': None,
                     'stories': [{'id': '1', 'classification': 'confirmed', 'stopping_point': 'review_incomplete',
                                  'limitations': ['association_not_wrongdoing'], 'citations': [
                                      {'document_id': 'EFTA00000001', 'role': 'supporting_citation'},
                                      {'document_id': 'EFTA00000002', 'role': 'substantive_anchor'}]}],
                     'events': [{'id': 'E1', 'story_id': '1', 'date': '2020-01-01', 'date_precision': 'day',
                                 'classification': 'confirmed', 'limitations': ['content_not_independently_verified'],
                                 'citations': [{'document_id': 'EFTA00000002', 'role': 'substantive_anchor'}]}],
                     'chains': [{'id': 'C1', 'story_id': '1', 'events': ['E1'], 'stopping_point': 'review_incomplete'}],
                     'corrections': []}

    def build(self):
        return p.build(self.a, self.r, self.spec)

    def review(self, candidate):
        return {'schema': 'gah.atlas.review-attestation.v1', 'decision': 'approved',
                'candidate_sha256': p.digest(p.canonical(candidate)),
                'privacy_review': True, 'evidence_roles_review': True, 'chronology_review': True}

    def test_deterministic_roles_reverse_and_no_prose(self):
        first = self.build()
        self.spec['stories'][0]['citations'].reverse()
        self.assertEqual(p.canonical(first), p.canonical(self.build()))
        self.assertEqual(first['document_to_story']['EFTA00000002'][0]['role'], 'substantive_anchor')
        self.assertEqual(first['state'], 'review_pending')
        self.assertNotIn('anchors', first)

    def test_unpublished_atlas_rejected(self):
        self.atlas['internal_only'] = True
        with self.assertRaisesRegex(ValueError, 'unpublished_source'):
            p.build(p.canonical(self.atlas), self.r, self.spec)

    def test_arbitrary_fields_rejected(self):
        self.spec['stories'][0]['victim_name'] = 'PRIVATE_TEST_MARKER'
        with self.assertRaisesRegex(ValueError, 'invalid_fields'):
            self.build()

    def test_privacy_exclusion(self):
        self.spec['stories'][0]['citations'][0]['document_id'] = 'EFTA00000003'
        with self.assertRaisesRegex(ValueError, 'document_not_public'):
            self.build()

    def test_unreviewed_registry_record(self):
        self.registry['entries'][0]['indexable'] = False
        with self.assertRaisesRegex(ValueError, 'document_not_public'):
            p.build(self.a, p.canonical(self.registry), self.spec)

    def test_citation_membership_required(self):
        self.spec['stories'][0]['citations'][0]['document_id'] = 'EFTA00000004'
        with self.assertRaisesRegex(ValueError, 'citation_not_in_published_story'):
            self.build()

    def test_no_automatic_anchor_role(self):
        self.spec['stories'][0]['citations'][0]['role'] = 'automatic'
        with self.assertRaisesRegex(ValueError, 'invalid_evidence_role'):
            self.build()

    def test_no_tier_upgrade(self):
        self.spec['stories'][0]['id'] = 'P1'
        with self.assertRaisesRegex(ValueError, 'unpublished_tier_upgrade'):
            self.build()

    def test_event_requires_consistent_evidence(self):
        self.spec['events'][0]['citations'][0]['role'] = 'supporting_citation'
        with self.assertRaisesRegex(ValueError, 'event_citation_not_in_story'):
            self.build()

    def test_dates_and_endpoints(self):
        self.spec['events'][0].update(date=None, date_precision='unknown')
        with self.assertRaisesRegex(ValueError, 'unknown_date_without_limit'):
            self.build()
        self.spec['events'][0]['limitations'].append('date_uncertain')
        self.spec['chains'][0]['stopping_point'] = 'documented_endpoint'
        with self.assertRaisesRegex(ValueError, 'uncertain_endpoint'):
            self.build()

    def test_chronology_and_cycle_rejected(self):
        self.spec['chains'][0]['events'].append('E1')
        with self.assertRaisesRegex(ValueError, 'invalid_chain_events'):
            self.build()
        event = copy.deepcopy(self.spec['events'][0]);event.update(id='E2', date='2019-01-01')
        self.spec['events'].append(event);self.spec['chains'][0]['events'] = ['E1', 'E2']
        with self.assertRaisesRegex(ValueError, 'chronology_reversed'):
            self.build()

    def test_review_expiry_on_either_source(self):
        candidate = self.build(); review = self.review(candidate)
        self.assertTrue(p.validate_review(candidate, review, self.a, self.r)['review_valid'])
        for a, r in [(self.a + b' ', self.r), (self.a, self.r + b' ')]:
            with self.assertRaisesRegex(ValueError, 'source_publication_changed'):
                p.validate_review(candidate, review, a, r)

    def test_changed_candidate_or_incomplete_review(self):
        candidate = self.build(); review = self.review(candidate)
        candidate['revision'] = 2
        with self.assertRaisesRegex(ValueError, 'candidate_changed'):
            p.validate_review(candidate, review, self.a, self.r)
        candidate = self.build();review = self.review(candidate);review['privacy_review'] = False
        with self.assertRaisesRegex(ValueError, 'incomplete_review'):
            p.validate_review(candidate, review, self.a, self.r)

    def test_review_cannot_approve_extra_fields(self):
        candidate = self.build();candidate['secret'] = 'PRIVATE_TEST_MARKER'
        with self.assertRaisesRegex(ValueError, 'candidate_projection_changed'):
            p.validate_review(candidate, self.review(candidate), self.a, self.r)

    def test_lineage_and_withdrawals(self):
        old = self.build()
        self.spec.update(revision=2, previous_candidate_sha256=p.digest(p.canonical(old)), events=[], chains=[])
        current = self.build()
        with self.assertRaisesRegex(ValueError, 'withdrawal_without_correction'):
            p.changes(old, current)
        self.spec['corrections'] = [{'kind': 'withdraw', 'target_type': 'event', 'target_id': 'E1'},
                                    {'kind': 'withdraw', 'target_type': 'chain', 'target_id': 'C1'}]
        delta = p.changes(old, self.build())
        self.assertEqual(delta['events']['withdrawn'], ['E1'])
        self.assertTrue(delta['review_required'])

    def test_cli_refuses_checkout_output_and_overwrite(self):
        with tempfile.TemporaryDirectory() as directory:
            d = Path(directory)
            for name, value in [('atlas.json', self.atlas), ('registry.json', self.registry), ('spec.json', self.spec)]:
                (d / name).write_bytes(p.canonical(value))
            cmd = ['python3', str(root / 'scripts/atlas_publication_pipeline.py'), 'prepare',
                   '--atlas', str(d / 'atlas.json'), '--registry', str(d / 'registry.json'), '--input', str(d / 'spec.json'), '--output']
            self.assertNotEqual(subprocess.run(cmd + [str(root / 'atlas/unreviewed.json')], capture_output=True).returncode, 0)
            output = d / 'candidate.json'
            self.assertEqual(subprocess.run(cmd + [str(output)], capture_output=True).returncode, 0)
            self.assertEqual(output.stat().st_mode & 0o777, 0o600)
            self.assertNotEqual(subprocess.run(cmd + [str(output)], capture_output=True).returncode, 0)


if __name__ == '__main__':
    unittest.main()
