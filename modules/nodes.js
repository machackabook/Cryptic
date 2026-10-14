export async function mount(root){
 const box=root.querySelector('#nodeCards');if(!box)return;
 box.replaceChildren();let data;
 try{const r=await fetch('./config/nodes.public.json',{redirect:'error',cache:'no-store',headers:{accept:'application/json'}});
  if(!r.ok||r.redirected)throw Error('GOD registry source denied');data=await r.json()
 }catch(e){box.textContent='GOD: Node registry unavailable';return}
 for(const n of (Array.isArray(data.nodes)?data.nodes:[]).slice(0,100)){
  if(!/^[a-z0-9-]{1,70}$/.test(n.id))continue;
  const b=document.createElement('button');b.className='node-card';
  const title=document.createElement('b');title.textContent=String(n.label||n.id).slice(0,100);
  const detail=document.createElement('span');detail.textContent=(Array.isArray(n.capabilities)?n.capabilities:[]).slice(0,4).map(x=>String(x).slice(0,55)).join(' · ');
  b.append(title,detail);b.onclick=()=>window.CrypticRuntime?.open?.(n.id);box.appendChild(b)
 }
}
