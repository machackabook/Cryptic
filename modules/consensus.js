export function mount(root) {
  const voteBtn=root.querySelector('#consensusVoteBtn');
  const openBtn=root.querySelector('#consensusOpenBtn');
  const out=root.querySelector('#consensusOutput');
  if(voteBtn) voteBtn.addEventListener('click',async()=>{
    if(out) out.textContent='Checking for a live consensus adapter…';
    const result=await window.CrypticTerminal?.exec?.('consensus vote');
    if(out) out.textContent=result?.ok===true&&result?.status==='VERIFIED'
      ? 'Consensus adapter returned a verified result. Inspect the terminal ledger for its evidence.'
      : 'UNVERIFIED — no configured live multi-model consensus adapter returned independent votes. No quorum score was assigned.';
  });
  if(openBtn) openBtn.addEventListener('click',()=>window.CrypticRuntime?.open?.('consensus'));
}
