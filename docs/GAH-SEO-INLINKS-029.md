# GAH-SEO-INLINKS-029 — Internal discovery audit and narrow source-guide repair

Source: Read-only owner-network HTTP audit of the 137 URLs published in
https://grokarchivehub.com/sitemap.xml on October 13, 2026.
Method: bounded, four-concurrent live requests; parse static HTML <a href>
elements only; compare internal links against normalized sitemap paths.
No JS-driven route inference, account scraping, Cloudflare WAF edits, robots
edits or Google-indexing claims. Private URL graph/summary workpaper retained
off-repo in owner-only GAH-SEO-INLINKS-029-private/live-graph-20261013.json.

Baseline measurements:
- 137/137 sitemap pages returned HTTP 200 in this run.
- Two pages had zero inbound links from any OTHER sitemap HTML page:
  https://grokarchivehub.com/photos
  https://grokarchivehub.com/book-of-black/methodology
- 35 of 137 pages lacked a direct link from the seven selected main hubs;
  this is a targeted navigational metric, not an orphan-page count.
- Each of four October DOJ source guides had only two distinct inbound links.

Fix in this release:
- Homepage Direct Source Access section now links the existing /photos
  incoming visual-evidence index without removing the files-host link.
- Book of Black editorial landing page now links its dedicated methodology
  and limits page alongside explicit manuscript-is-not-evidence warnings.
- Homepage source-guides section links four government-record guide pages:
  2007 NPA chronology, proposed federal indictment, DOJ redacted contact book,
  and DOJ flight logs. The same section explicitly warns against inferring
  guilt or conduct merely from source inclusion.

Acceptance: synthetic Phase0 editorial link checks pass, then live sitemap
crawl verifies both former orphans have at least one inbound link from
published pages and each source guide has at least three distinct inbound
static-HTML anchors. All public sitemap URLs remain HTTP 200 with correct
self canonicals and no noindex meta. No change to sitemap count, CSP, Worker,
Cloudflare Access, Wiki proxy, rate limits, memberships or payments.
Links assist discovery but cannot compel Google indexing. Keep issue #33
open for GSC Wizard crawler-specific HTTP403 and request/WAF attribution.

Re-test with the owner-private read-only script
GAH-SEO-INLINKS-029-audit.py; do not commit large content or page copies.
