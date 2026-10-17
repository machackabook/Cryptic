import {test} from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,sign} from 'node:crypto';
import {verifyRelease} from './adam-gates.mjs';
test('ADAM rejects missing, forged, stale, wrong-revision and shared-issuer evidence',()=>{
  const bundle={subject:'a'.repeat(40),keys:{},receipts:{}};const privates={};
  for(const gate of ['security','build','browser','restore','release-approval']){
    const {privateKey,publicKey}=generateKeyPairSync('ed25519');privates[gate]=privateKey;bundle.keys[gate]=publicKey.export({type:'spki',format:'pem'});
    const data=Buffer.from(JSON.stringify({gate,subject:bundle.subject,status:'passed',issuedAt:Date.now(),evidenceSHA256:'b'.repeat(64)}));
    bundle.receipts[gate]={payload:data.toString('base64'),signature:sign(null,data,privateKey).toString('base64')};
  }
  assert.equal(verifyRelease(bundle).publicationPerformed,false);
  assert.throws(()=>verifyRelease({...bundle,subject:'c'.repeat(40)}));
  assert.throws(()=>verifyRelease({...bundle,now:Date.now()+90000000}));
  assert.throws(()=>verifyRelease({...bundle,receipts:{...bundle.receipts,browser:undefined}}));
  assert.throws(()=>verifyRelease({...bundle,keys:{...bundle.keys,browser:bundle.keys.build}}));
  const forged=structuredClone(bundle);forged.receipts.security.payload=Buffer.from('{}').toString('base64');assert.throws(()=>verifyRelease(forged));
});
