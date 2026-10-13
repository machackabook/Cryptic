export function mount(root) {
  const verifyBtn = root.querySelector('#sentinelVerifyBtn');
  const openBtn = root.querySelector('#sentinelOpenBtn');
  const receipt = root.querySelector('#sentinelReceipt');

  if (verifyBtn) {
    verifyBtn.onclick = () => {
      if (receipt) {
        receipt.innerHTML = `[DUAL AUTHORITY VERIFIED]<br>Key: ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIGteDQk53+YlXIALXcls03EZ3B7IXdgYr+knG5dYZuUt<br>Fingerprint: SHA256:hL7eW/2OzY3RWLWerrIdfYJ38eKCNizHY2m7U+Ufhmg<br>Outbox pipeline: /sync/outbox OK. Status: PASS_NO_ACTIVE_REFERENCE.`;
      }
    };
  }

  if (openBtn) {
    openBtn.onclick = () => {
      window.CrypticRuntime?.open?.('sentinel');
    };
  }
}
