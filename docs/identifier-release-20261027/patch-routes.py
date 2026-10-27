from pathlib import Path
import json,re
root=Path(__file__).parent;repo=root/'repository';p=repo/'_worker.js';s=p.read_text();entries=json.loads((repo/'content/identifier-dossiers.json').read_text())['entries'];sources=json.loads((repo/'content/identifier-source-links.json').read_text())
def once(old,new):
 global s
 assert s.count(old)==1,(old[:100],s.count(old));s=s.replace(old,new,1)
const='\n// Reviewed identifier register. Source-gap pages retain noindex until separately cleared.\nconst GAH_IDENTIFIER_DOSSIERS = new Map('+json.dumps([[e['id'],e] for e in entries],ensure_ascii=False)+');\nconst GAH_IDENTIFIER_SOURCES = new Map('+json.dumps(list(sources.items()))+');\n'
once('const APEX_HOST = "grokarchivehub.com";',const+'\nconst APEX_HOST = "grokarchivehub.com";')
once('    if (GAH_UNVERIFIED_ARCHIVE_SOURCE_GAPS.has(id)) return routePolicy', '    if (GAH_IDENTIFIER_DOSSIERS.has(id)) return routePolicy(AD_ROUTE_STATUS.exclude, "curated-identifier-source-note", GAH_IDENTIFIER_DOSSIERS.get(id).indexable ? "index,follow" : "noindex,follow");\n    if (GAH_UNVERIFIED_ARCHIVE_SOURCE_GAPS.has(id)) return routePolicy')
s=s.replace('  "Sitemap: https://grokarchivehub.com/sitemap.xml",\n  "Sitemap: https://grokarchivehub.com/sitemap-archive.xml",','  "Sitemap: https://grokarchivehub.com/sitemap-index.xml",')
s=s.replace("'</sitemap.xml>; rel=\"sitemap\"; type=\"application/xml\"'","'</sitemap-index.xml>; rel=\"sitemap\"; type=\"application/xml\"'")
once('  const entries = GAH_APPROVED_ARCHIVE_SITEMAP.map(([path, updated]) =>', '  const entries = [...GAH_IDENTIFIER_DOSSIERS.values()].filter(e => e.indexable).map(e => ["/archive/" + e.id, e.dateModified]).map(([path, updated]) =>')
once('    .filter(sitemapEntryIsIndexable)\n    .filter((entry) => {','    .filter(sitemapEntryIsIndexable)\n    .filter(entry => !/\\/archive\\/EFTA\\d{8}$/.test(Array.isArray(entry) ? entry[0] : entry.loc))\n    .filter((entry) => {')
# Collection routes and the research index are explicitly discoverable; research index belongs to wiki.
once('    ...TRUST_SITEMAP_ENTRIES,','    ...TRUST_SITEMAP_ENTRIES,\n    ["https://grokarchivehub.com/archive/ids", "2026-10-27"],\n    ["https://grokarchivehub.com/barak", "2026-10-27"],')
# Normalize before wiki routing; combine host and identifier aliases in one hop.
early='''
    if (request.method === "GET" || request.method === "HEAD") {
      const identifier = url.pathname.match(/^\\/archive\\/efta(\\d{1,8})(?:\\.html)?\\/?$/i);
      if (identifier) {
        const canonicalPath = "/archive/EFTA" + identifier[1].padStart(8, "0");
        if ((isWikiHost(url.hostname) && !isWikiInternalProxyRequest(request)) || url.pathname !== canonicalPath) {
          return new Response(null, {status:301,headers:{Location:"https://grokarchivehub.com"+canonicalPath+url.search,"Cache-Control":"public, max-age=3600"}});
        }
      }
      if (path === "/wiki" || path === "/grok-command-v4") {
        return new Response(null,{status:301,headers:{Location:"https://wiki.grokarchivehub.com/","Cache-Control":"public, max-age=3600"}});
      }
      if (path === "/archive/ids") return serveFrontdoorEnhanced(request, env, "/archive/ids.html");
    }
'''
once('    const path = cleanPath(url.pathname);\n\n    if (isAccountLevelAnalyticsGatewayPath(path)) {','    const path = cleanPath(url.pathname);\n'+early+'\n    if (isAccountLevelAnalyticsGatewayPath(path)) {')
once('      return serveResearchIndexApex(request, env);','      return new Response(null,{status:301,headers:{Location:"https://wiki.grokarchivehub.com/research-index","Cache-Control":"public, max-age=3600"}});')
once('url.hostname === APEX_HOST && path === "/sitemap-archive.xml"','url.hostname === APEX_HOST && (path === "/sitemap-archive.xml" || path === "/sitemap-efta.xml")')
s=s.replace('<loc>https://grokarchivehub.com/sitemap-archive.xml</loc>','<loc>https://grokarchivehub.com/sitemap-efta.xml</loc>')
# Serve all existing and newly reviewed dossiers from the explicit register.
once('      const archiveId = path.slice("/archive/".length).toUpperCase();\n      if (CORE_ARCHIVE_DOSSIERS.has(archiveId)) {','      const archiveId = path.slice("/archive/".length).toUpperCase();\n      if (GAH_IDENTIFIER_DOSSIERS.has(archiveId)) return serveFrontdoorEnhanced(request, env, "/archive/"+archiveId+".html");\n      if (CORE_ARCHIVE_DOSSIERS.has(archiveId)) {')
# Locators never republish raw OCR. Keep upstream 404s and error codes intact.
a=s.index('async function rewriteArchiveOcrSourceLink(');b=s.index('\nasync function handlePresenceRequest',a)
s=s[:a]+'''async function rewriteArchiveOcrSourceLink(response, request, archiveId) {
  if (response.status !== 200 || !(response.headers.get("Content-Type") || "").includes("text/html")) return response;
  const source = GAH_IDENTIFIER_SOURCES.get(archiveId);
  const canonical = "https://grokarchivehub.com/archive/" + archiveId;
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${archiveId} — Source locator | Grok Archive Hub</title><meta name="robots" content="noindex,follow"><meta name="description" content="${archiveId}: source access and verification status."><link rel="canonical" href="${canonical}"></head><body><main><h1>${archiveId} — Source locator</h1><p>Source text awaiting verification. This page does not publish an unreviewed transcript.</p>${source ? `<p><a href="${escapeHtml(source)}">Open DOJ PDF</a></p>` : '<p><a href="https://www.justice.gov/epstein/search">Find this identifier in the DOJ library</a></p>'}<p><a href="/pdf-lite?id=${archiveId}">Open source viewer</a> · <a href="/archive/ids">Published identifier dossiers</a> · <a href="https://wiki.grokarchivehub.com/">Receipt cards (wiki)</a></p></main></body></html>`;
  const headers = new Headers(response.headers);
  for (const name of ["Content-Length","Content-Encoding","ETag"]) headers.delete(name);
  headers.set("X-Robots-Tag","noindex,follow");headers.set("Cache-Control","no-store");
  return new Response(request.method === "HEAD" ? null : html,{status:200,headers});
}
''' +s[b:]
# Do not expose duplicate title/OG strings when an old snapshot provides both.
once('  const title = meta.title || firstHtmlMatch(body, /<title[^>]*>([\\s\\S]*?)<\\/title>/i) || "Grok Archive Hub";','  const rawTitle = meta.title || firstHtmlMatch(body, /<title[^>]*>([\\s\\S]*?)<\\/title>/i) || "Grok Archive Hub";\n  const title = decodeHeadEntities(rawTitle).replace(/\\s*(?:\\||·)\\s*(?:GAH|GrokArchiveHub|Grok Archive Hub)\\s*$/i, "") + " | Grok Archive Hub";')
once('  if (!htmlMetaContent(body, "property", "og:title")) tags.push(`<meta property="og:title" content="${escapedTitle}">`);','  body = body.replace(/<meta\\b(?=[^>]*property=["\']og:title["\'])[^>]*>/ig, "");\n  tags.push(`<meta property="og:title" content="${escapeHtml(title.replace(/ \\| Grok Archive Hub$/, ""))}">`);')
# The common response header gate must agree with static source-gap meta.
# Repair heading order only on collection hubs, preserving h2 section wording.
once('  let body = stripCloudflareHelperAssets(html);','  let body = stripCloudflareHelperAssets(html);\n  const headingPath = new URL(typeof requestOrUrl === "string" ? requestOrUrl : requestOrUrl.url).pathname;\n  if (["/latest","/dispatches","/investigations","/entities"].includes(headingPath)) {\n    const mainStart = body.search(/<main\\b/i);\n    const h1Match = body.match(/<h1\\b[^>]*>[\\s\\S]*?<\\/h1>/i);\n    if (mainStart >= 0 && h1Match && body.indexOf(h1Match[0]) > body.indexOf("<h2",mainStart) && body.indexOf("<h2",mainStart) >= 0) {\n      body = body.replace(h1Match[0], "").replace(/(<main\\b[^>]*>)/i, "$1"+h1Match[0]);\n    }\n  }')
p.write_text(s)
print('Patched identifier routes, gates, aliases, sitemap partition, locator treatment, titles and collection heading order.')
