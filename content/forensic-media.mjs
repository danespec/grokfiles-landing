const prefix = '/evidence-library/epstein-ocme-photos-2019/';
export async function forensicMedia(request, env) {
  const url = new URL(request.url);
  if (!url.pathname.startsWith(prefix)) return null;
  const key = url.pathname.slice(prefix.length);
  const media = /^(photos\/photo-\d{3}\.jpg|pdf-parts\/autopsy-photos-part-pages-\d{3}-\d{3}\.pdf)$/.test(key);
  if (!media && !['acknowledge','gallery.html','reader.js','manifest.json'].includes(key)) return null;
  const headers = new Headers({'Cache-Control':'private, no-store','X-Robots-Tag':'noindex, noimageindex, noarchive','X-GAH-Ad-Eligible':'false','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'});
  const reply = (body,status) => new Response(body,{status,headers});
  if (!env.FORENSIC_MEDIA) return reply(null,404);
  if (key === 'acknowledge') {
    if (request.method !== 'POST' || request.headers.get('Origin') !== url.origin) return reply(null,403);
    headers.set('Set-Cookie','gah_forensic_ack=1; Secure; HttpOnly; SameSite=Strict; Path='+prefix);
    return reply(null,204);
  }
  if (!['GET','HEAD'].includes(request.method)) return reply(null,405);
  if (media) {
    if (!(request.headers.get('Cookie')||'').split(';').some(v=>v.trim()==='gah_forensic_ack=1')) return reply(null,403);
    const obj = request.method==='HEAD' ? await env.FORENSIC_MEDIA.head(key) : await env.FORENSIC_MEDIA.get(key);
    if (!obj) return reply(null,404);
    headers.set('Content-Type',key.endsWith('.pdf')?'application/pdf':'image/jpeg');
    if (key.endsWith('.pdf')) headers.set('Content-Disposition','attachment; filename="'+key.split('/')[1]+'"');
    headers.set('Content-Length',String(obj.size));
    return reply(request.method==='HEAD'?null:obj.body,200);
  }
  const asset=await env.ASSETS.fetch(request);
  headers.set('Content-Type',key.endsWith('.js')?'text/javascript':key.endsWith('.json')?'application/json':'text/html; charset=utf-8');
  headers.set('Content-Security-Policy',"default-src 'none'; script-src 'self'; connect-src 'self'; img-src 'self'; style-src 'unsafe-inline'; frame-ancestors 'none'; base-uri 'none'");
  return reply(asset.body,asset.status);
}
