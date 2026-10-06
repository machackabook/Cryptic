export function mount(root,{dashboard}){
 const sel=root.querySelector('#spawnModule');for(const m of dashboard.manifest.modules.filter(x=>!x.layer)){const o=document.createElement('option');o.value=m.id;o.textContent=m.title||m.id;sel.appendChild(o)}
 root.querySelector('#spawnPanel').onclick=()=>dashboard.spawn(sel.value);root.querySelector('#popPanel').onclick=()=>dashboard.popout(sel.value);
 root.querySelectorAll('[data-dashboard-action]').forEach(b=>b.onclick=()=>{const a=b.dataset.dashboardAction;if(a==='ghost-all')dashboard.ghostAll(true);if(a==='restore-all')dashboard.restoreAll();if(a==='visualizer')window.CrypticVisualizer?.toggle?.();if(a==='guardian')window.CrypticTerminal?.showGate?.()});
}
