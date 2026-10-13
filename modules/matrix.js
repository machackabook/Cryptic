export function mount(root){
  const launch=root.querySelector('#matrixLaunchBtn');
  const verify=root.querySelector('#matrixVerifyBtn');
  if(launch) launch.addEventListener('click',()=>window.CrypticRuntime?.open?.('matrix-engine'));
  if(verify) verify.addEventListener('click',()=>window.CrypticTerminal?.exec?.('gaia verify --everything'));
}
