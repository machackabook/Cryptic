(function () {
'use strict';
const $ = (id) => document.getElementById(id);
const KEY = 'cryptic.polyglot.public.ledger.v1';
let ledger = [];
function load() { try { const a = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(a) ? a.filter(v => v && typeof v.event === 'string' && typeof v.at === 'string').slice(-150) : []; } catch { return []; } }
function persist() { try { localStorage.setItem(KEY, JSON.stringify(ledger.slice(-150))); return true; } catch { return false; } }
function record(event, detail) { ledger.push({at:new Date().toISOString(),event:String(event).slice(0,48),detail:String(detail||'').slice(0,90)}); ledger=ledger.slice(-150); persist(); $('ledger-state').textContent = String(ledger.length) + ' LOCAL EVENTS'; }
function print(text, cls='info') { const p=document.createElement('p');p.className='line '+cls;p.textContent=String(text);$('output').appendChild(p);$('output').scrollTop=$('output').scrollHeight; }
function caps() {
  let storage = false;
  try { const k='__cryptic_storage_probe__';localStorage.setItem(k,'ok');storage=localStorage.getItem(k)==='ok';localStorage.removeItem(k); } catch {}
  const subtle=Boolean(window.isSecureContext && typeof crypto !== 'undefined' && crypto.subtle);
  return { secure:window.isSecureContext, cryptography:subtle, storage, speech:'speechSynthesis' in window, audio:typeof AudioContext!=='undefined' || typeof webkitAudioContext!=='undefined', webgl:(()=>{try{const c=document.createElement('canvas');return Boolean(c.getContext('webgl2')||c.getContext('webgl'));}catch{return false}})(), serviceWorker:'serviceWorker' in navigator, privateAdapters:false };
}
const yes=(on)=>on?'AVAILABLE':'UNAVAILABLE';
function updateCaps(){const c=caps();$('secure-state').textContent=yes(c.secure);$('crypto-state').textContent=yes(c.cryptography);$('storage-state').textContent=yes(c.storage);$('voice-state').textContent=yes(c.speech);$('runtime-state').textContent='BROWSER LOCAL';$('ledger-state').textContent=String(ledger.length)+' LOCAL EVENTS';return c;}
function speak(t) { if (!('speechSynthesis' in window)) {print('Speech synthesis unsupported on this browser.','error');return;} speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(String(t).slice(0,350));u.rate=1;u.pitch=1;speechSynthesis.speak(u);record('voice.speak','user activated');print('Speech synthesis requested by user.','ok'); }
function download(name, content, mime) { const b=new Blob([content],{type:mime});const url=URL.createObjectURL(b);const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),2000); }
async function exportQuine() {
 try {
  record('artifact.export','single-file HTML');
  const [s,j] = await Promise.all([fetch('./polyglot-public.css',{cache:'no-store'}),fetch('./polyglot-public.js',{cache:'no-store'})]);
  if (!s.ok||!j.ok) throw Error('Could not load same-origin source assets');
  const [css,js]=await Promise.all([s.text(),j.text()]);
  const clone=document.documentElement.cloneNode(true);
  clone.querySelector('meta[http-equiv="Content-Security-Policy"]')?.remove();
  clone.querySelector('link[rel="manifest"]')?.remove();
  clone.querySelector('link[rel="canonical"]')?.remove();
  clone.querySelectorAll('link[rel="stylesheet"]').forEach(x=>x.remove());
  clone.querySelectorAll('script[src]').forEach(x=>x.remove());
  const canvas=clone.querySelector('#field');if(canvas){const fresh=document.createElement('canvas');fresh.id='field';fresh.setAttribute('aria-hidden','true');canvas.replaceWith(fresh);}clone.querySelector('#output')?.replaceChildren();
  const style=document.createElement('style');style.textContent=css;clone.querySelector('head').appendChild(style);
  const rehydrate=document.createElement('script');rehydrate.textContent='window.__CRYPTIC_REHYDRATE__ = '+JSON.stringify(ledger).replace(/</g,'\\u003c')+';';clone.querySelector('body').appendChild(rehydrate);
  const script=document.createElement('script');script.textContent=js.replace(/<\/script/gi,'<\\/script');clone.querySelector('body').appendChild(script);
  clone.querySelector('title').textContent='Cryptic Polyglot Quine OS / Exported Public Shell';
  download('CRYPTIC_POLYGLOT_QUINE_'+Date.now()+'.html','<!doctype html>\n'+clone.outerHTML,'text/html;charset=utf-8');
  print('Exported this public shell as a single-file successor with '+ledger.length+' local ledger event(s). External source links still require connectivity.','ok');
 } catch(e){print('Export unavailable: '+e.message,'error');record('artifact.export.error',e.message);}
}
async function sha(input) {
 if(!caps().cryptography){print('SHA-256 requires a secure browser context and Web Crypto.','error');return;}
 const bytes=new TextEncoder().encode(input);const digest=await crypto.subtle.digest('SHA-256',bytes);const hex=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
 print('SHA-256 ('+bytes.length+' bytes):\n'+hex,'ok');record('hash.sha256','input length '+bytes.length);
}
function formatLedger(){if(!ledger.length){print('Ledger empty. Run an actual command to record an event.');return;}print(ledger.slice(-16).map(x=>x.at+' · '+x.event+' · '+x.detail).join('\n'));}
async function run(raw) {
 const line=String(raw||'').trim();if(!line)return;
 print('ARCHITECT@PUBLIC:~$ '+line,'input');
 const parts=line.split(/\s+/),cmd=parts[0].toLowerCase(),arg=line.slice(parts[0].length).trim();
 try {
  if(cmd==='help'){print('COMMANDS\nhelp       Available commands\nstatus     Actual browser-runtime status\ncaps       Browser capability probe\nhash TEXT  SHA-256 with Web Crypto\nsay TEXT   Speak with local Web Speech\nledger     Local metadata event receipts\nexport     Export executable single-file successor\nimport     Select a local JSON ledger\napi        Explicit request to Cryptic API /status\nsource     Open authoritative Polyglot source\nlegacy     Open preserved old interface\ntime       Current local / UTC time\nclear      Clear terminal output');}
  else if(cmd==='status'){const c=updateCaps();print('CRYPTIC POLYGLOT PUBLIC SHELL\nOrigin: '+location.origin+'\nExecution: browser sandbox\nContext: '+(c.secure?'secure':'not secure')+'\nProvider APIs: not configured\nPrivate device bridge: not connected\nFull React engine: separate source project\nLedger events: '+ledger.length,'ok');}
  else if(cmd==='caps'){const c=updateCaps();print(Object.entries(c).map(([k,v])=>k+': '+(v?'AVAILABLE':'UNAVAILABLE')).join('\n'));}
  else if(cmd==='time'){print('UTC: '+new Date().toISOString()+'\nLOCAL: '+new Date().toString());}
  else if(cmd==='ledger'){formatLedger();}
  else if(cmd==='hash'){if(!arg)print('Usage: hash TEXT','error');else await sha(arg);}
  else if(cmd==='say'){if(!arg)print('Usage: say TEXT','error');else speak(arg);}
  else if(cmd==='export'){await exportQuine();}
  else if(cmd==='import'){$('import-file').click();return;}
  else if(cmd==='source'){window.open('https://github.com/machackabook/HyperPolyGlot-SOS-','_blank','noopener,noreferrer');print('Opened authoritative source (subject to popup permissions).');}
  else if(cmd==='legacy'){location.href='./legacy.html';return;}
  else if(cmd==='api'){
    print('Requesting https://api.crypticnews.org/status by explicit command…');
    try{const c=new AbortController();const id=setTimeout(()=>c.abort(),6500);const r=await fetch('https://api.crypticnews.org/status',{signal:c.signal,cache:'no-store'});clearTimeout(id);print('Gateway HTTP '+r.status+'. Reachability only—not proof of authentication or inference.',r.ok?'ok':'error');record('api.http','status '+r.status);}catch(e){print('Gateway unavailable or blocked: '+e.name,'error');record('api.unavailable',e.name);}
  }
  else if(cmd==='clear'){$('output').replaceChildren();return;}
  else {print('Unknown command: '+cmd+'. Type help.','error');}
  if(cmd!=='hash'&&cmd!=='say'&&cmd!=='export'&&cmd!=='api') record('command.'+cmd,'browser-local');
 }catch(e){print('Command failed: '+(e.message||'unknown error'),'error');record('command.error',cmd);}
}
const form=$('command-form');form.addEventListener('submit',e=>{e.preventDefault();const v=$('command').value;$('command').value='';void run(v);});
document.querySelectorAll('[data-run]').forEach(b=>b.addEventListener('click',()=>{void run(b.dataset.run);}));
$('voice-button').addEventListener('click',()=>speak('Cryptic Polyglot public shell. Browser local runtime active. Private adapters not connected.'));
$('import-button').addEventListener('click',()=>$('import-file').click());
$('import-file').addEventListener('change',async e=>{const file=e.target.files?.[0];if(!file)return;if(file.size>200000){print('Import refused: file is too large.','error');return;}try{const v=JSON.parse(await file.text());const rows=Array.isArray(v)?v:v.ledger;if(!Array.isArray(rows))throw Error('Expected array or {ledger:[]}');const safe=rows.filter(v=>v&&typeof v.at==='string'&&typeof v.event==='string').slice(-150).map(v=>({at:v.at.slice(0,60),event:v.event.slice(0,48),detail:String(v.detail||'').slice(0,90)}));ledger=safe;record('ledger.import',safe.length+' valid entries');print('Imported '+safe.length+' valid metadata entries.','ok');}catch(err){print('Import refused: '+err.message,'error');}e.target.value='';});
function clock(){const e=$('clock');if(e)e.textContent=new Date().toISOString().slice(11,19)+' UTC';}clock();setInterval(clock,1000);
ledger=Array.isArray(window.__CRYPTIC_REHYDRATE__)?window.__CRYPTIC_REHYDRATE__.slice(-150):load();
updateCaps();print('CRYPTIC · HYPERTERMINAL POLYGLOT QUINE OS\nPUBLIC BROWSER SHELL INITIALIZED\nType help to inspect real commands. Full React engine source is linked above.','ok');record('shell.load','browser-local');
(function field(){
 const c=$('field');if(!c)return;const x=c.getContext('2d',{alpha:false});if(!x)return;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;let w=1,h=1,t=0,live=true;
 const nodes=Array.from({length:110},(_,i)=>({x:(i*0.6180339887)%1,y:(i*0.4142135623)%1,r:0.5+(i%4)*.4}));
 function resize(){const d=Math.min(devicePixelRatio||1,1.5);w=innerWidth;h=innerHeight;c.width=Math.floor(w*d);c.height=Math.floor(h*d);x.setTransform(d,0,0,d,0,0)}resize();addEventListener('resize',resize,{passive:true});
 document.addEventListener('visibilitychange',()=>{live=!document.hidden;if(live&&!reduced)requestAnimationFrame(draw);});
 function draw(){if(!live)return;t+=reduced?0:.004;x.fillStyle='#020610';x.fillRect(0,0,w,h);const grad=x.createRadialGradient(w*.55,h*.35,4,w*.55,h*.35,Math.max(w,h)*.65);grad.addColorStop(0,'#092545');grad.addColorStop(.5,'#051021');grad.addColorStop(1,'#020610');x.fillStyle=grad;x.fillRect(0,0,w,h);for(const p of nodes){const a=p.x*w+Math.sin(t+p.y*9)*14,b=p.y*h+Math.cos(t+p.x*11)*12;x.beginPath();x.fillStyle='rgba(104,224,249,'+(0.09+(p.r/20))+')';x.arc(a,b,p.r,0,Math.PI*2);x.fill();}if(!reduced)requestAnimationFrame(draw);}
 draw();
})();
if('serviceWorker' in navigator && location.protocol==='https:' && !location.search.includes('no-sw'))navigator.serviceWorker.register('./sw.js').catch(()=>{});
})();