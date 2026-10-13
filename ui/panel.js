const qs=new URLSearchParams(location.search),id=qs.get('module')||'terminal';
const manifestResponse=await fetch('./modules/manifest.json',{cache:'no-store',redirect:'error'});
if(!manifestResponse.ok)throw new Error('Module manifest HTTP '+manifestResponse.status);
const manifest=await manifestResponse.json();
const moduleById=mid=>manifest.modules.find(m=>m.id===mid&&!m.layer);
const spec=moduleById(id);
const root=document.getElementById('panelRoot');
if(!spec){root.textContent='Unknown or non-panel Cryptic module';throw new Error('unknown module '+id)}
document.title='Cryptic // '+(spec.title||id);
const section=document.createElement('section');
section.className='snap-panel';section.dataset.module=id;
section.innerHTML='<div class="panel-titlebar"><span class="panel-title"></span><div class="panel-tools"><button id="closePanel" type="button" aria-label="Close this pop-out panel" title="Close panel">×</button></div></div><div class="panel-body"></div>';
section.querySelector('.panel-title').textContent=spec.title||id.toUpperCase();
root.appendChild(section);
async function fetchModuleHtml(moduleSpec){
 const u=new URL(moduleSpec.file,location.href);
 if(u.origin!==location.origin)throw new Error('Cross-origin module content blocked');
 const r=await fetch(u.href,{cache:'no-store',redirect:'error'});
 if(!r.ok)throw new Error('Module content HTTP '+r.status);
 return r.text();
}
section.querySelector('.panel-body').innerHTML=await fetchModuleHtml(spec);
document.getElementById('closePanel').addEventListener('click',()=>window.close());
const api={
 manifest,
 mounted:new Map([[id,section]]),
 async spawn(mid){
  const target=moduleById(mid);
  if(!target)return {opened:false,error:'unknown_module'};
  const u=new URL('./panel.html',location.href);u.searchParams.set('module',mid);
  const child=window.open(u.href,'_blank','popup,width=960,height=720');
  if(child){try{child.opener=null}catch{}return {opened:true,url:u.href}}
  let panel;
  try{
   panel=document.createElement('section');panel.className='snap-panel';
   panel.style.cssText='position:fixed;right:2vw;bottom:2vh;z-index:9999;width:min(520px,92vw);height:min(420px,72vh);background:#02050a;border:1px solid rgba(66,245,255,.45);border-radius:12px;box-shadow:0 20px 80px #000b;overflow:hidden';
   panel.innerHTML='<div class="panel-titlebar"><span class="panel-title"></span><div class="panel-tools"><button type="button" aria-label="Close fallback panel">×</button></div></div><div class="panel-body"></div>';
   panel.querySelector('.panel-title').textContent=target.title||target.id.toUpperCase();
   panel.querySelector('button').addEventListener('click',()=>panel.remove());
   document.body.appendChild(panel);
   panel.querySelector('.panel-body').innerHTML=await fetchModuleHtml(target);
   if(target.controller){
    const controller=await import(new URL(target.controller,location.href).href+'?v='+encodeURIComponent(manifest.version));
    if(typeof controller.mount==='function')await controller.mount(panel.querySelector('.panel-body'),{spec:target,instance:'fallback-'+mid,dashboard:api});
   }
   return {opened:false,fallback:true,module:mid};
  }catch(error){panel?.remove();return {opened:false,error:String(error?.message||error).slice(0,200)}}
 },
 popout(mid){return this.spawn(mid)},
 ghostAll(on=true){section.classList.toggle('panel-ghost',on)},
 restoreAll(){section.classList.remove('panel-ghost','panel-collapsed','panel-hidden')},
 show(){section.classList.remove('panel-hidden')}
};
window.CrypticDashboard=api;
await import('../core/terminal-core.js?v='+manifest.version);
await import('../cryptic-runtime.js?v='+manifest.version);
await import('../cryptic-bus.js?v='+manifest.version);
await import('../cryptic-console.js?v='+manifest.version);
if(spec.controller){
 const controller=await import(new URL(spec.controller,location.href).href+'?v='+encodeURIComponent(manifest.version));
 if(typeof controller.mount==='function')await controller.mount(section.querySelector('.panel-body'),{spec,instance:'popout',dashboard:api});
}
