from pathlib import Path
import hashlib,sys
p=Path(sys.argv[1]);s=p.read_text();expected='8738e90b8cc7a8fbbb938729f76359c77b860bcaa83abad96faf0655ba2e8ba9'
assert hashlib.sha256(p.read_bytes()).hexdigest()==expected,'Gateway baseline changed; inspect before applying'
start=s.index('function proxyWiki(req, res) {');pos=s.index('  }, rr => {',start)+len('  }, rr => {')
patch='''
    // Branded public HTML errors; API and non-HTML responses retain their contracts.
    if (rr.statusCode === 404 && String(rr.headers['content-type'] || '').includes('text/html') && !reqPath.startsWith('/api/')) {
      rr.resume();
      res.setHeader('X-Robots-Tag', 'noindex,follow');
      res.setHeader('Cache-Control', 'no-store');
      return sendText(res, 404, req.method === 'HEAD' ? '' : readerNotFoundHtml('https://wiki.grokarchivehub.com' + req.url), 'text/html; charset=utf-8');
    }
'''
s=s[:pos]+patch+s[pos:];s="import { readerNotFoundHtml } from './reader-quality.mjs';\n"+s;p.write_text(s)
print('Applied branded public-404 hook; authentication and rate-limit guards untouched')
