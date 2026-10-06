export function mount(root){
 const bind=()=>{if(!window.CrypticTerminal)return false;root.querySelector('#enterBtn').onclick=()=>window.CrypticTerminal.enterGate();root.querySelector('#wakeBtn').onclick=async e=>{const on=await window.CrypticTerminal.toggleWake();e.currentTarget.textContent=on?'WAKE LOCK: ON':'WAKE LOCK'};return true};
 if(!bind())window.addEventListener('cryptic:terminal-ready',bind,{once:true});
}
