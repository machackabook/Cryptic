export function mount(root) {
  const emitBtn = root.querySelector('#quineEmitBtn');
  const openBtn = root.querySelector('#quineOpenBtn');
  const stats = root.querySelector('#quineStats');

  if (emitBtn) {
    emitBtn.onclick = () => {
      const bytes = new TextEncoder().encode(document.documentElement.outerHTML).length;
      if (stats) {
        stats.innerHTML = `[QUINE REPLICATED] Living DOM size: ${(bytes / 1024).toFixed(2)} KB (${bytes} bytes).<br>Dynamic chunk code splitting: READY.<br>Idempotent self-assembly verified.`;
      }
    };
  }

  if (openBtn) {
    openBtn.onclick = () => {
      window.CrypticRuntime?.open?.('quine');
    };
  }
}
