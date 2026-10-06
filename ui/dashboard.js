const MANIFEST_URL='./modules/manifest.json';
const STATE_KEY='cryptic.dashboard.state.v1';
const SNAP=12;
let manifest={version:'0',modules:[]},zTop=100,serial=0;
const mounted=new Map();

const q=(s,r=document)=>r.querySelector(s);
const state=()=>{try{return JSON.parse(localStorage.getItem(STATE_KEY)||'{}')}catch{return {}}};
const saveState=s=>localStorage.setItem(STATE_KEY,JSON.stringify(s));
const snap=n=>Math.round(n/SNAP)*SNAP;

async function html(url){const r=await fetch(url,{cache:'no-store'});if(!r.ok)throw new Error('module fetch '+r.status+' '+url);return r.text()}
function moduleSpec(id){return manifest.modules.find(m=>m.id===id)}
function frame(spec,instanceId=spec.id){
  const el=document.createElement('section');
  el.className='snap-panel';
  el.id=instanceId==='base'?('module-'+spec.id):instanceId;
  el.dataset.module=spec.id;
  if(spec.chrome===false)el.classList.add('no-chrome');
  if(spec.chrome!==false){
    el.innerHTML='<div class="panel-titlebar"><span class="panel-title"></span><div class="panel-tools"><button data-panel="ghost" title="Transparency">◐</button><button data-panel="collapse" title="Collapse">—</button><button data-panel="duplicate" title="Fly out">＋</button><button data-panel="pop" title="Pop out">↗</button><button data-panel="hide" title="Hide">×</button></div></div><div class="panel-body"></div>';
    q('.panel-title',el).textContent=spec.title||spec.id.toUpperCase();
  }else el.innerHTML='<div class="panel-body"></div>';
  return el;
}
function restorePanel(el){
  const s=state()[el.dataset.module]||{};
  if(s.ghost)el.classList.add('panel-ghost');
  if(s.collapsed)el.classList.add('panel-collapsed');
  if(s.hidden)el.classList.add('panel-hidden');
}
function remember(el,key,value){
  const s=state();s[el.dataset.module]??={};s[el.dataset.module][key]=value;saveState(s)
}
function controls(el){
  q('[data-panel="ghost"]',el)?.addEventListener('click',()=>{el.classList.toggle('panel-ghost');remember(el,'ghost',el.classList.contains('panel-ghost'))});
  q('[data-panel="collapse"]',el)?.addEventListener('click',()=>{el.classList.toggle('panel-collapsed');remember(el,'collapsed',el.classList.contains('panel-collapsed'))});
  q('[data-panel="hide"]',el)?.addEventListener('click',()=>{el.classList.add('panel-hidden');remember(el,'hidden',true)});
  q('[data-panel="duplicate"]',el)?.addEventListener('click',()=>spawn(el.dataset.module));
  q('[data-panel="pop"]',el)?.addEventListener('click',()=>popout(el.dataset.module));
}
function draggable(el){
  const head=q('.panel-titlebar',el);if(!head)return;
  let drag=false,ox=0,oy=0;
  head.addEventListener('pointerdown',e=>{
    if(e.target.closest('button'))return;
    drag=true;el.style.zIndex=String(++zTop);head.setPointerCapture(e.pointerId);
    const r=el.getBoundingClientRect();ox=e.clientX-r.left;oy=e.clientY-r.top;
  });
  head.addEventListener('pointermove',e=>{
    if(!drag)return;
    el.style.left=snap(Math.max(0,Math.min(innerWidth-el.offsetWidth,e.clientX-ox)))+'px';
    el.style.top=snap(Math.max(54,Math.min(innerHeight-el.offsetHeight,e.clientY-oy)))+'px';
  });
  head.addEventListener('pointerup',()=>drag=false);
}
async function mountController(spec,root,instance){
  if(!spec.controller)return;
  const mod=await import(new URL(spec.controller,location.href).href+'?v='+encodeURIComponent(manifest.version));
  if(typeof mod.mount==='function')await mod.mount(root,{spec,instance,dashboard:api});
}
async function mountBase(spec){
  if(spec.layer==='background'){
    const layer=q('#visualizerLayer');layer.innerHTML=await html(spec.file);await mountController(spec,layer,'background');return
  }
  if(spec.layer==='guardian'){
    const layer=q('#guardianLayer');layer.innerHTML=await html(spec.file);await mountController(spec,layer,'guardian');return
  }
  const el=frame(spec,'base');el.id='module-'+spec.id;
  q('#snapGrid').appendChild(el);
  q('.panel-body',el).innerHTML=await html(spec.file);
  restorePanel(el);controls(el);mounted.set(spec.id,el);
  await mountController(spec,q('.panel-body',el),spec.id);
}
async function spawn(id){
  const spec=moduleSpec(id);if(!spec||spec.layer)return null;
  const el=frame(spec,'fly-'+id+'-'+(++serial));
  el.classList.add('floating-panel');
  q('#overlayLayer').appendChild(el);
  q('.panel-body',el).innerHTML=await html(spec.file);
  el.style.left=snap(70+(serial*36)%Math.max(120,innerWidth-540))+'px';
  el.style.top=snap(76+(serial*28)%Math.max(120,innerHeight-410))+'px';
  el.style.zIndex=String(++zTop);controls(el);draggable(el);
  await mountController(spec,q('.panel-body',el),el.id);
  return el;
}
function popout(id){
  const u=new URL('./panel.html',location.href);u.searchParams.set('module',id);window.open(u.href,'_blank','noopener,width=820,height=650');return u.href
}
function ghostAll(on=true){for(const el of mounted.values())el.classList.toggle('panel-ghost',on)}
function restoreAll(){
  const s=state();for(const el of mounted.values()){el.classList.remove('panel-ghost','panel-collapsed','panel-hidden');s[el.dataset.module]={}}saveState(s)
}
function show(id){const el=mounted.get(id);if(el){el.classList.remove('panel-hidden');remember(el,'hidden',false)}}
const api={get manifest(){return manifest},mounted,spawn,popout,ghostAll,restoreAll,show,moduleSpec};

async function boot(){
  const r=await fetch(MANIFEST_URL,{cache:'no-store'});manifest=await r.json();
  window.CrypticDashboard=api;
  for(const spec of manifest.modules)await mountBase(spec);
  await import('../core/terminal-core.js?v='+manifest.version);
  await import('../cryptic-runtime.js?v='+manifest.version);
  await import('../cryptic-bus.js?v='+manifest.version);
  await import('../cryptic-console.js?v='+manifest.version);
  window.dispatchEvent(new CustomEvent('cryptic:dashboard-ready',{detail:{version:manifest.version}}));
}
boot().catch(e=>{document.body.innerHTML='<pre style="color:#ff6e88;padding:24px">CRYPTIC DASHBOARD BOOT FAILURE\n'+String(e.stack||e)+'</pre>'});
