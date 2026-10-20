/**
 * AE // HyperTerminal Polyglot Quine OS v17 — portable command contract.
 * Browser-safe, dependency-free, no implicit native access and no secrets.
 * Self-export copies the actually served runtime source; it is not a mathematical fixed-point quine.
 */
export const HYPERTERMINAL_VERSION = '17.0.0-research';
export const HYPERTERMINAL_ID = 'ae.hyperterminal.polyglot.quine.os';
const blocked = new Map([
  ['swarm', 'Authenticated agent-control adapter'], ['battalion', 'Authenticated deployment adapter'],
  ['pulse', 'Verified transport adapter'], ['audit', 'Verified evidence-audit adapter'],
  ['adb', 'Authorized ADB backend'], ['ota', 'Signed update service'],
  ['tunnel', 'Authenticated secure-tunnel adapter'], ['geminicli', 'Authenticated Gemini CLI adapter'],
  ['gemini-cli', 'Authenticated Gemini CLI adapter'], ['argon', 'Authenticated Argon runtime'],
  ['consensus', 'Real multi-model quorum service'], ['quorum', 'Real multi-model quorum service'],
  ['spark', 'GPU-backed runtime'], ['antigravity', 'Authenticated native executor']
]);
const models = Object.freeze({
  gemini: { role: 'hosted-multimodal-peer', readiness: 'NOT_CONFIGURED' },
  aeon: { role: 'qwen-aeon-xs-multimodal-peer', readiness: 'NOT_CONFIGURED' },
  duality: { role: 'paired-comparison', readiness: 'NOT_CONFIGURED' }
});
const response=(message,kind='system',value=null)=>({handled:true,kind,message,value});
const noAdapter=(name,need)=>response(
  '[NOT_CONFIGURED] '+name+' requires '+need+'. No external model, device, deployment, or native action was executed.', 'warn',
  {ok:false,status:'NOT_CONFIGURED',provider:name}
);
async function sourceRecord(){
  const r=await fetch(import.meta.url,{cache:'no-store',redirect:'error'});
  if(!r.ok)throw new Error('source_fetch_'+r.status);
  const content=await r.text();
  if(!globalThis.crypto?.subtle)throw new Error('webcrypto_unavailable');
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(content));
  const sha256=[...new Uint8Array(digest)].map(n=>n.toString(16).padStart(2,'0')).join('');
  return {content,sha256,bytes:new TextEncoder().encode(content).length};
}
export function describeHyperterminal(){
  return {id:HYPERTERMINAL_ID,version:HYPERTERMINAL_VERSION,mode:'browser-contract',
    security:'capability-deny-by-default',nativeExecution:'NOT_CONFIGURED',
    peers:models,features:['real browser checks','source hash','source export','legacy command compatibility']};
}
export async function dispatchHyperterminal(raw){
  const value=String(raw??'').trim();
  if(!value)return {handled:false};
  const [token,...tail]=value.split(/\s+/);
  const cmd=token.toLowerCase(), sub=(tail[0]||'status').toLowerCase();
  if(cmd==='os'||cmd==='polyglot'||cmd==='hyperterminal'){
    if(sub==='help')return response(
      'AE HYPERTERMINAL POLYGLOT QUINE OS\n  os status | os capabilities | os peers | os help\n  quine status | quine verify | quine export\n  peer gemini | peer aeon | peer duality\n  gaia verify\nRemote inference/native commands require authenticated adapters.','good');
    if(sub==='peers')return response(JSON.stringify(models,null,2),'system',models);
    return response(JSON.stringify(describeHyperterminal(),null,2),'good',describeHyperterminal());
  }
  if(cmd==='peer'||cmd==='/aeon'||cmd==='/duality'||cmd==='/dual'||cmd==='aeon'){
    const peer=cmd==='peer'?sub:(cmd==='/aeon'||cmd==='aeon'?'aeon':'duality');
    return models[peer]?noAdapter(peer,'a verified server-side inference endpoint'):response('Valid peers: gemini, aeon, duality','warn');
  }
  if(cmd==='quine'){
    if(sub==='status')return response('Source-backed quine interface ready. Export reproduces the served JavaScript source, not a self-hosted OS or fixed-point quine.','system');
    if(sub==='verify'||sub==='export'){
      try{
        const record=await sourceRecord();
        if(sub==='export'){
          if(typeof document==='undefined'||typeof URL.createObjectURL!=='function')return response('Source export requires a browser download context.','warn');
          const blob=new Blob([record.content],{type:'text/javascript'});
          const link=document.createElement('a'),url=URL.createObjectURL(blob);
          try{link.href=url;link.download='hyperterminal-polyglot-quine-os-v17.js';link.click()}
          finally{setTimeout(()=>URL.revokeObjectURL(url),1000)}
        }
        return response('[SOURCE_'+(sub==='verify'?'HASH':'EXPORTED')+'] sha256='+record.sha256+' bytes='+record.bytes+'; executable-source snapshot only.','good',{sha256:record.sha256,bytes:record.bytes});
      }catch(e){return response('[UNVERIFIED] Source could not be retrieved and hashed: '+String(e.message||e),'warn')}
    }
    return response('Usage: quine status | quine verify | quine export','warn');
  }
  if(cmd==='gaia'&&sub==='verify'){
    const checks={webCrypto:!!globalThis.crypto?.subtle,fetch:typeof fetch==='function',
      document:typeof document!=='undefined',webGL2:false};
    if(typeof document!=='undefined'){
      try{checks.webGL2=!!document.createElement('canvas').getContext('webgl2')}catch{}
    }
    const pass=checks.webCrypto&&checks.fetch&&checks.document;
    return response('[BROWSER_CAPABILITY_CHECK] '+JSON.stringify(checks)+'; external devices, model inference, identity and ADAM production gates remain UNVERIFIED.',pass?'good':'warn',{checks,productionVerified:false});
  }
  if(cmd==='gemini'||cmd==='/gemini')return noAdapter('gemini','an authenticated Gemini server adapter');
  if(cmd==='gemini' || cmd==='/ollama' || cmd==='/openai')return noAdapter(cmd,'an authenticated provider adapter');
  if(blocked.has(cmd))return noAdapter(cmd,blocked.get(cmd));
  return {handled:false};
}
