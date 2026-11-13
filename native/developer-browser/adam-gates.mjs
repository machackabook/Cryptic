import {verify,createPublicKey} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
export function verifyRelease({subject,receipts,keys,now=Date.now()}) {
  if(!/^[a-f0-9]{40}$/.test(subject))throw new Error('exact_commit_required');
  const gates=['security','build','browser','restore','release-approval'];
  const fingerprints=new Set();
  for(const gate of gates){
    const receipt=receipts[gate];
    const key=createPublicKey(keys[gate]);
    const fingerprint=key.export({type:'spki',format:'der'}).toString('base64');
    if(fingerprints.has(fingerprint))throw new Error('independent_gate_keys_required');
    fingerprints.add(fingerprint);
    if(!receipt||!verify(null,Buffer.from(receipt.payload,'base64'),key,Buffer.from(receipt.signature,'base64')))throw new Error('invalid_gate_signature');
    const p=JSON.parse(Buffer.from(receipt.payload,'base64').toString());
    if(p.gate!==gate||p.subject!==subject||p.status!=='passed'||!Number.isFinite(p.issuedAt)||p.issuedAt>now||now-p.issuedAt>86400000||!/^[a-f0-9]{64}$/.test(p.evidenceSHA256||''))throw new Error('gate_not_satisfied');
  }
  return {eligible:true,subject,publicationPerformed:false};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  if(!process.argv[2])throw new Error('private_gate_bundle_path_required');
  console.log(JSON.stringify(verifyRelease(JSON.parse(await readFile(process.argv[2],'utf8'))),null,2));
}
