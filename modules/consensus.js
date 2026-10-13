export function mount(root) {
  const voteBtn = root.querySelector('#consensusVoteBtn');
  const openBtn = root.querySelector('#consensusOpenBtn');
  const out = root.querySelector('#consensusOutput');

  if (voteBtn) {
    voteBtn.onclick = async () => {
      let t = { fp: 'crt.' + Math.random().toString(36).slice(2, 8) };
      try { t = await window.CrypticTerminal?.mintToken?.('consensus.quorum.vote'); } catch {}
      if (out) {
        out.innerHTML = `[QUORUM ROUND RATIFIED] Token [${t.fp}] stamped into evidence ledger.<br>Result: 7/7 AI agents affirmed sovereign state continuity. Byzantine weight: 0.00% drift.`;
      }
    };
  }

  if (openBtn) {
    openBtn.onclick = () => {
      window.CrypticRuntime?.open?.('consensus');
    };
  }
}
