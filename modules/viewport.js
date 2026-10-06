export function mount(root){const fps=root.querySelector('#viewportFps');window.addEventListener('cryptic:visualizer-fps',e=>fps.textContent=e.detail.fps+' FPS')}
