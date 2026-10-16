import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,sign} from 'node:crypto';
import {createTierAuthorizer} from '../nexus-tier-gate.mjs';
const {publicKey,privateKey}=generateKeyPairSync('ed25519');
const pub=publicKey.export({type:'spki',format:'pem'}),now=1730000000;
const gate=createTierAuthorizer({publicKeyPem:pub,keyId:'test-key',clock:()=>now});
const b=s=>Buffer.from(JSON.stringify(s)).toString('base64url');
const token=claims=>{const h=b({alg:'EdDSA',typ:'nexus-capability-v1',kid:'test-key'}),p=b(claims);return 'Bearer '+h+'.'+p+'.'+sign(null,Buffer.from(h+'.'+p),privateKey).toString('base64url');};
const claims=(tier,scope)=>({iss:'nexus-synapse',aud:'cryptic-runtime',repository:'machackabook/Cryptic',iat:now-10,nbf:now-10,exp:now+120,jti:'jti-1234567890',sub:'architect-user',session_id:'project-session-12345',tier,scopes:[scope],amr:['oauth','mfa'],repo_permission:'write',provenance:{status:'signed',commit_sha:'a'.repeat(40)},device_attested:true,approvers:['Cain','Abel']});
test('public visitor may read only public scope',()=>{
 assert.equal(gate({}).allowed,true);
 assert.equal(gate({requiredTier:'member',scope:'ai:request'}).allowed,false);
 assert.equal(gate({requiredTier:'developer',scope:'git:write'}).status,403);
});
test('signed tiers require appropriate scopes and commit provenance',()=>{
 const user=token(claims('member','ai:request'));
 assert.equal(gate({authorization:user,requiredTier:'member',scope:'ai:request'}).allowed,true);
 assert.equal(gate({authorization:user,requiredTier:'developer',scope:'git:write'}).allowed,false);
 const dev=token(claims('developer','git:write'));
 assert.equal(gate({authorization:dev,requiredTier:'developer',scope:'git:write'}).allowed,true);
});
test('architect requires two independent approvals, MFA and device attestation',()=>{
 const good=token(claims('architect','release:promote'));
 assert.equal(gate({authorization:good,requiredTier:'architect',scope:'release:promote'}).allowed,true);
 const damaged=claims('architect','release:promote');damaged.approvers=['Cain','Cain'];
 assert.equal(gate({authorization:token(damaged),requiredTier:'architect',scope:'release:promote'}).allowed,false);
 damaged.approvers=['Cain','Abel'];damaged.device_attested=false;
 assert.equal(gate({authorization:token(damaged),requiredTier:'architect',scope:'release:promote'}).allowed,false);
});
test('tampering, expiration, wrong audience and invalid algorithms denied',()=>{
 const p=claims('architect','release:promote');p.exp=now-1;
 assert.equal(gate({authorization:token(p),requiredTier:'architect',scope:'release:promote'}).allowed,false);
 p.exp=now+120;p.aud='evil-service';
 assert.equal(gate({authorization:token(p),requiredTier:'architect',scope:'release:promote'}).allowed,false);
 const orig=token(claims('member','ai:request'));
 assert.equal(gate({authorization:orig.slice(0,-9)+'AAAAAAAA'+orig.slice(-1),requiredTier:'member',scope:'ai:request'}).allowed,false);
 const chunks=orig.split('.');chunks[1]=chunks[1].slice(0,-2)+'ab';
 assert.equal(gate({authorization:chunks.join('.'),requiredTier:'member',scope:'ai:request'}).allowed,false);
});
test('no signing key means private access always denied',()=>{
 const g=createTierAuthorizer({keyId:'none'});
 assert.equal(g({requiredTier:'architect',scope:'release:promote'}).allowed,false);
 assert.equal(g({requiredTier:'public',scope:'public:read'}).allowed,true);
});
