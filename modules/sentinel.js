export function mount(root){
  const verifyBtn=root.querySelector('#sentinelVerifyBtn');
  const openBtn=root.querySelector('#sentinelOpenBtn');
  const receipt=root.querySelector('#sentinelReceipt');
  if(verifyBtn) verifyBtn.addEventListener('click',async()=>{
    if(receipt)receipt.textContent='Checking connected verification adapter…';
    const result=await window.CrypticTerminal?.exec?.('sentinel verify');
    if(receipt)receipt.textContent=result?.status==='VERIFIED'
      ? 'Verified response returned by the connected adapter. Review the recorded evidence before promotion.'
      : 'UNVERIFIED — no device identity, SSH key, pairing, or dual-authority proof was checked by this public page.';
  });
  if(openBtn) openBtn.addEventListener('click',()=>window.CrypticRuntime?.open?.('sentinel'));
}
