export function mount(root){
 const utc=root.querySelector('#guardianUtc'),epoch=root.querySelector('#guardianEpoch');
 const tick=()=>{
   const now=new Date();
   if(utc) utc.textContent=now.toISOString().slice(11,19)+' UTC';
   if(epoch) epoch.textContent='EPOCH: '+now.getTime();
 };
 tick();
 const timer=setInterval(tick,1000);
 const bind=()=>{
   if(!window.CrypticTerminal)return false;
   const field=root.querySelector('#guardianSequence'),hint=root.querySelector('#guardianSequenceHelp');
   let failed=0;
   const enter=()=>{
     const matched=field?.value==='433855274';
     if(!matched){failed++;hint.textContent='Sequence not matched. Visual gate remains closed.';field?.setAttribute('aria-invalid','true');window.CrypticTerminal.ledger?.('guardian.visual.denied',{attempt:Math.min(failed,10)});return}
     field.value='';field.removeAttribute('aria-invalid');
     try{sessionStorage.setItem('cryptic.guardian.visual.entered','1')}catch{}
     window.CrypticTerminal.ledger?.('guardian.visual.accepted',{tdoc:'5200'});
     clearInterval(timer);
     window.CrypticTerminal.enterGate();
   };
   root.querySelector('#enterBtn').onclick=enter;
   field?.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();enter()}});

   root.querySelector('#wakeBtn').onclick=async e=>{
     const on=await window.CrypticTerminal.toggleWake();
     e.currentTarget.textContent=on?'WAKE LOCK: ON':'WAKE LOCK';
   };
   return true;
 };
 if(!bind())window.addEventListener('cryptic:terminal-ready',bind,{once:true});
 root.addEventListener('DOMNodeRemoved',()=>clearInterval(timer),{once:true});
}
