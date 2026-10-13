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
    // Render lightweight bold Markdown as DOM text, never as executable HTML.
    for (const [pi,paragraph] of String(text).split('\n\n').entries()) {
      if(pi) d.appendChild(document.createTextNode('\n\n'));
      const p=document.createElement('p');
      for(const [li,line] of paragraph.split('\n').entries()){
        if(li)p.appendChild(document.createElement('br'));
        const chunks=line.split(/(\*\*[^*]+\*\*)/g);
        for(const chunk of chunks){
          if(!chunk)continue;
          if(chunk.startsWith('**')&&chunk.endsWith('**')&&chunk.length>4){
            const strong=document.createElement('strong');strong.textContent=chunk.slice(2,-2);p.appendChild(strong);
          }else p.appendChild(document.createTextNode(chunk));
        }
      }
      d.appendChild(p);
    }
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
// Bridge secrets are memory-only, never sessionStorage/localStorage or URL parameters.
try{sessionStorage.removeItem('cryptic.bridge.secret');sessionStorage.removeItem('cryptic.bridge.url')}catch{}
const CrypticBridgeSession=(()=>{
  let state=null;
  return Object.freeze({
    active:()=>Boolean(state),
    connect(raw,secret){
      const u=new URL(raw);
      if(u.protocol!=='http:'||!['127.0.0.1','localhost','[::1]'].includes(u.hostname)
        ||u.username||u.password||u.search||u.hash||!u.port||u.pathname!=='/'){
        throw new Error('Bridge must be an exact loopback http://HOST:PORT/ origin with no credentials, path, or query');
      }
      if(!secret||String(secret).length<24)throw new Error('Bridge secret must be at least 24 characters');
      state={url:u.origin,secret:String(secret)};
      return u.origin;
    },
    disconnect(){state=null},
    async request(route,{token=null,body=null}={}){
      if(!state)throw new Error('Bridge not connected');
      const allowed=['/health','/v1/action','/v1/bus'];
      if(!allowed.includes(route))throw new Error('Unapproved bridge route');
      const method=route==='/health'?'GET':'POST';
      return fetch(state.url+route,{
        method,mode:'cors',credentials:'omit',cache:'no-store',redirect:'error',
        headers:{Authorization:'Bearer '+state.secret,...(method==='POST'?{'content-type':'application/json','x-cryptic-request-token':String(token||'')}:{})},
        ...(method==='POST'?{body:JSON.stringify(body||{})}:{})
      });
    }
  });
})();
window.CrypticBridgeSession=CrypticBridgeSession;
async function bridgeStatus(){
  if(!CrypticBridgeSession.active()){out('Bridge not connected.','warn');return {ok:false}}
  try{const r=await CrypticBridgeSession.request('/health'),j=await r.json();out('Bridge '+(r.ok?'ONLINE ':'DENIED ')+JSON.stringify(j),r.ok?'good':'bad');return j}
  catch(e){out('Bridge unreachable: '+e.message,'bad');return {ok:false,error:e.message}}
}
async function bridgeCommand(args){
  if(args[0]==='disconnect'){CrypticBridgeSession.disconnect();out('Bridge disconnected; secret cleared from page memory.','system');return {ok:true}}
  if(args[0]==='connect'){
    if(!args[1]||!args[2])return out('usage: bridge connect <loopback-url> <secret>','warn');
    try{
      const origin=CrypticBridgeSession.connect(args[1],args[2]);
      const t=await mintToken('bridge.connect',{origin});
      out('Bridge profile retained in volatile memory only. fp='+t.fp,'token');
      return bridgeStatus();
    }catch(e){out('Bridge connection rejected: '+e.message,'warn');return {ok:false,error:e.message}}
  }
  if(args[0]==='action')return window.CrypticRuntime?.bridgeAction?.(args[1]);
  return bridgeStatus();
}
async function toggle963(on){if(on&&oscillator)return;if(!on&&oscillator){oscillator.stop();oscillator.disconnect();oscillator=null;out('963 Hz oscillator stopped.','system');return}if(on){audioCtx=audioCtx||new (window.AudioContext||window.webkitAudioContext)();const g=audioCtx.createGain();g.gain.value=.022;oscillator=audioCtx.createOscillator();oscillator.frequency.value=963;oscillator.type='sine';oscillator.connect(g).connect(audioCtx.destination);oscillator.start();const t=await mintToken('audio.963.start');out('963 Hz sonification active. fp='+t.fp,'good')}}
function showGate(){const g=document.getElementById('guardianLayer');if(g){g.style.display='grid';g.style.opacity='1'}gateOpen=false;window.dispatchEvent(new CustomEvent('cryptic:gate',{detail:{open:false}}))}
async function enterGate(){const t=await mintToken('guardian.entry');gateOpen=true;const g=document.getElementById('guardianLayer');if(g){g.style.opacity='0';setTimeout(()=>g.style.display='none',500)}ledger('guardian.entry',{fp:t.fp});out('CRYPTIC '+VERSION+' initialized. Guardian receipt '+t.fp+'.','good');out('Modular snap dashboard online. Type help.','system');window.dispatchEvent(new CustomEvent('cryptic:guardian-entered',{detail:{fingerprint:t.fp}}));window.dispatchEvent(new CustomEvent('cryptic:gate',{detail:{open:true}}));return t}
async function toggleWake(){try{if(wakeLock){await wakeLock.release();wakeLock=null;return false}wakeLock=await navigator.wakeLock.request('screen');return true}catch(e){out('Wake Lock unavailable: '+e.message,'warn');return false}}
async function gaiaCommand(args){
  const sub=(args[0]||'status').toLowerCase();
  const browser={
    secure_context:window.isSecureContext===true,
    web_crypto:Boolean(globalThis.crypto?.subtle),
    broadcast_channel:'BroadcastChannel' in window,
    guardian_entered:gateOpen,
    bridge_session_connected:Boolean(window.CrypticBridgeSession?.active()),
    bus_loaded:Boolean(window.CrypticBus?.routes)
  };
  if(sub==='status'||sub==='mesh'){
    const info={scope:'browser-local',verification:'OBSERVED_LOCAL_ONLY',checks:browser,
      remote_gateway:'NOT_VERIFIED',private_devices:'NOT_VERIFIED',models:'NOT_VERIFIED'};
    out('[GAIA '+sub.toUpperCase()+']\\n'+JSON.stringify(info,null,2),'system');
    return info;
  }
  if(sub==='verify'||sub==='test'){
    const checks={...browser,storage_access:(()=>{try{return typeof localStorage!=='undefined'}catch{return false}})()};
    const info={ok:false,production_verified:false,status:'ADAM_PROOF_PENDING',checks,
      reason:'Browser capability presence does not prove paired devices, models, network services, cryptographic attestation, or production gates.'};
    ledger('gaia.audit.local',{mode:sub,checks,status:info.status});
    out('[GAIA '+sub.toUpperCase()+'] LOCAL OBSERVATION ONLY\\n'+JSON.stringify(info,null,2),'warn');
    return info;
  }
  if(sub==='storage'){
    try{
      const bytes=new TextEncoder().encode(localStorage.getItem('cryptic.ledger')||'').length;
      const info={ok:true,scope:'localStorage current origin',ledger_bytes:bytes,quota:'NOT_TESTED',remote_backup:'NOT_VERIFIED'};
      out(JSON.stringify(info,null,2),'system');return info;
    }catch(e){out('Local storage unavailable: '+e.message,'warn');return {ok:false,error:'storage_unavailable'}}
  }
  const intent=['init','login','node','models','mcp','image','evolve','promote','rollback','recover'].includes(sub);
  if(intent){
    const receipt=await mintToken('gaia.intent.'+sub,{arg_count:args.length-1});
    ledger('gaia.intent.recorded',{operation:sub,fp:receipt.fp});
    const result={ok:false,applied:false,status:'REQUIRES_AUTHENTICATED_ADAPTER_AND_ADAM_PROOF',operation:sub,receipt:receipt.fp};
    out('[GAIA] Intent recorded, NOT executed or production verified: '+sub+'. Receipt '+receipt.fp,'warn');
    return result;
  }
  out('GAIA commands: status | mesh | storage | verify | test | init | login | models | mcp | evolve | promote | rollback | recover','system');
  return {ok:false,error:'unknown_gaia_command'};
}
async function runCommand(raw){const v=String(raw||'').trim();if(!v)return;const safe=/^(help|about|status|nodes|gaia(?:\s+status)?|telemetry(?:\s+(?:start|snapshot|summary))?|bus\s+routes)$/i.test(v);if(!gateOpen&&!safe){out('Guardian gate is closed.','warn');return {ok:false,error:'guardian_closed'}}out('cryptic> '+(/^bridge\s+connect\s+/i.test(v)?'bridge connect [LOCAL URL] [REDACTED SECRET]':v),'user');ledger('terminal.command',{cmd:v.split(/\s+/)[0]});const [cmd,...args]=v.split(/\s+/),lower=cmd.toLowerCase();
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
