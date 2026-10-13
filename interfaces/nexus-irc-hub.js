(() => {
 const win=document.getElementById('msgWindow'),input=document.getElementById('chatInput'),sendBtn=document.getElementById('sendBtn');
 const status=document.getElementById('ircConnectionStatus');
 let currentChan='#cryptic',myNick='Sovereign_User',busy=false;
 function bus(){return window.CrypticBus||(window.parent!==window?window.parent.CrypticBus:null)}
 function addMsg(nick,text,type=''){const row=document.createElement('div');row.className='msg-row';const time=document.createElement('span');time.className='msg-time';time.textContent='['+new Date().toLocaleTimeString()+']';const n=document.createElement('span');n.className='msg-nick'+(nick.includes('Djinn')?' djinn':nick.includes('Sentinel')?' sentinel':'');n.textContent=nick;const body=document.createElement('span');body.className='msg-text';body.textContent=String(text);row.append(time,n,body);win?.appendChild(row);if(win)win.scrollTop=win.scrollHeight}
 document.querySelectorAll('.chan-item').forEach(channel=>channel.addEventListener('click',event=>{document.querySelectorAll('.chan-item').forEach(x=>{x.classList.remove('active');x.setAttribute('aria-pressed','false')});channel.classList.add('active');channel.setAttribute('aria-pressed','true');currentChan=channel.dataset.chan||'#cryptic';if(input)input.placeholder='Message '+currentChan+'...';addMsg('System','Switched local channel view to '+currentChan+'. No remote membership is implied.','system')}));
 async function send(){
  const text=(input?.value||'').trim();if(!text||busy)return;if(input)input.value='';
  if(text.startsWith('/nick ')){const candidate=text.slice(6).trim();if(candidate&&!/[\\r\\n]/.test(candidate)){myNick=candidate.slice(0,32);addMsg('System','Local display nickname set to '+myNick)}return}
  const transport=bus();
  if(!transport?.send){addMsg('System','Not sent: Cryptic message bus is not connected in this page context.');return}
  busy=true;if(sendBtn)sendBtn.disabled=true;if(status)status.textContent='REQUESTING BUS RECEIPT…';
  try{
   const result=await transport.send('irc.broadcast.msg',{text,sender:myNick,channel:currentChan},{route:['broadcast','edge'],strategy:'fanout',target:'cryptic'});
   const receipts=Array.isArray(result?.receipts)?result.receipts:[];
   const accepted=receipts.filter(r=>r?.ok&&['broadcast','edge'].includes(r.transport));
   if(accepted.length){
    addMsg(myNick,text);
    addMsg('System','Transport receipt: '+accepted.map(r=>r.transport+' accepted').join(', ')+'. This confirms transport acceptance only, not remote IRC delivery.');
    if(status)status.textContent=accepted.map(r=>r.transport.toUpperCase()+' ACCEPTED').join(' · ');
   }else{
    addMsg('System','Not confirmed delivered. '+receipts.map(r=>r.transport+': '+(r.reason||r.status||'no acknowledgement')).join('; '));
    if(status)status.textContent='NO DELIVERY CONFIRMATION';
   }
  }catch(error){addMsg('System','Send failed: '+String(error?.message||error).slice(0,160));if(status)status.textContent='SEND FAILED'}
  finally{busy=false;if(sendBtn)sendBtn.disabled=false}
 }
 sendBtn?.addEventListener('click',send);input?.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();void send()}});
 if(status)status.textContent=bus()?'BUS AVAILABLE · REMOTE DELIVERY UNVERIFIED':'BUS NOT CONNECTED';
})();