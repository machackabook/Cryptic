export function mount(root){
  root.querySelector('#matrixLaunchBtn').onclick = () => {
    window.CrypticRuntime?.open?.('matrix-engine');
  };
  root.querySelector('#matrixVerifyBtn').onclick = () => {
    window.CrypticTerminal?.exec?.('gaia verify --everything');
  };
}
