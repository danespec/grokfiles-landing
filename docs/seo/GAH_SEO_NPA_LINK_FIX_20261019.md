# GAH-SEO-NPA-LINK-001 — Fix broken NPA context link

The October 19 production crawl of 145 sitemap pages found 730 distinct internal on-site link targets. 727 returned HTTP 200, one Cloudflare obfuscated-email address returned 404 (Cloudflare protected-email endpoint, not an editorial article), one Patreon OAuth flow ended at external Patreon 403 (not proof of local website defect), and one editorial article link returned 404:

/guides/epstein-2007-npa-chronology — referenced twice by the 2007 draft indictment guide, but did not exist in the repository or production.

Retarget both references to the existing published /investigations/epstein-npa-defense-access-victim-notification, an actual sourced 2007-2008 NPA investigation covering defense access, victim notification and DOJ OPR record. Adjust only the source description so it does not misrepresent the replacement as an exhaustive single timeline. Update parent guide sitemap lastmod for the true content modification. No speculative replacement of sources, no new placeholder, no security/robots changes, no mass sitemap changes.

Verification: all actual guide links resolve HTTP 200; source title and canonical preserved; Node Worker syntax and 11 Phase0 suites pass; live manual confirm. Existing Cloudflare email protection and external auth intentionally untouched.
