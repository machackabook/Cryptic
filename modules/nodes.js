export async function mount(root){
 const box=root.querySelector('#nodeCards');
 try{
   const r=await fetch('./config/nodes.public.json',{cache:'no-store'});
   if(!r.ok)throw Error('registry HTTP '+r.status);
   const data=await r.json();
   box.replaceChildren();
   for(const n of data.nodes||[]){
     const b=document.createElement('button');
     b.className='node-card';b.type='button';
     const label=document.createElement('b');label.textContent=(n.label||n.id)+' ↗';
     const info=document.createElement('span');
     info.textContent=(n.capabilities||[]).slice(0,3).join(' · ')+' · '+(n.interface_url||n.repo||n.reference_url?'LINKED':'ADAPTER REQUIRED');
     b.append(label,info);
     const hasDestination=Boolean(n.interface_url||n.repo||n.reference_url);
     b.disabled=!hasDestination;
     b.title=hasDestination?'Open '+(n.label||n.id):'No public destination; paired adapter required';
     b.onclick=()=>{
       if(typeof window.CrypticRuntime?.open==='function')window.CrypticRuntime.open(n.id);
       else box.setAttribute('data-error','Runtime is not ready');
     };
     box.appendChild(b);
   }
 }catch(error){box.textContent='Node registry unavailable: '+error.message}
}
