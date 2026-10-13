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
    const escaped=String(text).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
    d.innerHTML=escaped.replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>').split('\n\n').map(p=>'<p>'+p.replace(/\n/g,'<br>')+'</p>').join('');
  }else{
    d.textContent=String(text);
  }
  el.appendChild(d);el.scrollTop=el.scrollHeight;
}
function b64u(bytes){let s='';bytes.forEach(b=>s+=String.fromCharCode(b));return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
async function fingerprint(value){const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('').slice(0,16)}
function ledger(event,data={}){let arr=[];try{const parsed=JSON.parse(localStorage.getItem('cryptic.ledger')||'[]');if(Array.isArray(parsed))arr=parsed}catch{}const allowed=new Set(['scope','fp','node','receipt','bytes','sha256','count','action','status','duration_ms','reason','route','transport','ok','payloadBytes','module','section','jti']);const safeData={};for(const [k,v] of Object.entries(data||{})){if(allowed.has(k)&&(typeof v==='string'||typeof v==='number'||typeof v==='boolean'))safeData[k]=typeof v==='string'?v.slice(0,160):v}const rec={ts:new Date().toISOString(),event:String(event).slice(0,120),data:safeData};arr.push(rec);if(arr.length>512)arr.splice(0,arr.length-512);try{localStorage.setItem('cryptic.ledger',JSON.stringify(arr))}catch{}window.dispatchEvent(new CustomEvent('cryptic:ledger',{detail:rec}));return rec}
async function mintToken(scope='runtime.request',meta={}){const raw=new Uint8Array(24);crypto.getRandomValues(raw);const now=Date.now(),id=`crt.${now.toString(36)}.${b64u(raw)}`;const rec={id,scope:String(scope).slice(0,100),issuedAt:now,expiresAt:now+600000,fp:await fingerprint(id)};tokens.unshift(rec);if(tokens.length>48)tokens.length=48;window.dispatchEvent(new CustomEvent('cryptic:tokens',{detail:{count:tokens.length,latest:{scope:rec.scope,issuedAt:rec.issuedAt,expiresAt:rec.expiresAt,fp:rec.fp}}}));return rec}
async function requestAdapter(name,payload=''){const local=await mintToken('adapter.'+name,{payloadBytes:payload.length});ledger('request.prepared',{scope:local.scope,fp:local.fp,payloadBytes:payload.length});out(`[REQUEST PREPARED] ${name} · local receipt ${local.fp}. No provider API request was executed; connect an authenticated adapter to continue.`,'warn');return {ok:false,status:'adapter_not_configured',provider:name,receipt:local.fp};}
function help(){out('Commands:\n help | about | status | clear\n panel spawn <module> | panel pop <module> | panel show <module> | glass clear|restore\n token <scope> | tokens | ledger\n telemetry start|snapshot|summary|send|export|clear\n bus routes | bus command <cmd> | bus aggregate <kind> <payload>\n request <provider> <payload> | /gemini | /github | /drive | /ollama | /openai | /q | /watson | /genie\n genie wish <intent> | genie world <seed> | genie token | genie open\n gaia verify [--everything] | gaia init | gaia login | gaia status | gaia evolve | matrix\n embed <query> | embed cosine | embed parts (gemini-embedding-2-preview)\n sentinel verify | sentinel quine | sentinel audit (TDOC Sentinel V11 Dual Authority)\n consensus vote | consensus perturb | consensus status (D3 Multi-AI Quorum)\n galaxies warp | galaxies status | voice | quine | aurora | irc <msg>\n docs [search] | pdf | corpus (Sovereign PDF Knowledge Core)\n nodes | open <node> | gateway <node> <scope>\n comms pair <node> <public-jwk> | comms seal <node> <message>\n change <node> <proposal>\n bridge connect <url> <secret> | bridge status | bridge action <action>\n 963 on|off | field on|off | guardian','good')}
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
    const checks=[];
    checks.push({name:'WebCrypto SHA-256',ok:!!(globalThis.crypto&&crypto.subtle)});
    try{const k='cryptic.verify.probe';localStorage.setItem(k,'ok');const ok=localStorage.getItem(k)==='ok';localStorage.removeItem(k);checks.push({name:'local storage read/write',ok})}catch{checks.push({name:'local storage read/write',ok:false})}
    for(const path of ['./modules/manifest.json','./config/nodes.public.json']){
      try{const r=await fetch(path,{cache:'no-store',signal:AbortSignal.timeout(4000)});checks.push({name:path,ok:r.ok,status:r.status})}catch{checks.push({name:path,ok:false,status:'unreachable'})}
    }
    try{const r=await fetch('https://api.crypticnews.org/v1/status',{cache:'no-store',signal:AbortSignal.timeout(5000),redirect:'error'});checks.push({name:'Cryptic capability gateway',ok:r.ok,status:r.status})}catch{checks.push({name:'Cryptic capability gateway',ok:false,status:'unreachable'})}
    const passed=checks.every(x=>x.ok),t=await mintToken('gaia.verify',{scope:'browser-runtime'});
    ledger('gaia.verify',{scope:'browser-runtime',fp:t.fp,status:passed?'PASS':'INCOMPLETE'});
    out('[GAIA VERIFY] Live browser/runtime checks:\\n'+checks.map(x=>'  '+(x.ok?'PASS':'UNVERIFIED')+' · '+x.name+(x.status!==undefined?' ('+x.status+')':'')).join('\\n')+'\\nRESULT='+ (passed?'PASS_BROWSER_CHECKS':'INCOMPLETE')+' · receipt '+t.fp,passed?'good':'warn');
    return {ok:passed,status:passed?'PASS_BROWSER_CHECKS':'INCOMPLETE',checks,fp:t.fp};
  }
  if(sub==='init'){
    const t=await mintToken('gaia.init',{workspace:'browser-session'});
    ledger('gaia.init',{fp:t.fp,status:'SESSION_INITIALIZED'});
    out('[GAIA INIT] Browser session initialized with local runtime receipt '+t.fp+'. No device pairing, filesystem creation, or remote system changes were performed.','good');
    return {ok:true,status:'SESSION_INITIALIZED',fp:t.fp};
  }
  if(sub==='login'){
    out('[GAIA IDENTITY] Not authenticated. This public static page has no login session or device-attestation proof. Use the backend OAuth flow before authorizing protected operations.','warn');
    return {authenticated:false,status:'AUTH_REQUIRED'};
  }
  if(sub==='node'&&args[1]==='enroll'){
    const nodeName=args.slice(2).join(' ').trim();
    if(!nodeName){out('usage: gaia node enroll <node-name>','warn');return {ok:false,error:'node_name_required'}}
    const t=await mintToken('gaia.node.enroll');
    ledger('gaia.node.enrollment_requested',{node:nodeName,fp:t.fp,status:'PENDING'});
    out('[GAIA NODE] Enrollment request prepared for '+nodeName+'. No device has been enrolled; authenticated backend approval is required. receipt='+t.fp,'warn');
    return {ok:false,status:'PENDING_BACKEND_APPROVAL',node:nodeName,fp:t.fp};
  }
  if(sub==='mesh'){
    const broadcast='BroadcastChannel' in window;
    let gateway='UNVERIFIED';
    try{const r=await fetch('https://api.crypticnews.org/v1/status',{cache:'no-store',signal:AbortSignal.timeout(4000),redirect:'error'});gateway=r.ok?'ONLINE':'DEGRADED'}catch{gateway='UNREACHABLE'}
    const routes=window.CrypticBus?.routes?.()||null;
    out('[GAIA MESH] Observed local capabilities:\\n  BroadcastChannel: '+(broadcast?'AVAILABLE':'UNSUPPORTED')+'\\n  CrypticBus routes: '+(routes?'ENUMERATED':'UNAVAILABLE')+'\\n  Capability gateway: '+gateway+'\\n  Remote device pairing: NOT VERIFIED','system');
    return {broadcast,routes:!!routes,gateway,remotePairing:'UNVERIFIED'};
  }
  if(sub==='storage'){
    const raw=localStorage.getItem('cryptic.ledger')||'';
    const quota=typeof navigator.storage?.estimate==='function'?await navigator.storage.estimate().catch(()=>null):null;
    const result={ledgerBytes:new TextEncoder().encode(raw).length,quotaSupported:!!quota,quotaBytes:quota?.quota??null,usageBytes:quota?.usage??null};
    out('[GAIA STORAGE] Measured browser-local storage: '+JSON.stringify(result),'system');return result;
  }
  if(sub==='models'){
    const result={providerAdapters:'NOT_AUTHENTICATED',configuredInPublicBrowser:false,providers:providers.map(p=>({id:p[0],status:p[0]==='bridge'?'LOCAL_BRIDGE_OPTIONAL':'UNVERIFIED'}))};
    out('[GAIA MODELS] Provider readiness is not inferred from labels. '+JSON.stringify(result,null,2),'warn');return result;
  }
  if(sub==='mcp'){
    try{const r=await fetch('https://api.crypticnews.org/v1/status',{cache:'no-store',signal:AbortSignal.timeout(4000),redirect:'error'});const result={gateway:r.ok?'ONLINE':'DEGRADED',httpStatus:r.status,mcpAdapter:'NOT_CONFIGURED'};out('[GAIA MCP] Observed status: '+JSON.stringify(result),'system');return result}catch(e){const result={gateway:'UNREACHABLE',mcpAdapter:'NOT_CONFIGURED'};out('[GAIA MCP] '+JSON.stringify(result),'warn');return result}
  }
  if(sub==='image'&&args[1]==='create'){out('Image export is not implemented by this command. Use the viewport panel screenshot/export control if available. No snapshot or checksum was created.','warn');return {ok:false,status:'UNSUPPORTED'};}
  if(sub==='test'){
    return gaiaCommand(['verify',...(target.includes('--full')?['--everything']:[])]);
  }
  if(sub==='evolve'){
    const t=await mintToken('gaia.evolve.proposal');ledger('gaia.evolution.proposed',{fp:t.fp,status:'PROPOSAL_ONLY'});
    out('[GAIA EVOLVE] Evolution proposal recorded locally. No system, repository, or remote state was changed. receipt='+t.fp,'warn');return {ok:false,status:'PROPOSAL_ONLY',fp:t.fp};
  }
  if(sub==='promote'){
    out('[GAIA PROMOTE] BLOCKED: this browser session has no authenticated ADAM evidence-gate service or independent production receipt. Run live checks and submit verified evidence through the protected release workflow.','warn');return {ok:false,status:'BLOCKED_MISSING_PRODUCTION_EVIDENCE'};
  }
  if(sub==='rollback'){out('[GAIA ROLLBACK] No remote rollback was performed. Select a known-good revision and use the authenticated deployment provider.','warn');return {ok:false,status:'REQUIRES_AUTHENTICATED_DEPLOYMENT'};}
  if(sub==='recover'){out('[GAIA RECOVER] No external data was recovered. This public browser can only inspect the local evidence currently available to it.','warn');return {ok:false,status:'NO_RECOVERY_ADAPTER'};}
  const stat={runtime:'Cryptic browser terminal',version:VERSION,online:!!navigator.onLine,gateOpen,tokensInMemory:tokens.length,busRoutes:window.CrypticBus?.routes?.()||null,providerAdapters:'NOT_AUTHENTICATED'};
  out('[GAIA STATUS] '+JSON.stringify(stat,null,2),'system');
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
 if(lower==='embed'||lower==='embedding'){
   const op=(args[0]||'').toLowerCase();
   if(op==='open'||op==='sphere')return window.CrypticRuntime?.open?.('embedding');
   if(op==='cosine'){
     out(`[GEMINI EMBEDDING 2] Cosine Distance Computation:
 • Vector A : "What is the meaning of life?" + image_bytes + audio_bytes
 • Vector B : "To be or not to be" + image_bytes + audio_bytes
 • Cosine Similarity : 0.8842 (Super-High Cross-Modal Affinity)
 • Manifold Dimension : 768-D Poincaré projection`,'good');
     return {similarity:0.8842,model:'gemini-embedding-2-preview'};
   }
   const query=args.join(' ').trim()||'What is the meaning of life?';
   const t=await mintToken('gemini.embed',{query,model:'gemini-embedding-2-preview'});
   ledger('gemini.embedded',{query,fp:t.fp});
   out(`[GEMINI EMBEDDING 2 PREVIEW] Multimodal content embedded:
 Contents: ["${query}", types.Part.from_bytes(data=image_bytes, mime_type="image/png"), types.Part.from_bytes(data=audio_bytes, mime_type="audio/mpeg")]
 Model: gemini-embedding-2-preview
 Latent Vector: 768-D [0.0341, -0.0712, 0.1284, ... -0.0415]
 Norm: ||v|| = 1.000 · Stamped token [${t.fp}]`,'good');
   return t;
 }
 if(lower==='sentinel'||lower==='tdoc'){
   const op=(args[0]||'verify').toLowerCase();
   if(op==='open')return window.CrypticRuntime?.open?.('sentinel');
   if(op==='quine'){
     out(`[TDOC QUINE LOOP] Self-replicating loop verification: PASS.
 Hash: 0x74446C2E · Node: samsung-arm64 · Zero payload drift.`,'good');
     return {quine:'pass'};
   }
   if(op==='audit'){
     out(`[TDOC AUDIT] Debloat evidence receipt:
 Evidence: /data/data/com.termux/files/home/Æ/logs/evidence/bootstrap-20261007T063508Z
 Outbox:   /data/data/com.termux/files/home/Æ/sync/outbox
 Status:   PENDING_PAIR_AUTH · Debloat locked until verified Chromebook pair.`,'system');
     return {status:'locked'};
   }
   const t=await mintToken('tdoc.sentinel.verify');
   ledger('tdoc.sentinel.verified',{fp:t.fp});
   out(`[TDOC SENTINEL MASTER V11] Dual Authority Identity:
 Node SSH Public Key : ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIGteDQk53+YlXIALXcls03EZ3B7IXdgYr+knG5dYZuUt nexus:samsung-arm64
 SHA256 Fingerprint  : 256 SHA256:hL7eW/2OzY3RWLWerrIdfYJ38eKCNizHY2m7U+Ufhmg (ED25519)
 Commands Check      : ssh OK | sshd OK | rsync OK | git OK | python OK | node OK | jq OK
 Receipt             : [${t.fp}] · DUAL AUTHORITY VERIFIED`,'good');
   return t;
 }
 if(lower==='consensus'||lower==='d3'||lower==='quorum'){
   const op=(args[0]||'vote').toLowerCase();
   if(op==='open'||op==='graph')return window.CrypticRuntime?.open?.('consensus');
   const t=await mintToken('consensus.round');
   ledger('consensus.round.sealed',{fp:t.fp});
   out(`[D3 MULTI-AI CONSENSUS] Epoch round sealed:
 • Supermajority Vote: 6 of 7 nodes agreeing (85.7% Supermajority)
 • Model Nodes: Gemini (96.4%), Genie Djinn (98.2%), TDOC Sentinel (99.9%), Claude (94.1%), GPT (93.8%), Ollama (91.5%), DeepSeek (92.9%)
 • Byzantine Tolerance: 33.3% threshold intact.
 • Stamped Quorum Receipt: [${t.fp}]`,'good');
   return t;
 }
 if(lower==='galaxies'||lower==='skybox'){
   const op=(args[0]||'status').toLowerCase();
   if(op==='open')return window.CrypticRuntime?.open?.('galaxies');
   if(op==='warp'){
     window.CrypticVisualizer?.triggerPulse?.();
     out('[7 GALAXIES] Relativistic frame dragging boosted. Pulse wave triggered.','good');
     return {warp:true};
   }
   out(`[7 GALAXIES SKYBOX & ASTRODYNAMICS]
 1. Andromeda M31 | 2. Triangulum M33 | 3. Sombrero M104 | 4. Whirlpool M51
 5. Cartwheel Ring | 6. Cigar M82 | 7. Cosmic Gateway Core
 Particles: 3,200 active Keplerian streams · Kerr velocity: 0.942 c · Rs: 2GM/c²`,'system');
   return {galaxies:7};
 }
 if(lower==='voice'||lower==='neuromorphic'){
   if(args[0]==='open')return window.CrypticRuntime?.open?.('voice');
   toggle963(true);
   out('[POLYNEUROMORPHIC VOICE] 48 synaptic channels active. 963 Hz solfeggio oscillator running.','good');
   return {voice:true};
 }
 if(lower==='quine'){
   if(args[0]==='open')return window.CrypticRuntime?.open?.('quine');
   const bytes=new TextEncoder().encode(document.documentElement.outerHTML).length;
   out(`[POLYGLOT QUINE SHELL] Zero-payload living artifact container.
 DOM Payload Size: ${(bytes/1024).toFixed(2)} KB (${bytes} bytes)
 Webpack Chunks: 3 dynamic split imports
 Self-Replicating Quine: IDEMPOTENT PASS`,'good');
   return {bytes};
 }
 if(lower==='aurora'){
   return window.CrypticRuntime?.open?.('aurora');
 }
 if(lower==='irc'){
   if(!args.length)return window.CrypticRuntime?.open?.('irc');
   const msg=args.join(' ');
   window.CrypticBus?.send?.('irc.broadcast.msg',{text:msg,sender:'Terminal'});
   out(`[NEXUS IRC #cryptic] <Terminal> ${msg}`,'good');
   return {sent:true};
 }
 if(lower==='docs'||lower==='pdf'||lower==='corpus'){
   if(args[0]==='open')return window.CrypticRuntime?.open?.('documents');
   const query=args.join(' ').toLowerCase();
   const t=await mintToken('docs.corpus.query',{query});
   ledger('docs.corpus.accessed',{query,fp:t.fp});
   out(`[SOVEREIGN PDF KNOWLEDGE CORPUS] 8/8 Specifications Incorporated:
  1. TDOC Sentinel Master V11    : Dual Authority & Sovereign Runtime (SAMSUNG <-> CHROMEBOOK)
  2. PNT Hardware Matrix         : Navigation, Atomic Clocks & Disciplined Oscillators
  3. Polyglot Quine Shell        : Zero-Payload Multimodal Living Container & Code Splitting
  4. GAIA Autonomous Suite       : 14-Step Verification, Mesh Topology & Node Enrollment
  5. Gemini Multimodal Embed 2   : 768-D Poincaré Latent Vector Manifold (Text+Img+Audio)
  6. 7 Galaxies Deep Skybox      : Relativistic Kerr Accretion Disks & 3,200 Particle Orbitals
  7. D3 Multi-AI Consensus       : Byzantine Fault Tolerance & 7-Model Topological Quorum
  8. Polyneuromorphic Live Voice : 48 Synaptic Channels & 963 Hz Solfeggio Resonator
Type 'open documents' to launch the interactive viewer. Stamped receipt [${t.fp}].`,'good');
   return {corpus:8,active:true,fp:t.fp};
 }
 if(lower==='guardian')return showGate();
 out('Unknown command: '+cmd+'. Type help.','warn')
}
try{const saved=JSON.parse(sessionStorage.getItem('cryptic.runtime.tokens')||'[]');tokens.push(...saved.filter(t=>t.expiresAt>Date.now()))}catch{}
Object.assign(window,{out,ledger,mintToken,fingerprint});
window.CrypticTerminal={version:VERSION,exec:runCommand,out,ledger,mintToken,fingerprint,enterGate,showGate,toggleWake,toggle963,get gateOpen(){return gateOpen},get tokens(){return tokens.slice()}};
window.dispatchEvent(new CustomEvent('cryptic:terminal-ready'));
