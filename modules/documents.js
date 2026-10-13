export function mount(root){
  const open=root.querySelector('#documentsOpenBtn');
  const index=root.querySelector('#documentsIndexBtn');
  const status=root.querySelector('#documentsActionStatus');
  if(open) open.addEventListener('click',()=>window.CrypticRuntime?.open?.('documents'));
  if(index) index.addEventListener('click',async()=>{
    const result=await window.CrypticTerminal?.exec?.('docs');
    if(status)status.textContent=result?.status==='DOCUMENT_SEARCH_NOT_CONFIGURED'
      ? 'Document search adapter is not configured; no corpus result count is claimed.'
      : 'Request submitted. Review terminal output for its actual result.';
  });
}
