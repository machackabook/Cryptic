export function mount(root) {
  const $=id=>root.querySelector('#'+id);
  const state=$('axsState'),endpoint=$('axsEndpoint'),tokenInput=$('axsToken'),connectBtn=$('axsConnect'),disconnectBtn=$('axsDisconnect');
  const output=$('axsOutput'),inputForm=$('axsInputForm'),input=$('axsInput'),sendBtn=$('axsSend'),sessions=$('axsSessions'),attachBtn=$('axsAttach'),newSession=$('axsNewSession'),createBtn=$('axsCreateSession'),terminateBtn=$('axsTerminateSession');
  const protocol=$('axsProtocol'),memory=$('axsMemory'),uptime=$('axsUptime'),cursor=$('axsCursor');
  if(!state||!endpoint||!tokenInput||!output)return;
  let socket=null,authenticated=false,activeSession='main',lastCursorAt=0,disposed=false,resizeObserver=null,frameHandle=0;
  const knownSessions=new Set(['main']);
  const setStatus=(message,good=false)=>{state.textContent=message;state.dataset.state=good?'connected':'disconnected'};
  const append=message=>{output.textContent=(output.textContent+String(message??'')).slice(-300000);output.scrollTop=output.scrollHeight};
  const send=packet=>{if(!socket||socket.readyState!==WebSocket.OPEN||!authenticated)return false;try{socket.send(JSON.stringify(packet));return true}catch{return false}};
  const setControls=on=>{disconnectBtn.disabled=!on;sendBtn.disabled=!on;input.disabled=!on;sessions.disabled=!on;attachBtn.disabled=!on;createBtn.disabled=!on;terminateBtn.disabled=!on||activeSession==='main';connectBtn.disabled=on;endpoint.readOnly=on;tokenInput.disabled=on};
  const renderSessions=()=>{const prior=activeSession;sessions.replaceChildren();for(const id of [...knownSessions].sort((a,b)=>a==='main'?-1:b==='main'?1:a.localeCompare(b))){const option=document.createElement('option');option.value=id;option.textContent=id;sessions.appendChild(option)}activeSession=knownSessions.has(prior)?prior:'main';sessions.value=activeSession;terminateBtn.disabled=!authenticated||activeSession==='main'};
  const loopbackEndpoint=value=>{let u;try{u=new URL(value)}catch{throw new Error('Enter a valid loopback WebSocket URL')}if(u.protocol!=='ws:'||!['127.0.0.1','localhost','[::1]','::1'].includes(u.hostname)||u.port!=='8767'||u.username||u.password||u.search||u.hash||u.pathname!=='/')throw new Error('Endpoint must be ws://127.0.0.1:8767 or ws://localhost:8767; remote hosts and alternate ports are blocked');return u.href};
  const handle=packet=>{
    const type=packet?.type,p=packet?.payload||{};
    if(type==='auth.ok'){authenticated=true;setControls(true);setStatus('AUTHENTICATED · loopback PTY bridge',true);protocol.textContent=String(p.protocol||'cryptic.axs.v1');append('\n[AXS] Authenticated. Terminal output is not persisted by this web page.\n');return}
    if(type==='error'){append('\n[AXS ERROR] '+String(p.code||'REQUEST_FAILED')+(p.reason?': '+String(p.reason):'')+'\n');if(p.code==='AUTH_REQUIRED'){try{socket?.close()}catch{}authenticated=false;setControls(false);setStatus('AUTHENTICATION FAILED · token rejected')}return}
    if(type==='sessions'){(Array.isArray(p.items)?p.items:[]).forEach(id=>{if(typeof id==='string'&&/^[A-Za-z0-9_.-]{1,32}$/.test(id))knownSessions.add(id)});renderSessions();return}
    if(type==='session.created'||type==='session.attached'){const id=p.session_id;if(typeof id==='string'&&/^[A-Za-z0-9_.-]{1,32}$/.test(id)){knownSessions.add(id);activeSession=id;renderSessions();append('\n[AXS] Session '+id+' ready.\n')}return}
    if(type==='session.terminated'){knownSessions.delete(String(p.session_id||''));activeSession='main';renderSessions();append('\n[AXS] Termination requested for '+String(p.session_id||'session')+'. Backend reported kill_requested='+String(p.kill_requested===true)+'.\n');return}
    if(type==='output'){if(p.session_id===activeSession)append(String(p.data||''));return}
    if(type==='metric'){if(p.session_id===activeSession){memory.textContent=Number.isFinite(p.backend_rss_bytes)?(p.backend_rss_bytes/1048576).toFixed(1)+' MiB':'—';uptime.textContent=Number.isFinite(p.uptime_seconds)?Math.floor(p.uptime_seconds)+' s':'—'}return}
    if(type==='cursor'){cursor.textContent='stream active';return}
    if(type==='ai.status'){append('\n[AI ADAPTER] '+String(p.status||'UNVERIFIED')+' — '+String(p.message||'No model output reported')+'\n');return}
    if(type==='log'){append('\n[AXS '+String(p.level||'INFO').toUpperCase()+'] '+String(p.message||p.reason||'event')+'\n');return}
    if(type==='status')append('\n[AXS STATUS] '+String(p.warning||'INFO')+' '+String(p.message||'')+'\n');
  };
  connectBtn.addEventListener('click',()=>{
    if(socket&&socket.readyState===WebSocket.OPEN)return;
    let url;try{url=loopbackEndpoint(endpoint.value.trim())}catch(e){setStatus(String(e.message||e));return}
    const pairingToken=tokenInput.value.trim();if(pairingToken.length<32){setStatus('PAIRING TOKEN TOO SHORT · start your own local AXS backend first');return}
    append('\n[AXS] Connecting only to '+url+' …\n');setStatus('CONNECTING · awaiting explicit local authentication');
    let ws;try{ws=new WebSocket(url)}catch(e){setStatus('WEBSOCKET FAILED · '+String(e.message||e));return}socket=ws;
    ws.addEventListener('open',()=>{ws.send(JSON.stringify({type:'auth',token:pairingToken}));tokenInput.value=''}, {once:true});
    ws.addEventListener('message',event=>{if(typeof event.data!=='string'||event.data.length>400000){append('\n[AXS] Oversized or non-text frame discarded.\n');return}try{handle(JSON.parse(event.data))}catch{append('\n[AXS] Invalid server frame discarded.\n')}});
    ws.addEventListener('error',()=>setStatus('CONNECTION ERROR · confirm AXS is running on this device'));
    ws.addEventListener('close',()=>{if(socket===ws){socket=null;authenticated=false;setControls(false);setStatus('DISCONNECTED · backend session remains alive only if its process is still running');protocol.textContent='unverified'}});
  });
  disconnectBtn.addEventListener('click',()=>{authenticated=false;setControls(false);try{socket?.close(1000,'operator disconnect')}catch{}socket=null;setStatus('DISCONNECTED · browser detached; backend session not terminated')});
  sessions.addEventListener('change',()=>{activeSession=sessions.value;terminateBtn.disabled=!authenticated||activeSession==='main';memory.textContent='—';uptime.textContent='—';send({type:'session.attach',payload:{session_id:activeSession}})});
  attachBtn.addEventListener('click',()=>send({type:'session.attach',payload:{session_id:activeSession}}));
  createBtn.addEventListener('click',()=>{const id=newSession.value.trim();if(!/^[A-Za-z0-9_.-]{1,32}$/.test(id)){setStatus('SESSION ID must be 1–32 letters, digits, dot, underscore or hyphen');return}if(knownSessions.has(id)){setStatus('SESSION ID already exists');return}if(send({type:'session.create',payload:{session_id:id}}))newSession.value=''});
  terminateBtn.addEventListener('click',()=>{const id=activeSession;if(id==='main'||!authenticated)return;if(!window.confirm('Terminate the PTY process for session "'+id+'"? This is destructive and cannot be undone.'))return;send({type:'session.terminate',payload:{session_id:id,confirm:true}})});
  inputForm.addEventListener('submit',event=>{event.preventDefault();if(!authenticated)return;const data=input.value;if(!data.trim())return;if(send({type:'input',payload:{session_id:activeSession,data:data+'\n'}}))input.value=''});
  input.addEventListener('keydown',event=>{if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();inputForm.requestSubmit()}});
  const sendResize=()=>{if(!authenticated||!root.isConnected)return;const rect=output.getBoundingClientRect();send({type:'resize',payload:{session_id:activeSession,cols:Math.max(20,Math.min(400,Math.floor(rect.width/8))),rows:Math.max(5,Math.min(200,Math.floor(rect.height/18)))}})};
  if('ResizeObserver'in window){resizeObserver=new ResizeObserver(()=>{if(!root.isConnected){resizeObserver?.disconnect();return}sendResize()});resizeObserver.observe(output)}
  root.addEventListener('pointermove',event=>{const now=Date.now();if(!authenticated||now-lastCursorAt<100)return;lastCursorAt=now;const rect=root.getBoundingClientRect();if(!rect.width||!rect.height)return;send({type:'cursor',payload:{x:Math.max(0,Math.min(1,(event.clientX-rect.left)/rect.width)),y:Math.max(0,Math.min(1,(event.clientY-rect.top)/rect.height))}})},{passive:true});
  let frameCount=0,frameStart=performance.now();
  const countFrame=()=>{if(disposed||!root.isConnected){disposed=true;resizeObserver?.disconnect();try{socket?.close()}catch{}return}frameCount++;const now=performance.now();if(now-frameStart>=2000){if(authenticated)send({type:'client_metric',payload:{fps:frameCount*1000/(now-frameStart)}});frameCount=0;frameStart=now}frameHandle=requestAnimationFrame(countFrame)};
  frameHandle=requestAnimationFrame(countFrame);
  setControls(false);
  const removalObserver=new MutationObserver(()=>{if(!root.isConnected){disposed=true;cancelAnimationFrame(frameHandle);resizeObserver?.disconnect();try{socket?.close()}catch{}removalObserver.disconnect()}});
  removalObserver.observe(document.body,{childList:true,subtree:true});
}