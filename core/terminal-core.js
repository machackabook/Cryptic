const VERSION='0.9.2';
const providers=[['gemini','Gemini'],['github','GitHub'],['drive','Google Drive'],['ollama','Ollama'],['openai','OpenAI'],['amazon-q','Amazon Q'],['watson','IBM Watson'],['bridge','Local Bridge'],['genie','Genie Djinn']];
const tokens=[];
try{sessionStorage.removeItem('cryptic.runtime.tokens')}catch{}
let gateOpen=false,oscillator=null,audioCtx=null,wakeLock=null,bridgeProfile=null;

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
function ledger(event,data={}){const allowed=new Set(['scope','fp','node','receipt','bytes','sha256','count','action','status','duration_ms','reason','route','transport','ok','payloadBytes','module','section','jti']);const clean=value=>{const result={};for(const [k,v] of Object.entries(value||{})){if(allowed.has(k)&&(typeof v==='string'||typeof v==='number'||typeof v==='boolean'))result[k]=typeof v==='string'?v.slice(0,160):v}return result};let previous=[];try{const parsed=JSON.parse(localStorage.getItem('cryptic.ledger')||'[]');if(Array.isArray(parsed))previous=parsed.map(r=>({ts:String(r.ts||''),event:String(r.event||'legacy').slice(0,120),data:clean(r.data)}))}catch{}const rec={ts:new Date().toISOString(),event:String(event).slice(0,120),data:clean(data)};previous.push(rec);if(previous.length>512)previous.splice(0,previous.length-512);try{localStorage.setItem('cryptic.ledger',JSON.stringify(previous))}catch{}window.dispatchEvent(new CustomEvent('cryptic:ledger',{detail:rec}));return rec}
async function mintToken(scope='runtime.request',meta={}){const raw=new Uint8Array(24);crypto.getRandomValues(raw);const now=Date.now(),id=`crt.${now.toString(36)}.${b64u(raw)}`;const rec={id,scope:String(scope).slice(0,100),issuedAt:now,expiresAt:now+600000,fp:await fingerprint(id)};tokens.unshift(rec);if(tokens.length>48)tokens.length=48;window.dispatchEvent(new CustomEvent('cryptic:tokens',{detail:{count:tokens.length,latest:{scope:rec.scope,issuedAt:rec.issuedAt,expiresAt:rec.expiresAt,fp:rec.fp}}}));return rec}
async function requestAdapter(name,payload=''){const local=await mintToken('adapter.'+name,{payloadBytes:payload.length});ledger('request.prepared',{scope:local.scope,fp:local.fp,payloadBytes:payload.length});out(`[REQUEST PREPARED] ${name} · local receipt ${local.fp}. No provider API request was executed; connect an authenticated adapter to continue.`,'warn');return {ok:false,status:'adapter_not_configured',provider:name,receipt:local.fp};}
function help(){out('Commands:\n help | about | status | clear\n panel spawn <module> | panel pop <module> | panel show <module> | glass clear|restore\n token <scope> | tokens | ledger\n telemetry start|snapshot|summary|send|export|clear\n bus routes | bus command <cmd> | bus aggregate <kind> <payload>\n request <provider> <payload> | /gemini | /github | /drive | /ollama | /openai | /q | /watson | /genie\n genie wish <intent> | genie world <seed> | genie token | genie open\n gaia verify [--everything] | gaia init | gaia login | gaia status | gaia evolve | matrix\n embed <query> | embed cosine | embed parts (gemini-embedding-2-preview)\n sentinel verify | sentinel quine | sentinel audit (TDOC Sentinel V11 Dual Authority)\n consensus vote | consensus perturb | consensus status (D3 Multi-AI Quorum)\n galaxies warp | galaxies status | voice | quine | aurora | irc <msg>\n docs [search] | pdf | corpus (Sovereign PDF Knowledge Core)\n nodes | open <node> | gateway <node> <scope>\n comms pair <node> <public-jwk> | comms seal <node> <message>\n change <node> <proposal>\n bridge connect <url> <secret> | bridge status | bridge action <action>\n 963 on|off | field on|off | guardian','good')}
async function bridgeStatus(){const url=bridgeProfile?.url,secret=bridgeProfile?.secret;if(!url||!secret){out('Bridge not connected in this tab session.','warn');return {ok:false,status:'NOT_CONNECTED'}}try{const r=await fetch(url.replace(/\/$/,'')+'/health',{headers:{Authorization:'Bearer '+secret},cache:'no-store',redirect:'error',signal:AbortSignal.timeout(4000)}),j=await r.json();out('Bridge '+(r.ok?'ONLINE ':'DENIED ')+JSON.stringify({ok:j.ok,runtime:j.runtime,version:j.version,actions:j.actions}),r.ok?'good':'bad');return j}catch(e){out('Bridge unreachable: '+e.message,'bad');return {ok:false,error:e.message}}}
async function bridgeCommand(args){if(args[0]==='connect'){if(!args[1]||!args[2])return out('usage: bridge connect http://127.0.0.1:7331 <session-secret>','warn');let u;try{u=new URL(args[1])}catch{return out('Invalid bridge URL.','warn')}if(u.protocol!=='http:'||!['127.0.0.1','localhost','[::1]'].includes(u.hostname)||u.port!=='7331'||u.username||u.password||u.search||u.hash)return out('Bridge URL must be loopback HTTP on port 7331 with no credentials, query, or fragment.','warn');if(String(args[2]).length<32)return out('Bridge session secret is too short; use the generated 48-character hex secret.','warn');bridgeProfile={url:u.origin,secret:String(args[2])};const t=await mintToken('bridge.connect');out('Bridge connection profile kept in memory for this tab only. It is not written to browser storage. fp='+t.fp,'token');return bridgeStatus()}if(args[0]==='action')return window.CrypticRuntime?.bridgeAction?.(args[1]);return bridgeStatus()}
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
     const seed=args.slice(1).join(' ').trim()||'137451921129154222';
     const t=await mintToken('djinn.world.proposal');
     ledger('djinn.world.requested',{fp:t.fp});
     out('[GENIE DJINN] World-generation request recorded locally (seed fingerprint only). No model was invoked and no world was generated. receipt='+t.fp,'warn');
     return {ok:false,status:'MODEL_ADAPTER_NOT_CONFIGURED',seedProvided:Boolean(seed),receipt:t.fp};
   }
   if(op==='token'){
     const t=await mintToken('djinn.request.receipt');
     ledger('djinn.request.receipt',{scope:t.scope,fp:t.fp});
     out('[GENIE DJINN] Local correlation receipt minted. This is not a provider capability or authorization grant. fp='+t.fp,'warn');
     return {ok:false,status:'LOCAL_RECEIPT_ONLY',fp:t.fp};
   }
   const wish=args.join(' ').trim();
   if(!wish){
     out('GENIE DJINN (جِنّي // ܞ) — The Smokeless Flame Engine\nCommands:\n genie wish <intent> (manifest intent into token & ledger)\n genie world <seed> (synthesize latent world simulation)\n genie token <capability> (mint sovereign grant)\n genie open (mount visual interactive sanctum)\n /genie <intent>','good');
     return {ok:true,entity:'Genie Djinn',state:'ready'};
   }
   const t=await mintToken('djinn.wish.request');
   ledger('djinn.wish.requested',{fp:t.fp});
   out('[GENIE DJINN] Intent request recorded as a local receipt only. No external model call or action occurred. receipt='+t.fp,'warn');
   return {ok:false,status:'MODEL_ADAPTER_NOT_CONFIGURED',fp:t.fp};
 }
 if(lower.startsWith('/')){
   const map={'/gemini':'gemini','/github':'github','/drive':'drive','/ollama':'ollama','/openai':'openai','/q':'amazon-q','/watson':'watson','/genie':'genie','/djinn':'genie'};
   if(map[lower]){
     if(map[lower]==='genie'){
       const t=await mintToken('djinn.wish.request');
       ledger('djinn.wish.requested',{fp:t.fp});
       out('[GENIE DJINN] Intent request recorded locally only. No model call or action occurred. receipt='+t.fp,'warn');
       return {ok:false,status:'MODEL_ADAPTER_NOT_CONFIGURED',fp:t.fp};
     }
     return requestAdapter(map[lower],args.join(' '));
   }
 }
 if(lower==='nodes')return window.CrypticRuntime?.list?.();
 if(lower==='gaia')return gaiaCommand(args);
 if(lower==='matrix')return window.CrypticRuntime?.open?.('matrix');
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
     out('[EMBEDDING] Cosine similarity requires two real embedding vectors. No sample vectors or model adapter are configured, so no similarity score was produced.','warn');
     return {ok:false,status:'EMBEDDING_ADAPTER_NOT_CONFIGURED'};
   }
   const t=await mintToken('gemini.embed.request');
   ledger('gemini.embedding.requested',{fp:t.fp});
   out('[EMBEDDING] Request receipt created, but no embedding API was called. Configure an authenticated Gemini embedding adapter to produce a real vector. receipt='+t.fp,'warn');
   return {ok:false,status:'EMBEDDING_ADAPTER_NOT_CONFIGURED',fp:t.fp};
 }
 if(lower==='sentinel'||lower==='tdoc'){
   const op=(args[0]||'verify').toLowerCase();
   if(op==='open')return window.CrypticRuntime?.open?.('sentinel');
   if(op==='quine'){
     out('[TDOC QUINE] No independent quine verifier is wired to this command. No verification pass is claimed.','warn');
     return {ok:false,status:'VERIFIER_NOT_CONFIGURED'};
   }
   if(op==='audit'){
     out('[TDOC AUDIT] Local evidence bridge is not connected in this browser session. No device paths, pair state, or debloat status can be verified from this public page.','warn');
     return {ok:false,status:'LOCAL_BRIDGE_NOT_CONNECTED'};
   }
   const t=await mintToken('tdoc.sentinel.request');
   ledger('tdoc.sentinel.requested',{fp:t.fp,status:'UNVERIFIED'});
   out('[TDOC SENTINEL] Verification request receipt created. No SSH identity, device pairing, command inventory, or dual-authority authentication was checked. Connect the authenticated local bridge to verify those claims. receipt='+t.fp,'warn');
   return {ok:false,status:'VERIFIER_NOT_CONNECTED',fp:t.fp};
 }
 if(lower==='consensus'||lower==='d3'||lower==='quorum'){
   const op=(args[0]||'vote').toLowerCase();
   if(op==='open'||op==='graph')return window.CrypticRuntime?.open?.('consensus');
   const configured=window.CrypticConsensus;
   if(!configured||typeof configured.vote!=='function'){
     out('[D3 CONSENSUS] No live multi-model quorum adapter is connected. No votes, model scores, or Byzantine quorum were computed.','warn');
     return {ok:false,status:'CONSENSUS_ADAPTER_NOT_CONFIGURED'};
   }
   const result=await configured.vote({scope:'cryptic-browser'});
   const valid=Boolean(result&&Array.isArray(result.votes)&&result.votes.length>0&&result.verified===true);
   if(valid){ledger('consensus.round.completed',{count:result.votes.length,status:'VERIFIED'});out('[D3 CONSENSUS] Verified adapter result: '+JSON.stringify({votes:result.votes.length,quorum:result.quorum,status:result.status}),'good');}
   else out('[D3 CONSENSUS] Adapter returned no independently verifiable quorum.','warn');
   return {ok:valid,status:valid?'VERIFIED':'UNVERIFIED',result:valid?result:undefined};
 }
 if(lower==='galaxies'||lower==='skybox'){
   const op=(args[0]||'status').toLowerCase();
   if(op==='open')return window.CrypticRuntime?.open?.('galaxies');
   if(op==='warp'){
     window.CrypticVisualizer?.triggerPulse?.();
     out('[7 GALAXIES] Relativistic frame dragging boosted. Pulse wave triggered.','good');
     return {warp:true};
   }
   out('[7 GALAXIES SKYBOX] Visual panel is available for rendering. Physical telemetry and relativistic measurements are not connected or measured by this command.','system');
   return {galaxies:7,status:'VISUALIZATION_ONLY'};
 }
 if(lower==='voice'||lower==='neuromorphic'){
   if(args[0]==='open')return window.CrypticRuntime?.open?.('voice');
   try{await toggle963(true);out('[VOICE] 963 Hz oscillator requested. Browser speech input/output and 48-channel neural processing are not configured by this command.','warn');return {oscillator:'requested',speechAdapter:'NOT_CONFIGURED'}}catch(e){out('[VOICE] Audio unavailable: '+e.message,'warn');return {oscillator:'UNAVAILABLE',speechAdapter:'NOT_CONFIGURED'}}
 }
 if(lower==='quine'){
   if(args[0]==='open')return window.CrypticRuntime?.open?.('quine');
   const bytes=new TextEncoder().encode(document.documentElement.outerHTML).length;
   out('[POLYGLOT QUINE SHELL] Measured current DOM size: '+(bytes/1024).toFixed(2)+' KB ('+bytes+' bytes). No self-replication, idempotence test, or chunk inventory was performed.','system');
   return {bytes,status:'DOM_MEASURED_ONLY'};
 }
 if(lower==='aurora'){
   out('Aurora is an alias for the Visualizer module in this build. Opening the visualizer; no external model is invoked.','system');
   return window.CrypticRuntime?.open?.('visualizer');
 }
 if(lower==='irc'){
   if(!args.length)return window.CrypticRuntime?.open?.('irc');
   const msg=args.join(' ');
   const result=await window.CrypticBus?.send?.('irc.broadcast.msg',{text:msg,sender:'Terminal'});
   const sent=Boolean(result&&result.ok===true);
   out('[NEXUS IRC] '+(sent?'Message handed to a bus route.':'No confirmed message transport receipt returned. No server delivery is claimed.'),'warn');
   return {sent,status:sent?'BUS_ACCEPTED':'UNCONFIRMED',receipt:result||null};
 }
 if(lower==='docs'||lower==='pdf'||lower==='corpus'){
   if(args[0]==='open')return window.CrypticRuntime?.open?.('documents');
   const query=args.join(' ').trim();
   if(!query){out('[DOCUMENT CORPUS] No query supplied. Open the Documents panel to inspect available local content.','system');return {ok:true,status:'PANEL_AVAILABLE'}}
   out('[DOCUMENT CORPUS] Local document search is not connected to an indexed corpus in this command. No result count or specifications are claimed. Open the Documents panel or connect a real search adapter.','warn');
   return {ok:false,status:'DOCUMENT_SEARCH_NOT_CONFIGURED'};
 }
 if(lower==='guardian')return showGate();
 out('Unknown command: '+cmd+'. Type help.','warn')
}
Object.assign(window,{out,ledger,mintToken,fingerprint});
window.CrypticTerminal={version:VERSION,exec:runCommand,out,ledger,mintToken,fingerprint,enterGate,showGate,toggleWake,toggle963,get gateOpen(){return gateOpen},get tokens(){return tokens.slice()}};
window.dispatchEvent(new CustomEvent('cryptic:terminal-ready'));
