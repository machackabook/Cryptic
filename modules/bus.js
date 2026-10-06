export function mount(root){
 const routes=root.querySelector('#busRoutes'),form=root.querySelector('#busForm'),input=root.querySelector('#busCommand'),receipts=root.querySelector('#busReceipts'),fan=root.querySelector('#busFanout');
 const paint=()=>{const r=window.CrypticBus?.routes?.()||{};routes.innerHTML=Object.entries(r).map(([k,v])=>'<span class="route-chip '+(v?'on':'')+'">'+k.toUpperCase()+'</span>').join('')};paint();setInterval(paint,3000);
 async function send(all=false){const cmd=input.value.trim()||'status';const x=all?await window.CrypticBus?.aggregate?.('terminal.command',{command:cmd}):await window.CrypticBus?.command?.(cmd);receipts.textContent=JSON.stringify(x?.receipts||x,null,2)}
 form.onsubmit=e=>{e.preventDefault();send(false)};fan.onclick=()=>send(true);
}
