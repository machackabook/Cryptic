export function mount(root){
 const $=id=>root.querySelector('#'+id);
 const alias=$('identityAliasInput'),command=$('identityCreateCommand'),copyCommand=$('identityCopyCommand');
 const source=$('identityPublicInput'),expected=$('identityExpectedFingerprint'),inventoryFile=$('identityInventoryFile');
 const validate=$('identityValidate'),copyPublic=$('identityCopyPublic'),result=$('identityResult');
 const laceLabel=$('identityLaceLabel'),renderLace=$('identityRenderLace'),laceView=$('identityLaceView'),clipSvg=$('identityClipSvg');
 if(!source||!validate||!result)return;
 let normalizedPublic='';
 const keyTypes=new Set(['ssh-ed25519','ssh-rsa','ecdsa-sha2-nistp256','ecdsa-sha2-nistp384','ecdsa-sha2-nistp521','sk-ssh-ed25519@openssh.com','sk-ecdsa-sha2-nistp256@openssh.com']);
 const cleanText=s=>String(s||'').normalize('NFC').replace(/[\u200B\u200C\u200D\u2060\uFEFF]/g,'');
 const bytesToBase64=bytes=>{let s='';for(let i=0;i<bytes.length;i+=0x8000)s+=String.fromCharCode(...bytes.subarray(i,i+0x8000));return btoa(s)};
 const base64ToBytes=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
 const readString=(b,pos)=>{if(pos+4>b.length)throw Error('TRUNCATED_SSH_STRING_LENGTH');const n=(((b[pos]<<24)|(b[pos+1]<<16)|(b[pos+2]<<8)|b[pos+3])>>>0);const start=pos+4;if(n>b.length-start)throw Error('TRUNCATED_SSH_STRING_DATA');return {value:b.slice(start,start+n),pos:start+n}};
 const decodeAscii=b=>new TextDecoder('ascii',{fatal:true}).decode(b);
 async function parseKey(type,b64,comment=''){
   let blob;try{blob=base64ToBytes(b64)}catch{throw Error('PUBLIC_KEY_BASE64_INVALID')}
   let p=0;const t=readString(blob,p);p=t.pos;const embedded=decodeAscii(t.value);
   if(embedded!==type||!keyTypes.has(type))throw Error('PUBLIC_KEY_TYPE_MISMATCH_OR_UNSUPPORTED');
   const fields=[];while(p<blob.length){const x=readString(blob,p);fields.push(x.value);p=x.pos}
   if(type==='ssh-ed25519'&&(fields.length!==1||fields[0].length!==32))throw Error('ED25519_PUBLIC_FIELD_MUST_BE_32_BYTES');
   if(type==='ssh-rsa'&&(fields.length!==2||fields.some(x=>!x.length)))throw Error('RSA_PUBLIC_FIELDS_INVALID');
   if(type.startsWith('ecdsa-sha2-')&&(fields.length!==2||decodeAscii(fields[0])!==type.slice('ecdsa-sha2-'.length)||!fields[1].length))throw Error('ECDSA_PUBLIC_FIELDS_INVALID');
   if(type==='sk-ssh-ed25519@openssh.com'&&(fields.length<2||fields.length>3||fields[0].length!==32))throw Error('SECURITY_KEY_ED25519_FIELDS_INVALID');
   if(type==='sk-ecdsa-sha2-nistp256@openssh.com'&&(fields.length<3||fields.length>4||decodeAscii(fields[0])!=='nistp256'))throw Error('SECURITY_KEY_ECDSA_FIELDS_INVALID');
   const dig=new Uint8Array(await crypto.subtle.digest('SHA-256',blob));
   const fp='SHA256:'+bytesToBase64(dig).replace(/=+$/,'');
   return {type,blob,b64:bytesToBase64(blob),comment:comment.slice(0,160),fingerprint:fp,line:type+' '+bytesToBase64(blob)+(comment?' '+comment:'')};
 }
 async function decodeWireText(s){
   if(/BEGIN (?:OPENSSH|RSA|EC|DSA) PRIVATE KEY|PRIVATE KEY-----/i.test(s))throw Error('PRIVATE_KEY_BLOCKED: never paste private-key material into this public page');
   if(/HULE1:|cryptic\\.hule\\.v1/i.test(s))throw Error('LACE_ENVELOPE: decode locally with scripts/cryptic-lace.py before parsing; do not guess at alias glyphs');
   const text=cleanText(s),foundType=[...keyTypes].find(t=>text.includes(t));
   if(!foundType)throw Error('PUBLIC_KEY_TYPE_MISSING: include the OpenSSH algorithm label or supply a known-good inventory and expected fingerprint');
   const after=text.slice(text.indexOf(foundType)+foundType.length);
   const chunks=after.split(/\\s+/).map(x=>x.trim()).filter(Boolean);
   let assembled='';
   for(const chunk of chunks){
     if(!/^[A-Za-z0-9+/]+={0,2}$/.test(chunk))break;
     assembled+=chunk;
     try{return await parseKey(foundType,assembled,'')}catch{}
   }
   throw Error('KEY_INCOMPLETE: the fragments did not form a complete SSH public-key blob; missing bytes cannot be inferred');
 }
 async function parseInventory(text){const out=[];for(const line of cleanText(text).split(/[\r\n]+/)){const parts=line.trim().split(/\s+/);if(parts.length<2||!keyTypes.has(parts[0]))continue;try{out.push(await parseKey(parts[0],parts[1],parts.slice(2).join(' ')))}catch{}}return out}
 alias?.addEventListener('input',()=>{const label=alias.value.trim().replace(/[^A-Za-z0-9_.-]/g,'-').slice(0,48)||'cryptic-node';command.textContent='ssh-keygen -t ed25519 -a 100 -f "$HOME/.ssh/cryptic_ed25519" -C "cryptic:'+label+'"';});
 copyCommand?.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(command.textContent);copyCommand.textContent='Copied';setTimeout(()=>copyCommand.textContent='Copy local command',1200)}catch{result.textContent='Clipboard permission unavailable. Select the command text manually.'}});
 validate.addEventListener('click',async()=>{
   normalizedPublic='';copyPublic.disabled=true;result.textContent='Inspecting public-key bytes locally…';
   try{
     let candidate=null,src=source.value.trim(),required=expected.value.trim(),parseFailure='';
     if(src){try{candidate=await decodeWireText(src)}catch(e){parseFailure=String(e.message||e);if(parseFailure.includes('PRIVATE_KEY_BLOCKED')||parseFailure.includes('LACE_ENVELOPE'))throw e}}
     if(required&&!/^SHA256:/[A-Za-z0-9+/]{20,}=?$/.test(required))throw Error('EXPECTED_FINGERPRINT_FORMAT_INVALID');
     if(candidate&&required&&candidate.fingerprint!==required)candidate=null;
     if(!candidate&&inventoryFile.files?.length&&required){
       const inv=await parseInventory(await inventoryFile.files[0].text());const matches=inv.filter(k=>k.fingerprint===required);
       if(matches.length===1)candidate=matches[0];else if(matches.length>1)throw Error('AMBIGUOUS_INVENTORY_MATCH');
     }
     if(!candidate)throw Error(required?'NO_COMPLETE_KEY_MATCHES_REQUIRED_FINGERPRINT':(parseFailure||'KEY_INCOMPLETE: no complete public key validated; missing bytes cannot be inferred. Select an intact known-good inventory and supply its trusted fingerprint, or rotate the identity.'));
     if(required&&candidate.fingerprint!==required)throw Error('FINGERPRINT_MISMATCH');
     normalizedPublic=candidate.line;copyPublic.disabled=false;
     result.textContent=JSON.stringify({ok:true,status:'PUBLIC_KEY_VALIDATED',type:candidate.type,fingerprint:candidate.fingerprint,normalized_public_key:candidate.line,private_key_touched:false,private_key_or_payload_uploaded:false,missing_bytes_invented:false,note:'This validates public-key bytes only. Device authentication still requires a fresh challenge signature and a receiver allowlist.'},null,2);
   }catch(e){result.textContent=JSON.stringify({ok:false,status:'NOT_RECOVERED',reason:String(e.message||e),private_key_touched:false,missing_bytes_invented:false,network_requests_made:false},null,2)}
 });
 copyPublic?.addEventListener('click',async()=>{if(!normalizedPublic)return;try{await navigator.clipboard.writeText(normalizedPublic);copyPublic.textContent='Copied';setTimeout(()=>copyPublic.textContent='Copy normalized public key',1200)}catch{result.textContent+='\\nClipboard permission unavailable; select the normalized key from this output.'}});
 renderLace?.addEventListener('click',async()=>{
   const label=(laceLabel?.value||'').normalize('NFC');
   laceView.textContent=label.replace(/A/g,'A\u200dª\u200dÅ')+' · presentation alias only; code points in canonical source are unchanged.';
   const digest=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(label)));
   const points=[...digest.slice(0,24)].map((b,i)=>[4+(i%8)*8,4+(b%8)*8]);
   const d=points.map((p,i)=>(i?'L':'M')+p[0]+' '+p[1]).join(' ')+' Z';
   clipSvg.replaceChildren();const defs=document.createElementNS('http://www.w3.org/2000/svg','defs');const cp=document.createElementNS('http://www.w3.org/2000/svg','clipPath');cp.id='identityFingerprintClip';const path=document.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('d',d);cp.appendChild(path);defs.appendChild(cp);const rect=document.createElementNS('http://www.w3.org/2000/svg','rect');rect.setAttribute('width','72');rect.setAttribute('height','72');rect.setAttribute('fill','#00e5ff');rect.setAttribute('clip-path','url(#identityFingerprintClip)');clipSvg.append(defs,rect);clipSvg.hidden=false;clipSvg.setAttribute('aria-label','Display-only path fingerprint of the label, not a cryptographic signature');
 });
}