export function mount(root) {
  const pingBtn=root.querySelector('#ircPingBtn');
  const openBtn=root.querySelector('#ircOpenBtn');
  const status=root.querySelector('#ircStatus');
  if(pingBtn) pingBtn.addEventListener('click',async()=>{
    if(status)status.textContent='Submitting a local bus ping…';
    try{
      const result=await window.CrypticBus?.send?.('irc.broadcast.ping',{timestamp:Date.now()});
      const confirmed=Boolean(result&&Array.isArray(result.receipts)&&result.receipts.some(r=>r?.ok===true));
      if(status)status.textContent=confirmed
        ? 'Bus frame accepted by the reported transport. This does not confirm remote IRC delivery.'
        : 'No successful bus transport receipt returned; remote delivery is unconfirmed.';
    }catch{
      if(status)status.textContent='Bus ping failed. No latency or remote acknowledgement is claimed.';
    }
  });
  if(openBtn) openBtn.addEventListener('click',()=>window.CrypticRuntime?.open?.('irc'));
}
