const qs=new URLSearchParams(location.search),id=qs.get('module')||'terminal';
const manifest=await fetch('./modules/manifest.json',{cache:'no-store'}).then(r=>r.json());
const spec=manifest.modules.find(m=>m.id===id&&!m.layer);
const root=document.getElementById('panelRoot');
if(!spec){root.innerHTML='<pre>Unknown Cryptic module: '+id+'</pre>';throw new Error('unknown module '+id)}
document.title='Cryptic // '+(spec.title||id);
const section=document.createElement('section');section.className='snap-panel';section.dataset.module=id;
section.innerHTML='<div class="panel-titlebar"><span class="panel-title"></span><div class="panel-tools"><button id="closePanel">×</button></div></div><div class="panel-body"></div>';
section.querySelector('.panel-title').textContent=spec.title||id.toUpperCase();root.appendChild(section);
section.querySelector('.panel-body').innerHTML=await fetch(spec.file,{cache:'no-store'}).then(r=>r.text());
document.getElementById('closePanel').onclick=()=>window.close();

const api={
 manifest,
 mounted:new Map([[id,section]]),
 spawn(mid){const u=new URL('./panel.html',location.href);u.searchParams.set('module',mid);return window.open(u.href,'_blank','noopener,width=820,height=650')},
 popout(mid){return this.spawn(mid)},
 ghostAll(on=true){section.classList.toggle('panel-ghost',on)},
 restoreAll(){section.classList.remove('panel-ghost','panel-collapsed','panel-hidden')},
 show(){section.classList.remove('panel-hidden')}
};
window.CrypticDashboard=api;

await import('./core/terminal-core.js?v='+manifest.version);
await import('./cryptic-runtime.js?v='+manifest.version);
await import('./cryptic-bus.js?v='+manifest.version);
await import('./cryptic-console.js?v='+manifest.version);
if(spec.controller){
 const mod=await import(new URL(spec.controller,location.href).href+'?v='+manifest.version);
 if(typeof mod.mount==='function')await mod.mount(section.querySelector('.panel-body'),{spec,instance:'popout',dashboard:api});
}
