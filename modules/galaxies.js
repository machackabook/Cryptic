export function mount(root) {
  const warpBtn = root.querySelector('#galaxiesWarpBtn');
  const openBtn = root.querySelector('#galaxiesOpenBtn');
  const telem = root.querySelector('#galaxiesTelemetry');

  if (warpBtn) {
    warpBtn.onclick = () => {
      window.CrypticVisualizer?.triggerPulse?.();
      if (telem) {
        telem.innerHTML = `[WARP SURGE ACTIVE] Relative frame-dragging &omega; boosted by 3.5&times;.<br>Lensing Einstein ring deflected. Doppler shift: +${(1.4 + Math.random() * 0.4).toFixed(3)} z.`;
      }
    };
  }

  if (openBtn) {
    openBtn.onclick = () => {
      window.CrypticRuntime?.open?.('galaxies');
    };
  }
}
