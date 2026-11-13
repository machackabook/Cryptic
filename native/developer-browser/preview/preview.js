let peers=[];
const status=document.querySelector('#status');
function stop(){peers.forEach(p=>p.close());peers=[];status.textContent='Closed';}
document.querySelector('#stop').addEventListener('click',stop);
document.querySelector('#start').addEventListener('click',async()=>{
  stop();const a=new RTCPeerConnection({iceServers:[]}),b=new RTCPeerConnection({iceServers:[]});peers=[a,b];status.textContent='Negotiating local peers…';
  a.onicecandidate=e=>{if(e.candidate)b.addIceCandidate(e.candidate).catch(()=>{status.textContent='ICE failed';});};b.onicecandidate=e=>{if(e.candidate)a.addIceCandidate(e.candidate).catch(()=>{status.textContent='ICE failed';});};
  const message=crypto.randomUUID();b.ondatachannel=e=>{e.channel.onmessage=event=>{status.textContent=event.data===message?'Local data channel delivered a verified test message. No external call.':'Unexpected message';};};
  const channel=a.createDataChannel('nexus-preview');channel.onopen=()=>channel.send(message);
  try{await a.setLocalDescription(await a.createOffer());await b.setRemoteDescription(a.localDescription);await b.setLocalDescription(await b.createAnswer());await a.setRemoteDescription(b.localDescription);}catch{stop();status.textContent='Local negotiation failed';}
});
window.addEventListener('pagehide',stop);
if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});
