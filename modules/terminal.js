export function mount(root){
 const form=root.querySelector('#terminalForm'),input=root.querySelector('#cmd');let history=[],cursor=0;
 const bind=()=>{if(!window.CrypticTerminal)return false;form.onsubmit=e=>{e.preventDefault();const v=input.value.trim();if(!v)return;history.push(v);cursor=history.length;input.value='';window.CrypticTerminal.exec(v)};input.onkeydown=e=>{if(e.key==='ArrowUp'){e.preventDefault();cursor=Math.max(0,cursor-1);input.value=history[cursor]||''}if(e.key==='ArrowDown'){e.preventDefault();cursor=Math.min(history.length,cursor+1);input.value=history[cursor]||''}};return true};
 if(!bind())window.addEventListener('cryptic:terminal-ready',bind,{once:true});
}
