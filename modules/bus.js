export function mount(root){
 const routes=root.querySelector('#busRoutes'),form=root.querySelector('#busForm'),input=root.querySelector('#busCommand'),receipts=root.querySelector('#busReceipts'),fan=root.querySelector('#busFanout');
 const paint=()=>{
  if(!routes)return;
  const r=window.CrypticBus?.routes?.()||{};
  routes.replaceChildren();
  for(const [name,available] of Object.entries(r)){
   const chip=document.createElement('span');
   chip.className='route-chip '+(available===true?'on':'');
   chip.textContent=name.toUpperCase()+': '+(available===true?'AVAILABLE':available===false?'UNAVAILABLE':'CONFIGURED');
   routes.appendChild(chip);
  }
 };
 paint();
 const refresh=()=>{if(root.isConnected)paint()};
 const timer=setInterval(refresh,3000);
 root.addEventListener('DOMNodeRemoved',()=>clearInterval(timer),{once:true});
 async function send(all=false){
  const cmd=(input?.value||'').trim()||'status';
  if(receipts)receipts.textContent='Submitting bus request…';
  try{
   const result=all?await window.CrypticBus?.aggregate?.('terminal.command',{command:cmd}):await window.CrypticBus?.command?.(cmd);
   if(receipts)receipts.textContent=JSON.stringify(result?.receipts||result,null,2);
  }catch(error){if(receipts)receipts.textContent='Bus request failed: '+String(error?.message||error).slice(0,240)}
 }
 if(form)form.addEventListener('submit',e=>{e.preventDefault();void send(false)});
 if(fan)fan.addEventListener('click',()=>void send(true));
}
