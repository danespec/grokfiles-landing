/**
 * Full-corpus OCR keyword discovery backed by the existing (670k+) Meilisearch index.
 * Public output is deliberately ID-only. No OCR, excerpts, names or original filesystem
 * paths are copied out of the upstream search result. Existing wiki rate/auth guards apply.
 */
const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, c =>
  ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

const visibleFormats = flags => {
  const names = [];
  if (flags & 4) names.push('PDF');
  if (flags & 2) names.push('OCR');
  if (flags & 8) names.push('video');
  if (flags & 16) names.push('audio');
  if (flags & 32) names.push('visual index');
  return names.length ? names.join(' · ') : 'source record';
};

const extractId = hit => {
  const raw = String(hit && (hit.id || hit.efta_id || '')).toUpperCase();
  return /^EFTA[0-9]{8}$/.test(raw) ? raw : '';
};

function renderPage({query = '',results = [],message = '',isError = false,submitted = false}) {
  const form = '<form action="/catalog/search" method="get" role="search">'
    +'<label for="efta-keyword">Search document text and exact EFTA identifiers</label>'
    +'<div><input id="efta-keyword" type="search" name="q" maxlength="120" required value="'+esc(query)+'" placeholder="Enter a document topic, term or EFTA number" style="width:min(100%,36rem);padding:12px">'
    +'<button type="submit" style="padding:12px">Search OCR records</button></div></form>';
  const rows = results.length
    ? '<ol>'+results.map(r =>
      '<li style="padding:9px 0"><a href="/catalog/'+r.id+'"><strong>'+r.id+'</strong></a>'
      +' <span>— '+esc(visibleFormats(r.flags))+'</span> '
      +'<span style="font-size:.85em">[source-format record]</span></li>'
    ).join('')+'</ol>'
    : submitted ? '<p>No EFTA identifiers found in the returned matches. Try different source terminology.</p>' : '';
  const status = message
    ? '<p role="'+(isError?'alert':'status')+'">'+esc(message)+'</p>' : '';
  return '<!doctype html><html lang="en"><head><meta charset="utf-8">'
    +'<meta name="viewport" content="width=device-width,initial-scale=1">'
    +'<title>OCR keyword search | Grok Archive Hub</title>'
    +'<meta name="robots" content="noindex,follow">'
    +'<link rel="canonical" href="https://wiki.grokarchivehub.com/catalog">'
    +'<meta name="grok-ad-eligible" content="false">'
    +'</head><body><main style="max-width:840px;margin:30px auto;padding:20px;font:16px/1.55 system-ui,Arial,sans-serif">'
    +'<p><a href="/catalog">Full EFTA catalog</a> · <a href="/catalog/media">Media formats</a> · <a href="/research-index">Research guides</a></p>'
    +'<h1>Search the EFTA OCR corpus</h1>'
    +'<p>This search uses GAH’s existing OCR index (670,469 indexed documents at the November 20, 2026 audit).'
    +' Results disclose EFTA identifiers and file-format flags only—never unreviewed OCR excerpts, private names, or internal source paths.'
    +' The underlying index is not the same as Google’s index.</p>'
    +form+status+rows
    +'<p>Results are ranked top matches, limited to 80 per query. Not every catalog record has OCR text,'
    +' and a matching ID is not an allegation or proof of wrongdoing. Verify source context and redactions.</p>'
    +'</main></body></html>';
}

export async function catalogSafeSearchHandler(req,res,{postSearch,catalogFlags}) {
  const url = new URL(req.url || '/', 'https://wiki.grokarchivehub.com');
  if (url.pathname !== '/catalog/search') return false;
  const method = String(req.method || 'GET').toUpperCase();
  const headers = {
    'Content-Type':'text/html; charset=utf-8',
    'Cache-Control':'no-store',
    'CDN-Cache-Control':'no-store',
    'X-Robots-Tag':'noindex,follow',
    'X-GAH-Ad-Eligible':'false',
    'X-Content-Type-Options':'nosniff',
    'Referrer-Policy':'no-referrer',
    'Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'"
  };
  if (method !== 'GET' && method !== 'HEAD') {
    res.writeHead(405,{...headers,'Allow':'GET, HEAD'});
    res.end(method==='HEAD'?'':renderPage({message:'This search accepts GET requests only.',isError:true}));
    return true;
  }
  const q = String(url.searchParams.get('q') || '').trim();
  if (q.length > 120 || /[\u0000-\u001f\u007f]/.test(q)) {
    res.writeHead(400,headers);
    res.end(method==='HEAD'?'':renderPage({message:'The search term is invalid or too long.',isError:true}));
    return true;
  }
  if (method === 'HEAD' || !q) {
    res.writeHead(200,headers);
    res.end(method==='HEAD'?'':renderPage({}));
    return true;
  }
  if (q.length < 2) {
    res.writeHead(400,headers);
    res.end(renderPage({query:q,message:'Enter at least two characters.',isError:true}));
    return true;
  }
  try {
    // The existing AI gateway handles Meilisearch; AI summaries are explicitly disabled.
    const reply = await postSearch({q,query:q,limit:80,fast:true,no_ai:true});
    if (!reply || reply.ok === false) throw new Error('Search unavailable');
    const hits = Array.isArray(reply.hits) ? reply.hits : Array.isArray(reply.results) ? reply.results : [];
    const found = [];
    const seen = new Set();
    for (const hit of hits) {
      const id = extractId(hit);
      if (!id || seen.has(id)) continue;
      const flags = Number(catalogFlags(id));
      if (!Number.isInteger(flags) || flags <= 0) continue;
      seen.add(id);
      found.push({id,flags});
      if (found.length >= 80) break;
    }
    res.writeHead(200,headers);
    res.end(renderPage({query:q,results:found,submitted:true,message:found.length+' matching source identifiers displayed.'}));
  } catch (err) {
    // Do not expose internal hostnames, Meilisearch errors, credentials or query data.
    res.writeHead(502,headers);
    res.end(renderPage({query:q,message:'Keyword search is temporarily unavailable. Exact-ID lookup remains available.',isError:true}));
  }
  return true;
}
