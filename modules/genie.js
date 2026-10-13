export function mount(root){
  const input=root.querySelector('#genieModuleWish');
  const grantBtn=root.querySelector('#genieModuleGrantBtn');
  const openBtn=root.querySelector('#genieModuleOpenBtn');
  const receipt=root.querySelector('#genieModuleReceipt');
  if(grantBtn) grantBtn.addEventListener('click',async()=>{
    const text=(input?.value||'').trim();
    if(!text){if(receipt)receipt.textContent='Enter an intent first.';return}
    if(input)input.value='';
    if(receipt)receipt.textContent='Recording a local request receipt…';
    await window.CrypticTerminal?.exec?.('genie wish '+text);
    if(receipt)receipt.textContent='REQUEST RECORDED LOCALLY ONLY — no model adapter or external action is configured. Check terminal output for the receipt.';
  });
  if(openBtn) openBtn.addEventListener('click',()=>window.CrypticRuntime?.open?.('genie-djinn'));
}
