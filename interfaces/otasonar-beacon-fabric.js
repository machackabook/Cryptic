'use strict';
const dom=id=>document.getElementById(id);
const cvs=dom('field'),ctx=cvs.getContext('2d');
const state={report:null,peers:[],selected:'',envelope:null,status:'UNCONFIGURED'};
let cfg=null;
const b64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
const clean=s=>String(s??'—');
function notice(msg){dom('processState').textContent='No current signed process report.';dom('processList').replaceChildren();dom('status').textContent=msg;dom('summary').textContent=msg;dom('intro').style.display='block';dom('intro').textContent=msg;dom('count').textContent='0 verified';dom('events').textContent='No current verified beacon events.';dom('nodes').replaceChildren();dom('evidence').textContent='SOURCE UNAVAILABLE';state.report=null;state.peers=[]}
async function telemetry(){
 try{
  if(!cfg){const r=await fetch('../config/otasonar.public.json',{cache:'no-store',redirect:'error'});if(!r.ok)throw Error('Public source configuration not found');cfg=await r.json()}
  if(!cfg.telemetryEndpoint||!cfg.controllerPublicKeySpkiBase64)throw Error('No pinned HTTPS controller has been configured. Zero active nodes.');
  const u=new URL(cfg.telemetryEndpoint);
  if(u.protocol!=='https:'||u.username||u.password||u.hash||!(u.hostname==='crypticnews.org'||u.hostname.endsWith('.crypticnews.org')))throw Error('Only configured HTTPS Cryptic Cloudflare endpoints are permitted');
  const r=await fetch(u.href,{cache:'no-store',redirect:'error',credentials:'omit',headers:{accept:'application/json'}});
  if(!r.ok||r.redirected||r.url!==u.href)throw Error('GOD_REJECTED_REDIRECT_OR_HTTP_'+r.status);
  const env=await r.json();
  if(!env||typeof env.receipt!=='string'||typeof env.signature!=='string'||env.publicKeySpkiBase64!==cfg.controllerPublicKeySpkiBase64)throw Error('Signed envelope or pinned signer missing');
  const key=await crypto.subtle.importKey('spki',b64(cfg.controllerPublicKeySpkiBase64),{name:'Ed25519'},false,['verify']);
  if(!await crypto.subtle.verify('Ed25519',key,b64(env.signature),new TextEncoder().encode(env.receipt)))throw Error('Invalid Ed25519 signature');
  const data=JSON.parse(env.receipt);
  if(data.schema!=='otasonar.telemetry/v2'||!data.controller||!data.counts||!Array.isArray(data.targets))throw Error('Unexpected telemetry schema');
  const delay=Math.abs(Date.now()-Date.parse(data.asOf));if(!Number.isFinite(delay)||delay>60_000)throw Error('Stale or invalid telemetry timestamp');
  state.report=data;state.envelope=env;state.peers=data.targets.filter(x=>typeof x.id==='string');
  dom('intro').style.display='none';dom('status').textContent='SIGNED SOURCE VERIFIED';dom('count').textContent=clean(data.counts.verifiedLive)+' VERIFIED / '+clean(data.counts.configured)+' CONFIGURED';
  dom('summary').textContent=clean(data.controller.agentId)+' · '+clean(data.asOf);
  renderNodes();renderEvidence();renderEvents();renderProcesses();
 }catch(e){notice('SOURCE UNAVAILABLE · '+(e&&e.message?e.message:String(e)))}
}
function renderNodes(){const box=dom('nodes');box.replaceChildren();state.peers.forEach(t=>{const b=document.createElement('button');b.type='button';b.className='node';b.textContent=(t.fresh?'● ':'○ ')+t.id+' · '+(t.fresh?clean(t.rttMs)+'ms':clean(t.state));b.addEventListener('click',()=>{state.selected=t.id;renderEvidence()});box.appendChild(b)});if(!state.peers.length)box.textContent='No allowlisted peers in signed roster.'}
function renderEvidence(){const t=state.peers.find(p=>p.id===state.selected);if(!t){dom('evidence').textContent='Select a peer; the signed source is '+state.report?.controller?.agentId;return}dom('evidence').textContent='PEER: '+clean(t.id)+'\nSTATUS: '+(t.fresh?'ACK_VERIFIED':clean(t.state))+'\nRTT: '+(t.rttMs===undefined?'no verified reading':t.rttMs+' ms')+'\nRECORDED: '+clean(t.completedAt)+'\nSIGNED RECEIPT: '+clean(t.receiptSignature);dom('evidence').style.whiteSpace='pre-wrap';dom('remedy').textContent=t.fresh?'DISCOVER ✓ → VERIFY SIGNATURE ✓ → EVIDENCE RECORDED ✓ → REVERIFY':'DISCOVER → OBSERVE → VERIFY BLOCKED → CHECK PEER PIN/TLS → APPROVE REPROBE'}
function renderProcesses(){
 const g=state.report?.godAdam;
 const headline=dom('processState'),box=dom('processList');box.replaceChildren();
 if(!g||g.schema!=='god-adam.sentinel-report/v1'||g.slots!==6000){
  headline.textContent='No authenticated GOD / ADAM process evidence';return;
 }
 headline.textContent=String(g.verifiedProcesses)+' verified / '+String(g.watchedProcesses)+' watched / '+String(g.unassignedSlots)+' free logical slots';
 for(const row of (Array.isArray(g.states)?g.states:[]).slice(0,60)){
  const entry=document.createElement('div');entry.textContent='Slot '+String(row.slot)+' · '+String(row.name)+' · '+String(row.state);
  box.appendChild(entry);
 }
}
function renderEvents(){dom('events').textContent=(state.report.events||[]).slice(-8).map(e=>'['+e.at+'] '+e.type+' '+(e.target||'')+(typeof e.rttMs==='number'?' '+e.rttMs+' ms':'')).join('  |  ')||'No beacon probes observed in the current signed event window.'}
function size(){const d=Math.min(devicePixelRatio||1,2);cvs.width=Math.floor(innerWidth*d);cvs.height=Math.floor(innerHeight*d);ctx.setTransform(d,0,0,d,0,0)}window.addEventListener('resize',size);size();
function draw(time){const w=innerWidth,h=innerHeight;ctx.clearRect(0,0,w,h);ctx.strokeStyle='#14274a';ctx.lineWidth=.65;ctx.beginPath();for(let x=0;x<w;x+=60){ctx.moveTo(x,0);ctx.lineTo(x,h)}for(let y=0;y<h;y+=60){ctx.moveTo(0,y);ctx.lineTo(w,y)}ctx.stroke();
 if(state.report){const cx=w/2,cy=h/2,radius=Math.min(w,h)*.29;ctx.textAlign='center';ctx.font='11px monospace';ctx.beginPath();ctx.arc(cx,cy,13,0,2*Math.PI);ctx.fillStyle='#9333EA';ctx.fill();ctx.fillStyle='#E0E7FF';ctx.fillText(clean(state.report.controller.agentId),cx,cy+29);
  state.peers.forEach((t,i)=>{const phi=(i*2*Math.PI/Math.max(1,state.peers.length))-.6;const x=cx+radius*Math.cos(phi),y=cy+radius*Math.sin(phi);
    if(t.fresh){const amp=Math.min(13,Math.max(2,(Number(t.rttMs)||0)*.07));ctx.strokeStyle='#00ffffba';ctx.beginPath();for(let j=0;j<=30;j++){const f=j/30;const dx=x-cx,dy=y-cy,len=Math.hypot(dx,dy)||1;const wave=Math.sin(f*Math.PI)*Math.sin(f*8*Math.PI+time*.0015)*amp;const px=cx+dx*f-dy/len*wave,py=cy+dy*f+dx/len*wave;if(j===0)ctx.moveTo(px,py);else ctx.lineTo(px,py)}ctx.stroke();ctx.fillStyle='#75ffbd';ctx.fillText(clean(t.rttMs)+'ms',(x+cx)/2,(y+cy)/2-4)}
    else{ctx.setLineDash([4,8]);ctx.strokeStyle='#51567688';ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(x,y);ctx.stroke();ctx.setLineDash([])}
    ctx.beginPath();ctx.arc(x,y,7,0,2*Math.PI);ctx.fillStyle=t.fresh?'#75ffbd':'#5c627a';ctx.fill();ctx.fillStyle='#e0e7ff';ctx.fillText(t.id.slice(0,24),x,y+21);
  });
 }
 requestAnimationFrame(draw)}
requestAnimationFrame(draw);
dom('refresh').onclick=telemetry;
for(const side of ['left','right'])dom(side==='left'?'toggleL':'toggleR').onclick=()=>dom(side).classList.toggle('closed');
telemetry();setInterval(telemetry,5000);
