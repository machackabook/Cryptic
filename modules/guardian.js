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
   root.querySelector('#enterBtn').onclick=()=>{
     clearInterval(timer);
     window.CrypticTerminal.enterGate();
   };
   root.querySelector('#wakeBtn').onclick=async e=>{
     const on=await window.CrypticTerminal.toggleWake();
     e.currentTarget.textContent=on?'WAKE LOCK: ON':'WAKE LOCK';
   };
   return true;
 };
 if(!bind())window.addEventListener('cryptic:terminal-ready',bind,{once:true});
 root.addEventListener('DOMNodeRemoved',()=>clearInterval(timer),{once:true});
}
