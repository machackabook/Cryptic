export function mount(root) {
  const emitBtn=root.querySelector('#quineEmitBtn');
  const openBtn=root.querySelector('#quineOpenBtn');
  const stats=root.querySelector('#quineStats');
  if(emitBtn) emitBtn.addEventListener('click',()=>{
    const bytes=new TextEncoder().encode(document.documentElement.outerHTML).length;
    if(stats) stats.textContent='Measured current DOM size: '+(bytes/1024).toFixed(2)+' KB ('+bytes+' bytes). No self-replication or idempotence test was performed.';
  });
  if(openBtn) openBtn.addEventListener('click',()=>window.CrypticRuntime?.open?.('quine'));
}
