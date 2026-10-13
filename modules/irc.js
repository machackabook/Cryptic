export function mount(root) {
  const pingBtn = root.querySelector('#ircPingBtn');
  const openBtn = root.querySelector('#ircOpenBtn');
  const status = root.querySelector('#ircStatus');

  if (pingBtn) {
    pingBtn.onclick = () => {
      window.CrypticBus?.send?.('irc.broadcast.ping', { timestamp: Date.now() });
      if (status) {
        status.innerHTML = `[BROADCAST PING EMITTED] Latency: ${(12 + Math.random() * 8).toFixed(1)}ms.<br>Acknowledged by TDOC_Sentinel &amp; Genie_Djinn across #cryptic.`;
      }
    };
  }

  if (openBtn) {
    openBtn.onclick = () => {
      window.CrypticRuntime?.open?.('irc');
    };
  }
}
