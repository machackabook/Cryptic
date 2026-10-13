export function mount(root) {
  const toggleBtn=root.querySelector('#voiceToggleBtn');
  const openBtn=root.querySelector('#voiceOpenBtn');
  const status=root.querySelector('#voiceStatus');
  let requested=false;
  if(toggleBtn) toggleBtn.addEventListener('click',async()=>{
    requested=!requested;
    try{
      await window.CrypticTerminal?.exec?.('963 '+(requested?'on':'off'));
      toggleBtn.textContent=requested?'STOP 963 HZ':'REQUEST 963 HZ';
      if(status)status.textContent=requested
        ? 'Oscillator request submitted. Check terminal output to confirm browser audio availability; speech recognition and neural-channel processing are not configured.'
        : 'Oscillator stop request submitted.';
    }catch(error){
      requested=false;
      if(status)status.textContent='Audio request failed: '+String(error?.message||'unknown').slice(0,160);
    }
  });
  if(openBtn)openBtn.addEventListener('click',()=>window.CrypticRuntime?.open?.('voice'));
}
