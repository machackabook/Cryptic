(() => {
  'use strict';

  const VERSION='0.7.0';
  const CHANNEL='cryptic.message.bus.v1';
  const SEEN_KEY='cryptic.bus.seen.v1';
  const MAX_SEEN=256;
  const sessionId=sessionStorage.getItem('cryptic.bus.session') || crypto.randomUUID();
  sessionStorage.setItem('cryptic.bus.session',sessionId);

  let bc=null;
  const handlers=new Map();

  function seenIds(){
    try { const x=JSON.parse(sessionStorage.getItem(SEEN_KEY)||'[]'); return Array.isArray(x)?x:[]; }
    catch { return []; }
  }
  function markSeen(id){
    const s=seenIds();
    if(s.includes(id)) return false;
    s.push(id);
    if(s.length>MAX_SEEN) s.splice(0,s.length-MAX_SEEN);
    sessionStorage.setItem(SEEN_KEY,JSON.stringify(s));
    return true;
  }
  function frame(kind,payload={},opts={}){
    return {
      v:1,
      id:crypto.randomUUID(),
      ts:new Date().toISOString(),
      source:{surface:'cryptic-web',session:sessionId,origin:location.origin},
      target:opts.target || 'cryptic',
      kind,
      scope:opts.scope || kind,
      ttl:Number.isFinite(opts.ttl)?opts.ttl:8,
      payload
    };
  }
  function receipt(transport,msg,ok,extra={}){
    return {transport,message_id:msg.id,ok,at:new Date().toISOString(),...extra};
  }
  function emitLocal(msg){
    if(!markSeen(msg.id)) return receipt('loopback',msg,true,{deduped:true});
    const fn=handlers.get(msg.kind) || handlers.get('*');
    if(fn) {
      Promise.resolve(fn(msg)).catch(e=>window.CrypticTerminal?.out?.('Bus handler error: '+e.message,'bad'));
    }
    window.dispatchEvent(new CustomEvent('cryptic:bus',{detail:msg}));
    return receipt('loopback',msg,true);
  }
  function ensureBroadcast(){
    if(bc || !('BroadcastChannel' in window)) return bc;
    bc=new BroadcastChannel(CHANNEL);
    bc.onmessage=e=>{
      const msg=e.data;
      if(!msg?.id || !msg?.kind || !markSeen(msg.id)) return;
      const fn=handlers.get(msg.kind) || handlers.get('*');
      if(fn) Promise.resolve(fn(msg)).catch(()=>{});
      window.dispatchEvent(new CustomEvent('cryptic:bus',{detail:msg}));
    };
    return bc;
  }
  function sendBroadcast(msg){
    const ch=ensureBroadcast();
    if(!ch) return receipt('broadcast',msg,false,{reason:'unsupported'});
    ch.postMessage(msg);
    return receipt('broadcast',msg,true);
  }
  async function sendServiceWorker(msg){
    const ctl=navigator.serviceWorker?.controller;
    if(!ctl) return receipt('service-worker',msg,false,{reason:'no_controller'});
    ctl.postMessage({type:'CRYPTIC_BUS_FRAME',frame:msg});
    return receipt('service-worker',msg,true);
  }
  async function sendEdge(msg){
    const runtime=window.CrypticRuntime;
    if(!runtime?.signedToken) return receipt('edge',msg,false,{reason:'runtime_unavailable'});
    const token=await runtime.signedToken(msg.target,'bus.publish.'+msg.kind);
    if(!token) return receipt('edge',msg,false,{reason:'token_unavailable'});
    const res=await fetch(runtime.gateway+'/v1/bus/publish',{
      method:'POST',
      headers:{'content-type':'application/json','x-cryptic-token':token},
      body:JSON.stringify(msg)
    });
    const body=await res.json().catch(()=>({}));
    return receipt('edge',msg,res.ok,{status:res.status,gateway_receipt:body.receipt||null,error:body.error||null});
  }
  async function sendBridgeAction(msg){
    if(msg.kind!=='bridge.action') return receipt('localhost',msg,false,{reason:'kind_not_supported'});
    const action=String(msg.payload?.action||'');
    try{
      const result=await window.CrypticRuntime?.bridgeAction?.(action);
      return receipt('localhost',msg,true,{result:result??null});
    }catch(e){
      return receipt('localhost',msg,false,{reason:e.message});
    }
  }
  function deepLink(msg,open=false){
    if(msg.kind!=='terminal.command') return receipt('deeplink',msg,false,{reason:'kind_not_supported'});
    const base=new URL('./terminal/',location.href);
    base.searchParams.set('cmd',String(msg.payload?.command||''));
    if(msg.payload?.autorun) base.searchParams.set('autorun','1');
    if(open) window.open(base.href,'_blank','noopener');
    return receipt('deeplink',msg,true,{url:base.href,opened:open});
  }

  const transports={
    loopback: async msg=>emitLocal(msg),
    broadcast: async msg=>sendBroadcast(msg),
    'service-worker': sendServiceWorker,
    localhost: sendBridgeAction,
    edge: sendEdge,
    deeplink: async msg=>deepLink(msg,false)
  };

  async function send(kind,payload={},opts={}){
    const msg=frame(kind,payload,opts);
    const route=opts.route || ['loopback'];
    const strategy=opts.strategy || 'first-success';
    const names=Array.isArray(route)?route:[route];
    const results=[];

    for(const name of names){
      const tx=transports[name];
      if(!tx){ results.push(receipt(name,msg,false,{reason:'unknown_transport'})); continue; }
      try{
        const r=await tx(msg);
        results.push(r);
        if(strategy==='first-success' && r.ok) break;
      }catch(e){
        results.push(receipt(name,msg,false,{reason:e.message}));
      }
    }

    window.CrypticTerminal?.ledger?.('bus.send',{
      message_id:msg.id,
      kind:msg.kind,
      target:msg.target,
      strategy,
      transports:results.map(r=>({transport:r.transport,ok:r.ok}))
    });

    return {message:msg,receipts:results};
  }

  async function command(command,opts={}){
    const text=String(command||'').trim();
    if(!text) throw new Error('command required');
    const route=opts.route || ['loopback'];
    return send('terminal.command',{command:text,autorun:Boolean(opts.autorun)},{...opts,route,target:opts.target||'cryptic'});
  }

  async function bridge(action,opts={}){
    return send('bridge.action',{action:String(action||'')},{...opts,route:opts.route||['localhost'],target:'bridge',scope:'bridge.action.'+action});
  }

  async function aggregate(kind,payload={},opts={}){
    return send(kind,payload,{...opts,strategy:'fanout',route:opts.route||['loopback','broadcast','service-worker','edge']});
  }

  function on(kind,handler){
    if(typeof handler!=='function') throw new TypeError('handler must be a function');
    handlers.set(kind,handler);
    return ()=>handlers.delete(kind);
  }

  on('terminal.command',msg=>{
    const cmd=String(msg.payload?.command||'');
    if(!cmd) return;
    return window.CrypticTerminal?.exec?.(cmd);
  });

  ensureBroadcast();

  if(navigator.serviceWorker){
    navigator.serviceWorker.addEventListener('message',e=>{
      if(e.data?.type!=='CRYPTIC_BUS_FRAME') return;
      const msg=e.data.frame;
      if(!msg?.id || !markSeen(msg.id)) return;
      const fn=handlers.get(msg.kind)||handlers.get('*');
      if(fn) Promise.resolve(fn(msg)).catch(()=>{});
    });
  }

  window.CrypticBus=Object.freeze({
    version:VERSION,
    session:sessionId,
    send,
    command,
    bridge,
    aggregate,
    on,
    frame,
    routes:()=>({
      loopback:true,
      broadcast:'BroadcastChannel' in window,
      serviceWorker:Boolean(navigator.serviceWorker?.controller),
      localhost:Boolean(sessionStorage.getItem('cryptic.bridge.url')),
      edge:Boolean(window.CrypticRuntime?.gateway),
      deeplink:true
    }),
    url:(command,opts={})=>deepLink(frame('terminal.command',{command:String(command),autorun:Boolean(opts.autorun)},opts),false).url,
    open:(command,opts={})=>{
      const msg=frame('terminal.command',{command:String(command),autorun:Boolean(opts.autorun)},opts);
      const r=deepLink(msg,true); return r.url;
    }
  });

  console.info(
    '%cCRYPTIC MESSAGE BUS v'+VERSION,
    'color:#74ff9b;background:#03050a;padding:4px 8px;border:1px solid #74ff9b',
    '\nawait CrypticBus.command("status")',
    '\nawait CrypticBus.aggregate("telemetry.snapshot",{label:"console"})',
    '\nawait CrypticBus.bridge("git.status")',
    '\nCrypticBus.routes()'
  );
})();
