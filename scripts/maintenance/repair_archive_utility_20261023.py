#!/usr/bin/env python3
"""Replace only the automatic archive renderer; preserve unrelated runtime fixes.

Usage: repair_archive_utility_20261023.py INPUT OUTPUT
Reviewed static source cards and banking data are not modified.
"""
import sys
from pathlib import Path

JSONLD = r'''function archiveDossierJsonLdV2(profile, canonical, description) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: `${profile.clean} Archive Record`,
    description,
    url: canonical,
    publisher: { '@type': 'Organization', name: 'Grok Archive Hub' },
    isAccessibleForFree: true
  };
  return `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`;
}
'''

BODY = r'''function archiveEvidenceDossierHtmlV2(profile, accessLinks, excerptSection) {
  // GAH-ARCHIVE-UTILITY-QUALITY-20261023: a source-access page, not an article.
  const related = archiveRelatedIds(profile.ocrRaw || '', profile.clean, 12);
  const relatedSection = related.length ? [
    '<section aria-labelledby="connected-records-heading" class="evidence-dossier-section">',
    '<h2 id="connected-records-heading">Identifiers mentioned in the OCR</h2>',
    '<p>These links come from identifier strings in the extracted text; they do not establish a relationship between people or events.</p>',
    '<ul>',
    ...related.map(id => `<li><a href="/archive/${encodeURIComponent(id)}">${escapeHtml(id)}</a></li>`),
    '</ul></section>'
  ].join('\n') : '';
  return [
    '<section aria-labelledby="record-identity-heading" class="evidence-dossier-section">',
    '<h2 id="record-identity-heading">Record details and source access</h2>',
    '<table class="dossier-table"><tbody>',
    archiveSourceBackedRowsHtmlV1(profile),
    '</tbody></table>',
    '<div class="access-links">', ...accessLinks, '</div>',
    '</section>',
    excerptSection,
    relatedSection,
    '<section aria-labelledby="record-limits-heading" class="evidence-dossier-section">',
    '<h2 id="record-limits-heading">About this archive record</h2>',
    '<p>This page displays source-file metadata and available extracted text. It is an automatic access record, not a separately researched account of the document. OCR may be incomplete or inaccurate; check the source image or PDF. A file timestamp describes the stored artifact, not the event date or an editorial review.</p>',
    '<p>A name appearing in a document does not by itself establish wrongdoing. For contextual reporting, visit the <a href="https://grokarchivehub.com/investigations">investigations</a> or <a href="https://grokarchivehub.com/archive">reviewed source dossiers</a>.</p>',
    `<p><a href="https://grokarchivehub.com/corrections">Report a correction</a> and include record ${escapeHtml(profile.clean)} and the relevant source page.</p>`,
    '</section>'
  ].join('\n');
}
'''

def replace_function(text, name, replacement):
    start = text.index('function ' + name + '(')
    end = text.index('\nfunction ', start + 1)
    return text[:start] + replacement.rstrip() + '\n' + text[end:]

def once(text, before, after):
    if text.count(before) != 1:
        raise ValueError('Expected one match: ' + before[:100])
    return text.replace(before, after, 1)

def repair(text):
    if 'GAH-ARCHIVE-UTILITY-QUALITY-20261023' in text:
        raise ValueError('Already patched')
    text = replace_function(text, 'archiveDossierJsonLdV2', JSONLD)
    text = replace_function(text, 'archiveEvidenceDossierHtmlV2', BODY)
    start = text.index('function archivePageHtmlV1(')
    end = text.index('\nfunction ', start + 1)
    page = text[start:end]
    page = once(page, "const source = profile.hasOcrFile ?", "const source = profile.hasOcrFile && profile.ocrExcerpt ?")
    page = once(page, '`${profile.clean} Evidence Dossier | Grok Archive Hub`', '`${profile.clean} Archive Record | Grok Archive Hub`')
    page = once(page, "  const updated = archiveEditorialUpdatedDateV2(profile);\n", '')
    page = once(page, "  const adEligible = archiveQualityClassV1(profile) === 'A_SUBSTANTIVE_INDEX_WORTHY';", "  const adEligible = false;")
    page = once(page, "  const robotsMeta = bankRec\n    ? (bankRec.indexing_policy === 'indexable' ? 'index,follow' : 'noindex,follow')\n    : 'index,follow';", "  const robotsMeta = 'noindex,follow';")
    page = once(page, "    `<meta name=\"grok-ad-policy\" content=\"${adEligible ? 'editorial-evidence-dossier-eligible-no-live-ads' : 'ad-excluded-thin-or-sensitive-source-route'}\">`,", "    '<meta name=\"grok-ad-policy\" content=\"ad-excluded-automatic-source-record\">',")
    page = once(page, '    `<meta property="article:published_time" content="2026-07-13T00:00:00Z">`,\n    `<meta property="article:modified_time" content="${escapeHtml(updated)}T00:00:00Z">`,\n', '')
    page = once(page, "    '<meta property=\"og:type\" content=\"article\">',", "    '<meta property=\"og:type\" content=\"website\">',")
    page = once(page, "    '<div class=\"dossier-kicker\">Evidence Dossier · Source Card 2.0</div>',", "    '<div class=\"dossier-kicker\">Archive source access</div>',")
    page = once(page, "(profile.clean + ' Evidence Dossier')", "(profile.clean + ' Archive Record')")
    page = once(page, "    '<a class=\"skip\" href=\"#dossier-main\">Skip to dossier</a>',", "    '<a class=\"skip\" href=\"#dossier-main\">Skip to record</a>',")
    old_empty = """      '<table class="dossier-table">',
      '<tbody>',
      archiveMetadataRowsHtml(profile),
      '</tbody>',
      '</table>',
"""
    page = once(page, old_empty, '')
    text = text[:start] + page + text[end:]
    text = once(text, "res.setHeader('X-GAH-Ad-Eligible', archiveQualityClassV1(profile) === 'A_SUBSTANTIVE_INDEX_WORTHY' ? 'true' : 'false');", "res.setHeader('X-GAH-Ad-Eligible', 'false');\n        res.setHeader('X-Robots-Tag', 'noindex,follow');\n        res.setHeader('X-GAH-Archive-Template', 'utility-20261023');")
    text = once(text, "res.setHeader('X-Grok-Archive-Quality', archiveQualityClassV1(profile));", "res.setHeader('X-Grok-Archive-Quality', archiveQualityLabelV1(profile));")
    text = once(text, "res.setHeader('X-GAH-ASCEND-002', 'evidence-dossier');", "res.setHeader('X-GAH-ASCEND-002', 'archive-source-record');")
    text = once(text, "return sendText(res, 200, html, 'text/html; charset=utf-8');\n      }\n\n      if (url.pathname === '/topics'", "return sendTextNoEdgeCache(res, 200, html, 'text/html; charset=utf-8');\n      }\n\n      if (url.pathname === '/topics'")
    text = once(text, "return 'Substantive OCR archive page';", "return 'OCR excerpt available (800+ characters)';")
    text = once(text, "return 'Thin OCR excerpt with source-backed context';", "return 'Short OCR excerpt available';")
    text = once(text, "return 'Image or manifest artifact with source-backed context';", "return 'Image or manifest artifact';")
    text = once(text, "return 'Metadata-only valid artifact with source-backed context';", "return 'Artifact metadata; no displayable text';")
    return text

if __name__ == '__main__':
    before = Path(sys.argv[1]).read_text()
    after = repair(before)
    Path(sys.argv[2]).write_text(after)
    print('Archive utility renderer updated; unrelated source preserved.')
