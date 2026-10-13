# GAH-NPA-CHRONOLOGY-018 — DOJ source-verified 2007–08 timeline

2026-10-13. New original editorial and source navigation: `/guides/epstein-2007-npa-chronology`. Adds a fifth guide tile and a canonical sitemap URL. No private investigative records, new PDF mirrors, source snippets, charge accusations, commercial features or access control changes.

## Primary-source footing

- DOJ Office of Professional Responsibility executive summary, issued November 2020, official DOJ PDF: https://www.justice.gov/opa/press-release/file/1336416/dl?inline=
- DOJ Office of Public Affairs November 12, 2020 statement on the disciplinary findings: https://www.justice.gov/archives/opa/pr/statement-doj-office-professional-responsibility-report-jeffrey-epstein-2006-2008
- DOJ Office of the Solicitor General brief identifying the proposed indictment as a 53-page draft (where OPR identifies a 60-count draft; page and count are different measures): https://www.justice.gov/osg/media/1185486/dl?inline=
- DOJ-hosted Eleventh Circuit opinion, Doe No. 1 v. United States, 749 F.3d 999, addressing the NPA and victims' discovery: https://www.justice.gov/multimedia/Court%20Records/Epstein%20v.%20Rothstein%2C%20No.%2050-2009-CA-040800-XXXX-MB%20%28Fla.%2015th%20Cir.%20Ct.%202009%29/1374.pdf

## Accepted facts and limitations

The page separately describes 2005–06 investigation/referral, May 2007 draft, July 31 2007 initial offer, September 24 2007 signed NPA, June 23 2008 Deputy Attorney General declination of intervention, June 30 2008 state guilty pleas, and July 7 2008 CVRA petition. It distinguishes OPR's finding of *poor judgment* and insufficient victim sensitivity from its distinct attorney professional-misconduct standard and court rulings. It does not misdescribe an unsigned proposal as a federal indictment or an NPA as a conviction.

**Non-closure:** Ren keyword gap #13 remains open for independent authentication of the actual draft and page count (the proposed '56 pages' is not supported by the DOJ OSG source); partial gap #14 is improved, **not certified complete**, without separate comparison to the original signed NPA and contemporary communications. Do not infer misconduct of a third party from name association. Source URLs are linked directly, no raw victim materials are copied.

## Acceptance

- `tests/test_npa_chronology_018.mjs` verifies official source domains, exact legal-status distinctions, timeline dates, canonical/indexable title, source links and editorial safeguards.
- `tests/run_phase0_regression.sh` now contains 27 suites; GitHub CI is required before merging.
- Deploy from a hash-matched current Pages package to owner-only Access staging first. Production smoke must confirm both `/guides/epstein-2007-npa-chronology` and `/guides` HTTP200, canonical and new sitemap entry.
- Article accuracy/limited external evidence and search console indexing remain separately reviewed under issue #31 and #33.
