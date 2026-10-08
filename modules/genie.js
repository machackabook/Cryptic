export function mount(root){
  const input = root.querySelector('#genieModuleWish');
  const grantBtn = root.querySelector('#genieModuleGrantBtn');
  const openBtn = root.querySelector('#genieModuleOpenBtn');
  const receipt = root.querySelector('#genieModuleReceipt');

  grantBtn.onclick = async () => {
    const text = (input.value || '').trim();
    if(!text) return;
    input.value = '';
    const now = new Date().toISOString().slice(11,19);
    let fp = 'pending';
    if(window.CrypticTerminal?.mintToken){
      const t = await window.CrypticTerminal.mintToken('djinn.grant', { wish: text });
      fp = t.fp;
      window.CrypticTerminal.out?.(`[GENIE DJINN] Intent granted: "${text}" · receipt=${fp}`, 'good');
      window.CrypticTerminal.ledger?.('djinn.wish.granted', { wish: text, fp });
    }
    receipt.innerHTML = `<div><b>[${now}] INTENT SEALED</b><br>Intent: "${text}"<br><span style="color:#d4b3ff">Receipt FP: ${fp}</span></div>`;
  };

  openBtn.onclick = () => {
    window.CrypticRuntime?.open?.('genie-djinn');
  };
}
