import {createRemoteJWKSet,jwtVerify} from 'jose';
// Cloudflare Monetization Gateway is the sole trust root. Never trust an incoming JWKS URL.
const cloudflareKeys=createRemoteJWKSet(new URL('https://payments.cloudflare.com/certs'),{timeoutDuration:2500,cooldownDuration:30000,cacheMaxAge:300000});
export function paymentContextVerifier(keySet=cloudflareKeys){
 return async function verify(request,{audience,amount,now=new Date()}={}){
  if(request.method!=='GET'||request.url!==audience||!/^https:\/\/grokarchivehub\.com\/api\/agent-commerce\/v1\/[a-z-]+$/.test(audience||'')||! /^[1-9][0-9]{3,8}$/.test(amount||'')||BigInt(amount)>100000000n)return null;
  const token=request.headers.get('PAYMENT-CONTEXT');if(!token||token.length>8192)return null;
  try{
   const {payload,protectedHeader}=await jwtVerify(token,keySet,{algorithms:['EdDSA','Ed25519'],audience,requiredClaims:['iat','nbf','exp','aud'],currentDate:now,clockTolerance:5});
   // Cloudflare documents a scalar exact audience and short-lived exact-price authorization.
   if(payload.aud!==audience||payload.scheme!=='exact'||payload.amount!==amount||!Number.isInteger(payload.iat)||!Number.isInteger(payload.nbf)||!Number.isInteger(payload.exp)||payload.exp<=payload.iat||payload.exp-payload.iat>180||payload.nbf>payload.exp||payload.iat>Math.floor(now.getTime()/1000)+5||!protectedHeader.kid)return null;
   return Object.freeze({scheme:'exact',amount,audience,expiresAt:payload.exp});
  }catch(_){return null;}
 };
}
export const verifyCloudflarePaymentContext=paymentContextVerifier();
