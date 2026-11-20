# GAH — AdSense content-value and navigation audit (November 20, 2026)

**Scope:** Website approval preparation. This is **not** a Google policy determination or assurance of approval. Baseline production commit: d3629c2.

## Official approval criteria

- [AdSense site readiness: original content and clear navigation](https://support.google.com/adsense/answer/7299563)
- [Official AdSense disapproval categories](https://support.google.com/adsense/answer/81904)
- [Replicated-content policy](https://support.google.com/publisherpolicies/answer/11190248): copied third-party content without meaningful curation or commentary is problematic. Similarity among GAH's own templates is a quality signal, **not automatically a policy violation**.
- [Publisher Restrictions](https://support.google.com/publisherpolicies/answer/10437795): graphic forensic material requires careful inventory classification.

## Live audit results

| Check | Verified result | Qualification |
|---|---|---|
| Public sitemaps | **161 main + 19 EFTA = 180 unique URLs** | Does not include noindex collections or tools |
| Accessible | **180/180 HTTP 200** | Direct live requests on November 20 |
| Indexable | **180/180 index,follow** | As served in X-Robots-Tag headers |
| Visible rendered text | **All at least 225 words** | Word counts do not establish originality |
| Local ad classification | **3 AD-ELIGIBLE, 9 MANUAL-REVIEW, 168 AD-EXCLUDE** | Publisher-controlled labels, not Google's policy judgment |
| Eligible URL list | Homepage, /investigations, /evidence-briefs | No mandatory count published by Google |
| Possible broken internal links | **24/24 resolved HTTP 200** | Includes tools and wiki redirects |
| Publisher plumbing | ads.txt HTTP 200, privacy HTTP 200, publisher code visible | Not a test of actual EU/UK consent |
| Serving state | AdSense account approval remains false in public configuration; initial requests paused | AdSense code is staged, not evidence of serving ads |

**Page-by-page metrics:** [180-route CSV ledger](./GAH-ADSENSE-PAGE-LEDGER-20261120.csv). Visible text is counted from each *live*, server-rendered main element after excluding navigation/scripts. Direct primary-source-link counts systematically **undercount internal EFTA/wiki citations**; zero does not imply an unsourced article.

## Prioritized issues, not verified rejection causes

### P1 — Template-heavy Data Set guides

Twelve DOJ Data Set guides share repeated index-navigation/citation-checklist language. Data Sets 2/3/5 have a very high direct-text similarity (about 0.89–0.91 for the main text in sampled pairs); token-set overlap is about 0.80–0.82. Data Sets 6 and 7 show about 0.83 token-set overlap. Despite distinct EFTA filename observations, these five pages explicitly say they are index-navigation aids rather than independent findings. Enrich with genuinely distinct, verifiable worked provenance examples and original analysis. Do not invent document contents to make them appear unique.

### P1 — Only three designated potentially monetizable pages

The site intentionally excludes most archive, court, source-reader, and investigation pages from advertising. That is a defensible sensitive-content safeguard, but it leaves a very small pool of currently eligible inventory. The count is **not** proof of an AdSense approval defect. Prioritize independent editorial review of the nine MANUAL-REVIEW pages, then identify future non-graphic, source-backed original explainers appropriate for ads. Never indiscriminately enable advertising on sensitive documents.

### P1 — Forensic imagery on a linked evidence surface

The forensic-photo register is ad-excluded and contains substantial explanatory text. Its promotion from an ad-eligible homepage nonetheless deserves separate contextual/brand review. A documentary source does not imply automatic advertiser suitability. Do not delete evidence or undo an owner-approved headline. Consider a non-graphic homepage preview that keeps the source available after a warning; this is a proposed editorial choice, **not** a finding of Google policy violation.

### P2 — Distinguish reported findings from locators

The news and investigative pages generally have substantial text, source references, explicit limitations and editorial framing. Some pages are primarily indexed source locators; use direct EFTA/DOJ references, methods, uncertainty and the independently authored conclusion near the top. Avoid publishing arbitrary filler, blanket noindex changes or duplicated external text.

### P2 — Navigation is functioning

The full sitemap scan and 24 suspicious internal-link probes returned HTTP 200. Some hubs (including /news) remain intentionally noindex under the established SEO design. Do not remove those directives solely to satisfy the AdSense task checklist. Add clearer reciprocal links only where an editor can identify a substantive research journey.

## Checks still requiring access / independent review

- Exact text, date and category from the AdSense **account rejection**; a generic tutorial cannot reveal Google's private reason.
- Live consent dialogs under EEA/UK/Swiss conditions, versus configuration markers alone.
- AdSense seller information visibility and business-domain settings in the authorized account.
- Genuine mobile interaction/accessibility testing beyond status codes and static regressions.
- Search Console indexing data and Google review-crawler coverage.

## Recommendation

**Do not resubmit yet.** The obvious technical items are present, and the indexed pages are not empty. Improve the repetitive guide cluster with truly differentiating source analysis, evaluate nine manual-review pages and homepage sensitive imagery without hiding verified evidence, then verify the real AdSense account rejection and consent flow. Google alone determines whether the site is approved.

This audit records **observations and editorial risk prioritization**, not a claim that any listed item caused Google's rejection.
