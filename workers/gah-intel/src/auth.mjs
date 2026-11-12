import { createRemoteJWKSet, jwtVerify } from 'jose';

const keysets = new Map();

export async function authorize(request, env, suppliedKeys) {
  const url = new URL(request.url);
  if (url.protocol !== 'https:' || url.hostname !== 'intel.grokarchivehub.com') return false;
  const issuer = env.ACCESS_TEAM_DOMAIN;
  if (typeof issuer !== 'string' || !/^https:\/\/[a-z0-9-]+\.cloudflareaccess\.com$/.test(issuer) || !env.ACCESS_AUD || !env.ACCESS_OWNER_EMAIL) return false;
  const token = request.headers.get('cf-access-jwt-assertion');
  if (!token || token.length > 16384) return false;
  try {
    if (!suppliedKeys && !keysets.has(issuer)) keysets.set(issuer, createRemoteJWKSet(new URL(issuer + '/cdn-cgi/access/certs')));
    const { payload } = await jwtVerify(token, suppliedKeys || keysets.get(issuer), {
      issuer, audience: env.ACCESS_AUD, algorithms: ['RS256'], requiredClaims: ['exp', 'iat', 'sub', 'email'], clockTolerance: 5,
    });
    return typeof payload.email === 'string' && payload.email.toLowerCase() === env.ACCESS_OWNER_EMAIL.toLowerCase();
  } catch { return false; }
}
