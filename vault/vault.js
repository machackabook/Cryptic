const records=document.querySelector('#records');
const notice=document.querySelector('#notice');
const search=document.querySelector('#search');
const count=document.querySelector('#docCount');
const state=document.querySelector('#vaultState');
let published=[];
const sha256=/^[0-9a-f]{64}$/i;
const safeFile=/^[A-Za-z0-9][A-Za-z0-9._-]{0,100}\.(?:pdf|txt|md)$/i;
function draw(query=''){
 records.replaceChildren();
 const visible=published.filter(x=>(x.title+' '+x.tdoc_id).toLowerCase().includes(query.toLowerCase()));
 if(!visible.length){const empty=document.createElement('div');empty.className='empty';empty.textContent=published.length?'No matching public documents.':'No documents have passed the public release gate. The catalog is intentionally empty.';records.append(empty);return;}
 for(const item of visible){
  const card=document.createElement('article');card.className='record';
  const status=document.createElement('span');status.className='eyebrow';status.textContent='APPROVED PUBLIC RELEASE';
  const title=document.createElement('h3');title.textContent=item.title;
  const tdoc=document.createElement('p');tdoc.textContent='TDOC: '+item.tdoc_id;
  const digest=document.createElement('p');digest.textContent='SHA-256: '+item.sha256;
  const receipt=document.createElement('p');receipt.textContent='Approval: '+item.approval_id;
  const file=document.createElement('a');file.href='./assets/'+encodeURIComponent(item.file);file.textContent='Open approved document ↗';file.setAttribute('download',item.file);
  card.append(status,title,tdoc,digest,receipt,file);records.append(card);
 }
}
try{
 const response=await fetch('./catalog.json',{cache:'no-store'});if(!response.ok)throw Error('Catalog unavailable: HTTP '+response.status);
 const catalog=await response.json();if(catalog.schema!=='cryptic.public-vault.catalog.v1'||!Array.isArray(catalog.documents))throw Error('Invalid catalog schema');
 published=catalog.documents.filter(x=>x&&typeof x.title==='string'&&typeof x.tdoc_id==='string'&&typeof x.approval_id==='string'&&typeof x.file==='string'&&safeFile.test(x.file)&&sha256.test(x.sha256)&&x.publication==='approved_public');
 count.textContent=String(published.length);state.textContent='SOURCE OK';notice.textContent='Showing approved public releases only. A SHA-256 digest is a fingerprint, not a signature or independent verification of authenticity.';draw();
}catch(err){count.textContent='0';state.textContent='OFFLINE';notice.textContent='The publication catalog could not be loaded. No private backend fallback is attempted.';draw();}
search.addEventListener('input',()=>draw(search.value));