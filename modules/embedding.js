export function mount(root) {
  const runBtn = root.querySelector('#embeddingRunBtn');
  const openBtn = root.querySelector('#embeddingOpenBtn');
  const receipt = root.querySelector('#embeddingReceipt');

  if (runBtn) {
    runBtn.onclick = async () => {
      let t = { fp: 'crt.' + Math.random().toString(36).slice(2, 8) };
      try { t = await window.CrypticTerminal?.mintToken?.('gemini.embedding.2'); } catch {}
      if (receipt) {
        receipt.innerHTML = `[EMBEDDING 2 COMPUTED] Model: gemini-embedding-2-preview<br>Vector: 768-D normalized. Checksum: 0x74446C2E.<br>Contents: "What is the meaning of life?" + [image_bytes] + [audio_bytes].<br>Receipt: [${t.fp}].`;
      }
    };
  }

  if (openBtn) {
    openBtn.onclick = () => {
      window.CrypticRuntime?.open?.('embedding');
    };
  }
}
