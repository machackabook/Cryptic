export function mount(root){
 const a=root.querySelector('#magicLauncher');
 if(!a)return;
 a.addEventListener('click',()=>window.CrypticTerminal?.ledger?.('magic.launch',{source:'control-panel',href:a.href}));
}
