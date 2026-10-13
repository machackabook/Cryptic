export function mount(root) {
  const runBtn=root.querySelector('#embeddingRunBtn');
  const openBtn=root.querySelector('#embeddingOpenBtn');
  const receipt=root.querySelector('#embeddingReceipt');
  if(runBtn) runBtn.addEventListener('click',async()=>{
    if(receipt) receipt.textContent='Checking configured embedding adapter…';
    const result=await window.CrypticTerminal?.exec?.('embed Please configure the authenticated embedding adapter');
    if(receipt) receipt.textContent=result?.status==='EMBEDDING_ADAPTER_NOT_CONFIGURED'
      ? 'NOT CONFIGURED — no embedding API was called and no vector or similarity score was generated.'
      : 'Request submitted. Confirm the terminal output for the actual adapter result.';
  });
  if(openBtn) openBtn.addEventListener('click',()=>window.CrypticRuntime?.open?.('embedding'));
}
