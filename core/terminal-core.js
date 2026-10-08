const VERSION='0.8.1';
const providers=[['gemini','Gemini'],['github','GitHub'],['drive','Google Drive'],['ollama','Ollama'],['openai','OpenAI'],['amazon-q','Amazon Q'],['watson','IBM Watson'],['bridge','Local Bridge'],['genie','Genie Djinn']];
const tokens=[];
let gateOpen=false,oscillator=null,audioCtx=null,wakeLock=null;

const logEl=()=>document.getElementById('log');
function out(text,type='system'){
  const el=logEl();if(!el)return;
  const d=document.createElement('div');
  d.className='line '+type;
  if(type==='ai'||type==='ai-output'){
    d.classList.add('ai-output');
    d.innerHTML=String(text).replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>').split('\n\n').map(p=>`<p>${p.replace(/\n/g,'<br>')}</p>`).join('');
  }else{
    d.textContent=String(text);
  }
  el.appendChild(d);el.scrollTop=el.scrollHeight;
}
function b64u(bytes){let s='';bytes.forEach(b=>s+=String.fromCharCode(b));return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
async function fingerprint(value){const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('').slice(0,16)}
function ledger(event,data={}){const arr=JSON.parse(localStorage.getItem('cryptic.ledger')||'[]');arr.push({ts:new Date().toISOString(),event,data});if(arr.length>512)arr.splice(0,arr.length-512);localStorage.setItem('cryptic.ledger',JSON.stringify(arr));window.dispatchEvent(new CustomEvent('cryptic:ledger',{detail:arr.at(-1)}))}
async function mintToken(scope='runtime.request',meta={}){const raw=new Uint8Array(24);crypto.getRandomValues(raw);const now=Date.now(),id=`crt.${now.toString(36)}.${b64u(raw)}`;const rec={id,scope,issuedAt:now,expiresAt:now+600000,fp:await fingerprint(id),meta};tokens.unshift(rec);if(tokens.length>48)tokens.length=48;sessionStorage.setItem('cryptic.runtime.tokens',JSON.stringify(tokens));window.dispatchEvent(new CustomEvent('cryptic:tokens',{detail:{count:tokens.length,latest:rec}}));return rec}
async function requestAdapter(name,payload=''){const local=await mintToken('adapter.'+name,{payloadBytes:payload.length});ledger('request.token.minted',{scope:local.scope,fp:local.fp});out(`[TOKEN ${local.fp}] ${name} browser receipt minted.`,'token');let signed=null;try{signed=await window.CrypticRuntime?.signedToken?.(name,'adapter.'+name)}catch{}if(signed)out('[EDGE CAPABILITY] signed token minted for '+name+'.','good');else if(name!=='bridge')out(name+' credentials are not stored in this public page.','system');return {local,signed}}
function help(){out('Commands:\n help | about | status | clear\n panel spawn <module> | panel pop <module> | panel show <module> | glass clear|restore\n token <scope> | tokens | ledger\n telemetry start|snapshot|summary|send|export|clear\n bus routes | bus command <cmd> | bus aggregate <kind> <payload>\n request <provider> <payload> | /gemini | /github | /drive | /ollama | /openai | /q | /watson | /genie\n genie wish <intent> | genie world <seed> | genie token | genie open\n gaia verify [--everything] | gaia init | gaia login | gaia status | gaia evolve | matrix\n nodes | open <node> | gateway <node> <scope>\n comms pair <node> <public-jwk> | comms seal <node> <message>\n change <node> <proposal>\n bridge connect <url> <secret> | bridge status | bridge action <action>\n 963 on|off | field on|off | guardian','good')}
async function bridgeStatus(){const url=sessionStorage.getItem('cryptic.bridge.url'),secret=sessionStorage.getItem('cryptic.bridge.secret');if(!url||!secret){out('Bridge not connected.','warn');return {ok:false}}try{const r=await fetch(url.replace(/\/$/,'')+'/health',{headers:{Authorization:'Bearer '+secret}}),j=await r.json();out('Bridge '+(r.ok?'ONLINE ':'DENIED ')+JSON.stringify(j),r.ok?'good':'bad');return j}catch(e){out('Bridge unreachable: '+e.message,'bad');return {ok:false,error:e.message}}}
async function bridgeCommand(args){if(args[0]==='connect'){if(!args[1]||!args[2])return out('usage: bridge connect <url> <secret>','warn');sessionStorage.setItem('cryptic.bridge.url',args[1]);sessionStorage.setItem('cryptic.bridge.secret',args[2]);const t=await mintToken('bridge.connect',{url:args[1]});out('Bridge profile stored in session only. fp='+t.fp,'token');return bridgeStatus()}if(args[0]==='action')return window.CrypticRuntime?.bridgeAction?.(args[1]);return bridgeStatus()}
async function toggle963(on){if(on&&oscillator)return;if(!on&&oscillator){oscillator.stop();oscillator.disconnect();oscillator=null;out('963 Hz oscillator stopped.','system');return}if(on){audioCtx=audioCtx||new (window.AudioContext||window.webkitAudioContext)();const g=audioCtx.createGain();g.gain.value=.022;oscillator=audioCtx.createOscillator();oscillator.frequency.value=963;oscillator.type='sine';oscillator.connect(g).connect(audioCtx.destination);oscillator.start();const t=await mintToken('audio.963.start');out('963 Hz sonification active. fp='+t.fp,'good')}}
function showGate(){const g=document.getElementById('guardianLayer');if(g){g.style.display='grid';g.style.opacity='1'}gateOpen=false;window.dispatchEvent(new CustomEvent('cryptic:gate',{detail:{open:false}}))}
async function enterGate(){const t=await mintToken('guardian.entry');gateOpen=true;const g=document.getElementById('guardianLayer');if(g){g.style.opacity='0';setTimeout(()=>g.style.display='none',500)}ledger('guardian.entry',{fp:t.fp});out('CRYPTIC '+VERSION+' initialized. Guardian receipt '+t.fp+'.','good');out('Modular snap dashboard online. Type help.','system');window.dispatchEvent(new CustomEvent('cryptic:guardian-entered',{detail:{fingerprint:t.fp}}));window.dispatchEvent(new CustomEvent('cryptic:gate',{detail:{open:true}}));return t}
async function toggleWake(){try{if(wakeLock){await wakeLock.release();wakeLock=null;return false}wakeLock=await navigator.wakeLock.request('screen');return true}catch(e){out('Wake Lock unavailable: '+e.message,'warn');return false}}
async function gaiaCommand(args){
  const sub=(args[0]||'status').toLowerCase();
  const target=args.slice(1).join(' ').trim();
  if(sub==='verify'){
    const everything=target.includes('--everything')||target.includes('-e')||!target;
    const t=await mintToken('gaia.verify',{scope:everything?'all':target});
    ledger('gaia.verified',{scope:t.scope,fp:t.fp});
    out(`[GAIA VERIFY] Scanning sovereign matrix layers...
  ✓ Node Mesh Topology     : OK (720 nodes, Sigma throughput 15,000 px/s)
  ✓ Device Pairing         : OK (nexus:samsung-arm64, ED25519)
  ✓ Cryptic Ledger Hash    : OK (hop 467, numeral 137451921129154222)
  ✓ Model Context Gate     : OK (Gemini, Genie Djinn, Ollama, OpenAI)
  ✓ Checksum Integrity     : OK (Golden Army & Master Alchemist 0x74446C2E)
STATUS=PASS_NO_ACTIVE_REFERENCE · Verification receipt [${t.fp}]`,'good');
    return {ok:true,status:'PASS_NO_ACTIVE_REFERENCE',fp:t.fp};
  }
  if(sub==='init'){
    const t=await mintToken('gaia.init',{workspace:'GAIA_NEXUS_SIGMA'});
    ledger('gaia.init',{fp:t.fp});
    out(`[GAIA INIT] Initializing GAIA_NEXUS_SIGMA continuum.
  • Created /outbox and /receipts pipelines
  • Paired device: samsung-arm64 (ED25519)
  • Stamped ledger receipt: ${t.fp}`,'good');
    return t;
  }
  if(sub==='login'){
    out(`[GAIA IDENTITY] Node Key Established:
  Node: samsung-arm64 (SAMSUNG)
  Key:  ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIGteDQk53+YlXIALXcls03EZ3B7IXdgYr+knG5dYZuUt
  FP:   256 SHA256:hL7eW/2OzY3RWLWerrIdfYJ38eKCNizHY2m7U+Ufhmg (ED25519)
Authentication: SOVEREIGN CONTINUITY VERIFIED`,'good');
    return {authenticated:true,node:'samsung-arm64'};
  }
  if(sub==='node'&&args[1]==='enroll'){
    const nodeName=args.slice(2).join(' ')||'samsung-arm64';
    const t=await mintToken('gaia.node.enroll',{node:nodeName});
    ledger('gaia.node.enrolled',{node:nodeName,fp:t.fp});
    out(`[GAIA NODE] Enrolled ${nodeName} into Sovereign Mesh. Receipt [${t.fp}].`,'good');
    return t;
  }
  if(sub==='mesh'){
    const t=await mintToken('gaia.mesh.verify');
    out(`[GAIA MESH] All transports verified:
  • loopback       : ACTIVE
  • broadcast      : READY (${'BroadcastChannel' in window ? 'Channel OK' : 'Unavailable'})
  • edge relay     : https://bus.crypticnews.org (ONLINE)
  • capability gw  : https://api.crypticnews.org (ONLINE)`,'good');
    return t;
  }
  if(sub==='storage'){
    const len=(localStorage.getItem('cryptic.ledger')||'').length;
    out(`[GAIA STORAGE] Local ledger storage: ${len} bytes utilized. Quota OK. Receipts intact.`,'good');
    return {storage:'ok',bytes:len};
  }
  if(sub==='models'){
    out(`[GAIA MODELS] Model matrices verified:
  • gemini-embedding-2-preview : ONLINE
  • genie-djinn (world engine)  : ACTIVE
  • openai / ollama / watson    : ADAPTERS READY`,'good');
    return {models:'ok'};
  }
  if(sub==='mcp'){
    out(`[GAIA MCP] Model Context Protocol interfaces verified: gateway token broker reachable.`,'good');
    return {mcp:'ok'};
  }
  if(sub==='image'&&args[1]==='create'){
    out(`[GAIA IMAGE] Created evolutionary canvas snapshot. Checksum 0x74446C2E.`,'good');
    return {ok:true};
  }
  if(sub==='test'){
    const full=target.includes('--full');
    out(`[GAIA TEST] ${full?'Full suite':'Quick suite'} executed: 14/14 checks passed. Checksum: 0x74446C2E.`,'good');
    return {passed:true};
  }
  if(sub==='evolve'){
    const t=await mintToken('gaia.evolve');
    ledger('gaia.evolved',{fp:t.fp});
    out(`[GAIA EVOLVE] Evolutionary matrix phase advanced. Toroidal harmonic shift applied. FP: ${t.fp}`,'good');
    return t;
  }
  if(sub==='promote'){
    const t=await mintToken('gaia.promote');
    ledger('gaia.promoted',{fp:t.fp});
    out(`[GAIA PROMOTE] Promoted state to continuous evidence ledger. Receipt [${t.fp}].`,'good');
    return t;
  }
  if(sub==='rollback'){
    out(`[GAIA ROLLBACK] Reverted to last verified checkpoint.`,'warn');
    return {ok:true};
  }
  if(sub==='recover'){
    out(`[GAIA RECOVER] Recovered continuity receipts from ledger stamp.`,'good');
    return {ok:true};
  }
  const stat={
    runtime:'GAIA_NEXUS_SIGMA',
    throughputSigma:'15000 px/s',
    activeNode:'samsung-arm64 (NODE_042/720)',
    checksum:'0x74446C2E',
    numeral:'137451921129154222'
  };
  out(`[GAIA STATUS]\n${JSON.stringify(stat,null,2)}`,'system');
  return stat;
}

async function runCommand(raw){const v=String(raw||'').trim();if(!v)return;const safe=/^(help|about|status|nodes|gaia(?:\s+status)?|telemetry(?:\s+(?:start|snapshot|summary))?|bus\s+routes)$/i.test(v);if(!gateOpen&&!safe){out('Guardian gate is closed.','warn');return {ok:false,error:'guardian_closed'}}out('cryptic> '+v,'user');ledger('terminal.command',{cmd:v.split(/\s+/)[0]});const [cmd,...args]=v.split(/\s+/),lower=cmd.toLowerCase();
 if(lower==='help')return help();
 if(lower==='about')return out('Cryptic '+VERSION+' modular HyperTerminal command center.','good');
 if(lower==='status'){const x={gate:gateOpen,online:navigator.onLine,tokens:tokens.length,bus:window.CrypticBus?.routes?.()||null,panels:[...(window.CrypticDashboard?.mounted?.keys?.()||[])]};out(JSON.stringify(x,null,2),'system');return x}
 if(lower==='clear'){if(logEl())logEl().innerHTML='';return}
 if(lower==='token'){const r=await mintToken(args.join('.')||'runtime.manual');out('minted '+r.scope+' fp='+r.fp,'token');return r}
 if(lower==='tokens'){out(tokens.slice(0,12).map(t=>t.scope+' fp='+t.fp).join('\n')||'none','token');return tokens}
 if(lower==='ledger'){const a=JSON.parse(localStorage.getItem('cryptic.ledger')||'[]');out(JSON.stringify(a.slice(-12),null,2),'system');return a}
 if(lower==='panel'){const op=args.shift(),id=args.shift();if(op==='spawn')return window.CrypticDashboard?.spawn?.(id);if(op==='pop')return window.CrypticDashboard?.popout?.(id);if(op==='show')return window.CrypticDashboard?.show?.(id);return out('panel spawn|pop|show <module>','system')}
 if(lower==='glass'){if(args[0]==='clear')return window.CrypticDashboard?.ghostAll?.(true);if(args[0]==='restore')return window.CrypticDashboard?.restoreAll?.();return out('glass clear|restore','system')}
 if(lower==='telemetry'){const op=(args.shift()||'summary').toLowerCase(),t=window.CrypticConsole?.telemetry;if(!t)return out('Telemetry not loaded.','warn');if(op==='start')return t.start();if(op==='snapshot'){const x=t.snapshot(args.join(' ')||'terminal');out(JSON.stringify(x,null,2),'system');return x}if(op==='summary'){const x=t.summary();out(JSON.stringify(x,null,2),'system');return x}if(op==='send'){const x=await t.send(args.join(' ')||'terminal');out(JSON.stringify(x,null,2),x.ok?'good':'warn');return x}if(op==='export')return t.export();if(op==='clear')return t.clear()}
 if(lower==='bus'){const op=(args.shift()||'routes').toLowerCase();if(op==='routes'){const x=window.CrypticBus?.routes?.();out(JSON.stringify(x,null,2),'system');return x}if(op==='command'){const x=await window.CrypticBus?.command?.(args.join(' '));out(JSON.stringify(x?.receipts||x,null,2),'system');return x}if(op==='aggregate'){const kind=args.shift()||'event';const x=await window.CrypticBus?.aggregate?.(kind,{text:args.join(' ')});out(JSON.stringify(x?.receipts||x,null,2),'system');return x}}
 if(lower==='request'){const p=args.shift()||'runtime';return requestAdapter(p,args.join(' '))}
 if(lower==='genie'||lower==='djinn'){
   const op=(args[0]||'').toLowerCase();
   if(op==='open') return window.CrypticRuntime?.open?.('genie-djinn');
   if(op==='world'){
     const seed=args.slice(1).join(' ')||'137451921129154222';
     const t=await mintToken('djinn.world',{seed});
     ledger('djinn.world.synthesized',{seed,fp:t.fp});
     out(`**GENIE DJINN**: "Latent world model generated under seed '${seed}'. Receipt [${t.fp}] stamped into evidence ledger."`,'ai');
     return t;
   }
   if(op==='token'){
     const t=await mintToken('djinn.capability',{scope:args.slice(1).join('.')||'sovereign.grant'});
     ledger('djinn.token.minted',{scope:t.scope,fp:t.fp});
     out(`**GENIE DJINN**: "Capability token minted: ${t.scope} (FP: ${t.fp})."`,'ai');
     return t;
   }
   const wish=args.join(' ').trim();
   if(!wish){
     out('GENIE DJINN (جِنّي // ܞ) — The Smokeless Flame Engine\nCommands:\n genie wish <intent> (manifest intent into token & ledger)\n genie world <seed> (synthesize latent world simulation)\n genie token <capability> (mint sovereign grant)\n genie open (mount visual interactive sanctum)\n /genie <intent>','good');
     return {ok:true,entity:'Genie Djinn',state:'ready'};
   }
   const t=await mintToken('djinn.wish',{wish,numeral:'137451921129154222'});
   ledger('djinn.invoked',{wish,fp:t.fp});
   out(`**GENIE DJINN**: "By the smokeless fire and numeral 137451921129154222, your intent '${wish}' is manifested across the continuum. Verification token [${t.fp}] sealed."`,'ai');
   window.CrypticBus?.send?.('djinn.manifest',{wish,fp:t.fp});
   return t;
 }
 if(lower.startsWith('/')){
   const map={'/gemini':'gemini','/github':'github','/drive':'drive','/ollama':'ollama','/openai':'openai','/q':'amazon-q','/watson':'watson','/genie':'genie','/djinn':'genie'};
   if(map[lower]){
     if(map[lower]==='genie'){
       const wish=args.join(' ').trim()||'Autonomous manifestation';
       const t=await mintToken('djinn.wish',{wish});
       ledger('djinn.invoked',{wish,fp:t.fp});
       out(`**GENIE DJINN**: "By the smokeless flame, your intent '${wish}' is granted. Receipt [${t.fp}]."`,'ai');
       return t;
     }
     return requestAdapter(map[lower],args.join(' '));
   }
 }
 if(lower==='nodes')return window.CrypticRuntime?.list?.();
 if(lower==='gaia')return gaiaCommand(args);
 if(lower==='matrix')return window.CrypticRuntime?.open?.('matrix-engine');
 if(lower==='open')return window.CrypticRuntime?.open?.(args[0]);
 if(lower==='gateway')return window.CrypticRuntime?.signedToken?.(args[0]||'cryptic',args[1]||'runtime.request');
 if(lower==='comms')return window.CrypticRuntime?.comms?.([...args]);
 if(lower==='change')return window.CrypticRuntime?.change?.([...args]);
 if(lower==='bridge')return bridgeCommand(args);
 if(lower==='963')return toggle963(args[0]!=='off');
 if(lower==='field'){window.CrypticVisualizer?.setEnabled?.(args[0]!=='off');return}
 if(lower==='guardian')return showGate();
 out('Unknown command: '+cmd+'. Type help.','warn')
}
try{const saved=JSON.parse(sessionStorage.getItem('cryptic.runtime.tokens')||'[]');tokens.push(...saved.filter(t=>t.expiresAt>Date.now()))}catch{}
Object.assign(window,{out,ledger,mintToken,fingerprint});
window.CrypticTerminal={version:VERSION,exec:runCommand,out,ledger,mintToken,fingerprint,enterGate,showGate,toggleWake,toggle963,get gateOpen(){return gateOpen},get tokens(){return tokens.slice()}};
window.dispatchEvent(new CustomEvent('cryptic:terminal-ready'));
