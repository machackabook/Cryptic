export async function mount(root){
 const box=root.querySelector('#nodeCards');const r=await fetch('./config/nodes.public.json',{cache:'no-store'}),data=await r.json();box.innerHTML='';
 for(const n of data.nodes||[]){const b=document.createElement('button');b.className='node-card';b.innerHTML='<b>'+n.label+'</b><span>'+(n.capabilities||[]).slice(0,4).join(' · ')+'</span>';b.onclick=()=>window.CrypticRuntime?.open?.(n.id);box.appendChild(b)}
}
