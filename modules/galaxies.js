export function mount(root) {
  const warpBtn=root.querySelector('#galaxiesWarpBtn');
  const openBtn=root.querySelector('#galaxiesOpenBtn');
  const telem=root.querySelector('#galaxiesTelemetry');
  if(warpBtn) warpBtn.addEventListener('click',()=>{
    const viz=window.CrypticVisualizer;
    if(typeof viz?.triggerPulse==='function'){
      viz.triggerPulse();
      if(telem) telem.textContent='Local visualizer pulse triggered. This is an animation event, not measured astrophysical telemetry.';
    } else if(telem) telem.textContent='Visualizer pulse unavailable in this context.';
  });
  if(openBtn) openBtn.addEventListener('click',()=>window.CrypticRuntime?.open?.('galaxies'));
}
