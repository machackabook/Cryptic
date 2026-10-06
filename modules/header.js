export function mount(root){
 const clock=root.querySelector('#headerClock'),edge=root.querySelector('#headerGateway'),bridge=root.querySelector('#headerBridge'),online=root.querySelector('#headerOnline');
 const tick=()=>{clock.textContent=new Date().toLocaleTimeString();online.textContent=navigator.onLine?'ONLINE':'OFFLINE';online.className='status-dot '+(navigator.onLine?'good':'bad');bridge.textContent=sessionStorage.getItem('cryptic.bridge.url')?'BRIDGE ON':'BRIDGE OFF';bridge.className='status-dot '+(sessionStorage.getItem('cryptic.bridge.url')?'good':'')};
 tick();const i=setInterval(tick,1000);
 fetch('https://api.crypticnews.org/v1/status',{cache:'no-store'}).then(r=>r.ok?r.json():Promise.reject()).then(j=>{edge.textContent='EDGE '+(j.version||'ON');edge.className='status-dot good'}).catch(()=>{edge.textContent='EDGE ?';edge.className='status-dot warn'});
 root.addEventListener('DOMNodeRemoved',()=>clearInterval(i),{once:true});
}
