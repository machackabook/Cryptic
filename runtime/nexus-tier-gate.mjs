import {createPublicKey,verify as verifySignature} from 'node:crypto';
// Server-only JWS Ed25519 capability verifier. No token or public key is embedded in Pages.
const RANK=Object.freeze({public:0,member:1,developer:2,architect:3});
const B64=/^[A-Za-z0-9_-]{4,}$/;
const decode=s=>{if(!B64.test(s))throw Error('malformed_token');return Buffer.from(s,'base64url');};
const fail=(reason)=>({allowed:false,status:403,reason});
export function createTierAuthorizer({publicKeyPem,issuer='nexus-synapse',audience='cryptic-runtime',repository='machackabook/Cryptic',keyId,clock=()=>Math.floor(Date.now()/1000),maxLifetime=300}={}){
 const key=publicKeyPem?createPublicKey(publicKeyPem):null;
 if(key&&key.asymmetricKeyType!=='ed25519')throw Error('An Ed25519 public key is required.');
 if(!keyId||typeof keyId!=='string')throw Error('Expected signing key ID required.');
 if(!key&&publicKeyPem)throw Error('Invalid public key.');
 return function authorize({authorization='',requiredTier='public',scope='public:read'}={}){
  if(!Object.hasOwn(RANK,requiredTier))return fail('unknown_tier');
  if(requiredTier==='public'&&scope==='public:read'&&!authorization)return {allowed:true,status:200,tier:'public',identity:'guest'};
  if(!key)return fail('signed_session_gateway_unconfigured');
  if(typeof authorization!=='string'||authorization.length>8192||!authorization.startsWith('Bearer '))return fail('signed_session_required');
  try{
   const match=/^Bearer ([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)$/.exec(authorization);
   if(!match) return fail('malformed_token');
   const protectedHeader=JSON.parse(decode(match[1]).toString('utf8'));
   if(protectedHeader.alg!=='EdDSA'||protectedHeader.typ!=='nexus-capability-v1'||protectedHeader.kid!==keyId)return fail('algorithm_or_key_mismatch');
   const signingInput=Buffer.from(match[1]+'.'+match[2]);
   if(!verifySignature(null,signingInput,key,decode(match[3])))return fail('invalid_signature');
   const claims=JSON.parse(decode(match[2]).toString('utf8')),now=clock();
   if(claims.iss!==issuer||claims.aud!==audience||claims.repository!==repository)return fail('wrong_issuer_audience_or_repo');
   if(!Number.isSafeInteger(claims.iat)||!Number.isSafeInteger(claims.exp)||!Number.isSafeInteger(claims.nbf))return fail('timestamps_required');
   if(claims.iat>now+10||claims.nbf>now+10||claims.exp<=now||claims.exp-claims.iat>maxLifetime||claims.exp<=claims.iat)return fail('expired_or_invalid_lifetime');
   if(typeof claims.sub!=='string'||claims.sub.length<3||typeof claims.session_id!=='string'||claims.session_id.length<12||typeof claims.jti!=='string'||claims.jti.length<12)return fail('identity_provenance_missing');
   if(!Object.hasOwn(RANK,claims.tier)||RANK[claims.tier]<RANK[requiredTier]||!Array.isArray(claims.scopes)||!claims.scopes.includes(scope))return fail('insufficient_tier_or_scope');
   if(!Array.isArray(claims.amr)||!claims.amr.some(x=>x==='passkey'||x==='oauth'))return fail('authenticated_session_required');
   if(RANK[requiredTier]>=2&&(!claims.provenance||claims.provenance.status!=='signed'||claims.provenance.commit_sha?.length!==40||claims.repo_permission!=='write'))return fail('developer_provenance_required');
   if(RANK[requiredTier]>=3){
    if(!claims.amr.includes('mfa')||claims.device_attested!==true)return fail('mfa_and_device_attestation_required');
    const a=Array.isArray(claims.approvers)?claims.approvers.filter(x=>typeof x==='string'&&x!==claims.sub):[];
    if(new Set(a).size<2)return fail('independent_approvals_required');
   }
   return {allowed:true,status:200,tier:claims.tier,identity:claims.sub,session_id:claims.session_id,scope};
  }catch{return fail('invalid_signed_capability');}
 };
}
