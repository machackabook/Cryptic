export function mount(root){
 for(const [selector,type] of [['#magicLauncher','magic.launch'],['#securityLauncher','security.launch']]){
   const el=root.querySelector(selector);
   el?.addEventListener('click',()=>window.CrypticTerminal?.ledger?.(type,{source:'control-panel'}));
 }
}
