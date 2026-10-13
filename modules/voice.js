export function mount(root) {
  const toggleBtn = root.querySelector('#voiceToggleBtn');
  const openBtn = root.querySelector('#voiceOpenBtn');
  const status = root.querySelector('#voiceStatus');

  let active = false;
  if (toggleBtn) {
    toggleBtn.onclick = () => {
      active = !active;
      window.CrypticTerminal?.toggle963?.(active);
      toggleBtn.textContent = active ? 'STOP 963 HZ' : '963 HZ SOLFEGGIO';
      if (status) {
        status.innerHTML = active
          ? '[963 HZ ACTIVE] Crown chakra sonification streaming.<br>Oscillator locked to solfeggio pure sine resonance.'
          : '963 Hz sonification paused. Synaptic channels resting.';
      }
    };
  }

  if (openBtn) {
    openBtn.onclick = () => {
      window.CrypticRuntime?.open?.('voice');
    };
  }
}
