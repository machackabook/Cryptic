(() => {
  'use strict';
  const EDGE='https://bus.crypticnews.org';
  const CHANNEL='cryptic.message.bus.v1';
  const session=sessionStorage.getItem('cryptic.bus.session')||crypto.randomUUID();
  sessionStorage.setItem('cryptic.bus.session',session);
  const seen=new Set();
  const bc='BroadcastChannel' in window?new BroadcastChannel(CHANNEL):null;

  const make=(kind,payload={},opts={})=>({
    v:1,id:crypto.randomUUID(),ts:new Date().toISOString(),
    source:{surface:'cryptic-web',session,origin:location.origin},
    target:opts.target||'cryptic',kind,payload
  });

  async function loopback(msg){
    if(seen.has(msg.id)) return {transport:'loopback',ok:true,deduped:true};
    seen.add(msg.id);
    if(msg.kind==='terminal.command') await window.CrypticTerminal?.exec?.(String(msg.payload?.command||''));
    window.dispatchEvent(new CustomEvent('cryptic:bus',{detail:msg}));
    return {transport:'loopback',ok:true};
  }

  async function broadcast(msg){
    if(!bc) return {transport:'broadcast',ok:false,reason:'unsupported'};
    bc.postMessage(msg);
    return {transport:'broadcast',ok:true};
  }

  async function edge(msg){
    try{
      const tokenResponse=await fetch(EDGE+'/v1/token',{
        method:'POST',
        headers:{'content-type':'application/json'},
        body:JSON.stringify({target:msg.target})
      });
      const tokenBody=await tokenResponse.json();
      if(!tokenResponse.ok||!tokenBody.token) throw new Error(tokenBody.error||'token_failed');

      const publishResponse=await fetch(EDGE+'/v1/publish',{
        method:'POST',
        headers:{'content-type':'application/json','x-cryptic-bus-token':tokenBody.token},
        body:JSON.stringify(msg)
      });
      const publishBody=await publishResponse.json();
      return {
        transport:'edge',
        ok:publishResponse.ok,
        status:publishResponse.status,
        receipt:publishBody.receipt||null,
        error:publishBody.error||null
      };
    }catch(e){
      return {transport:'edge',ok:false,reason:e.message};
    }
  }

  async function send(kind,payload={},opts={}){
    const msg=make(kind,payload,opts);
    const route=opts.route||['loopback'];
    const strategy=opts.strategy||'first-success';
    const receipts=[];

    for(const name of route){
      const fn={loopback,broadcast,edge}[name];
      if(!fn){receipts.push({transport:name,ok:false,reason:'not_active_in_web_surface'});continue}
      const r=await fn(msg);
      receipts.push(r);
      if(strategy==='first-success'&&r.ok)break;
    }

    window.CrypticTerminal?.ledger?.('bus.send',{
      message_id:msg.id,
      kind:msg.kind,
      target:msg.target,
      routes:receipts.map(r=>({transport:r.transport,ok:r.ok}))
    });

    return {message:msg,receipts};
  }

  async function command(command,opts={}){
    return send('terminal.command',{command:String(command||'')},{...opts,route:opts.route||['loopback']});
  }

  async function aggregate(kind,payload={},opts={}){
    return send(kind,payload,{...opts,strategy:'fanout',route:opts.route||['loopback','broadcast','edge']});
  }

  async function bridge(action){
    const result=await window.CrypticRuntime?.bridgeAction?.(String(action||''));
    return {action,result};
  }

  function commandUrl(command,opts={}){
    const u=new URL('./terminal/',location.href);
    u.searchParams.set('cmd',String(command||''));
    if(opts.autorun)u.searchParams.set('autorun','1');
    return u.href;
  }

  if(bc){
    bc.onmessage=e=>{
      const msg=e.data;
      if(!msg?.id||seen.has(msg.id))return;
      seen.add(msg.id);
      if(msg.kind==='terminal.command')window.CrypticTerminal?.exec?.(String(msg.payload?.command||''));
      window.dispatchEvent(new CustomEvent('cryptic:bus',{detail:msg}));
    };
  }

  window.CrypticBus=Object.freeze({
    version:'0.7.0',
    edge:EDGE,
    session,
    send,
    command,
    aggregate,
    bridge,
    routes:()=>({
      loopback:true,
      broadcast:Boolean(bc),
      localhost:Boolean(sessionStorage.getItem('cryptic.bridge.url')),
      edge:EDGE,
      deeplink:true
    }),
    url:commandUrl,
    open:(command,opts={})=>{
      const u=commandUrl(command,opts);
      window.open(u,'_blank','noopener');
      return u;
    }
  });
})();