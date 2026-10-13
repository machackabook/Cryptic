export async function mount(root){
 const box=root.querySelector('#nodeCards');
 if(!box)return;
 try{
  const response=await fetch('./config/nodes.public.json',{cache:'no-store',redirect:'error',signal:AbortSignal.timeout(5000)});
  if(!response.ok)throw new Error('Node catalogue HTTP '+response.status);
  const data=await response.json();
  box.replaceChildren();
  for(const n of (Array.isArray(data.nodes)?data.nodes:[])){
   const b=document.createElement('button');b.className='node-card';b.type='button';
   const title=document.createElement('b');title.textContent=String(n.label||n.id||'Unnamed node');
   const desc=document.createElement('span');desc.textContent=(Array.isArray(n.capabilities)?n.capabilities:[]).slice(0,4).map(String).join(' · ');
   b.append(title,desc);
   b.addEventListener('click',()=>window.CrypticRuntime?.open?.(n.id));
   box.appendChild(b);
  }
 }catch(error){
  box.textContent='Public node catalogue unavailable. '+String(error?.message||'').slice(0,180);
 }
}
