(() => {
  'use strict';

  const GATEWAY = 'https://api.crypticnews.org';
  let registry = { nodes: [] };

  const $ = (s, root=document) => root.querySelector(s);
  const esc = (s='') => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function bytesToB64u(bytes){
    let s=''; bytes.forEach(b => s += String.fromCharCode(b));
    return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  }
  function textToB64u(text){ return bytesToB64u(new TextEncoder().encode(text)); }
  function b64uToText(s){
    s=s.replace(/-/g,'+').replace(/_/g,'/'); while(s.length%4) s+='=';
    return new TextDecoder().decode(Uint8Array.from(atob(s), c => c.charCodeAt(0)));
  }

  async function gatewayToken(node='cryptic', scope='runtime.request'){
    const local = await window.mintToken?.('gateway.' + scope, {node});
    try {
      const res = await fetch(GATEWAY + '/v1/token', {
        method:'POST',
        headers:{'content-type':'application/json'},
        body:JSON.stringify({node,scope})
      });
      const data = await res.json();
      if(!res.ok || !data.token) throw new Error(data.error || 'token_failed');
      window.ledger?.('gateway.token.minted', {node,scope,local_fp:local?.fp, jti:data.payload?.jti});
      window.out?.('[SIGNED TOKEN] ' + node + ' :: ' + scope + ' :: jti=' + (data.payload?.jti || 'n/a'), 'token');
      return data.token;
    } catch (e) {
      window.out?.('Gateway token unavailable; local request receipt retained. ' + e.message, 'warn');
      return null;
    }
  }

  function nodeById(id){ return registry.nodes.find(n => n.id === id); }

  async function openNode(id){
    const node=nodeById(id);
    if(!node){ window.out?.('Unknown node: ' + id, 'warn'); return; }
    await gatewayToken(node.id, 'node.open');
    const url=node.interface_url || node.repo || node.reference_url;
    if(!url){ window.out?.('Node has no public interface URL: ' + id, 'warn'); return; }

    if(node.embed && url.startsWith('./')){
      openPanel(node.label, url);
      window.out?.('Mounted interface: ' + node.label, 'good');
    } else {
      window.open(url, '_blank', 'noopener,noreferrer');
      window.out?.('Opened public node externally: ' + node.label + ' → ' + url, 'good');
    }
  }

  function openPanel(title,url){
    let overlay=$('#cryptic-node-overlay');
    if(!overlay){
      overlay=document.createElement('div');
      overlay.id='cryptic-node-overlay';
      overlay.style.cssText='position:fixed;inset:3vh 3vw;z-index:80;background:#02050a;border:1px solid rgba(66,245,255,.4);border-radius:18px;box-shadow:0 20px 100px rgba(0,0,0,.8);display:grid;grid-template-rows:auto 1fr;overflow:hidden';
      overlay.innerHTML='<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;border-bottom:1px solid rgba(66,245,255,.2);background:rgba(5,12,22,.95)"><span id="cryptic-node-title" style="font:10px ui-monospace,monospace;letter-spacing:.15em;color:#dff">NODE</span><div style="display:flex;gap:8px"><a id="cryptic-node-external" target="_blank" rel="noopener noreferrer" style="font:9px ui-monospace,monospace;color:#ffd369;border:1px solid rgba(255,211,105,.3);padding:7px 9px;border-radius:8px;text-decoration:none">OPEN EXTERNAL</a><button id="cryptic-node-close" style="font:9px ui-monospace,monospace;color:#42f5ff;background:#041019;border:1px solid rgba(66,245,255,.3);padding:7px 9px;border-radius:8px">CLOSE</button></div></div><iframe id="cryptic-node-frame" style="width:100%;height:100%;border:0;background:#000" sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-downloads"></iframe>';
      document.body.appendChild(overlay);
      $('#cryptic-node-close',overlay).onclick=()=>overlay.remove();
    }
    $('#cryptic-node-title',overlay).textContent=title;
    $('#cryptic-node-external',overlay).href=url;
    $('#cryptic-node-frame',overlay).src=url;
  }

  function renderNodes(){
    const side=$('.side');
    if(!side || $('#cryptic-node-section')) return;
    const section=document.createElement('div');
    section.className='section';
    section.id='cryptic-node-section';
    section.innerHTML='<h2>PUBLIC NODE SURFACES</h2><div id="cryptic-node-grid" class="grid"></div><div id="cryptic-gateway-state" class="line system" style="margin-top:9px">Gateway: checking…</div>';
    const first=side.querySelector('.section');
    first?.after(section);
    const grid=$('#cryptic-node-grid',section);
    registry.nodes.filter(n=>n.kind!=='edge-gateway').forEach(n=>{
      const d=document.createElement('button');
      d.className='provider';
      d.style.textAlign='left';
      d.innerHTML='<b>'+esc(n.label)+'</b><span>'+esc((n.capabilities||[]).slice(0,2).join(' · '))+'</span>';
      d.onclick=()=>openNode(n.id);
      grid.appendChild(d);
    });
  }

  async function checkGateway(){
    const el=$('#cryptic-gateway-state');
    try{
      const r=await fetch(GATEWAY + '/v1/status', {cache:'no-store'});
      const j=await r.json();
      if(el){ el.textContent='Gateway: ' + (j.ok ? 'ONLINE' : 'DEGRADED') + ' · token TTL ' + (j.token_ttl_seconds || '?') + 's'; el.style.color=j.ok?'#74ff9b':'#ffd369'; }
      window.out?.('Capability gateway ' + (j.ok?'ONLINE':'DEGRADED') + ' at api.crypticnews.org', j.ok?'good':'warn');
    }catch(e){
      if(el){ el.textContent='Gateway: unreachable from this origin'; el.style.color='#ffd369'; }
      window.out?.('Capability gateway check failed: ' + e.message, 'warn');
    }
  }

  function listNodes(){
    const rows=registry.nodes.map(n => {
      const surface=n.interface_url ? 'interface' : (n.repo ? 'repo' : 'reference');
      return n.id.padEnd(16) + ' ' + surface.padEnd(10) + ' ' + n.label;
    });
    window.out?.(rows.join('\n'), 'system');
  }

  async function pairNode(nodeId, encodedJwk){
    const node=nodeById(nodeId);
    if(!node) return window.out?.('Unknown node: ' + nodeId,'warn');
    if(!encodedJwk) return window.out?.('usage: comms pair <node> <base64url-public-jwk>','warn');
    try{
      const jwk=JSON.parse(b64uToText(encodedJwk));
      if(jwk.kty!=='EC' || jwk.crv!=='P-256' || !jwk.x || !jwk.y) throw new Error('expected P-256 ECDH public JWK');
      await crypto.subtle.importKey('jwk',jwk,{name:'ECDH',namedCurve:'P-256'},false,[]);
      sessionStorage.setItem('cryptic.nodekey.'+nodeId,JSON.stringify(jwk));
      const fp=await window.fingerprint?.(JSON.stringify(jwk));
      window.ledger?.('comms.pair',{node:nodeId,key_fp:fp});
      window.out?.('Paired public encryption key for '+nodeId+' fp='+fp+'. Private key remains off the public page.','good');
    }catch(e){ window.out?.('Pair failed: '+e.message,'bad'); }
  }

  async function sealToNode(nodeId, message){
    const raw=sessionStorage.getItem('cryptic.nodekey.'+nodeId);
    if(!raw) return window.out?.('No public key paired for '+nodeId+'. Use comms pair first.','warn');
    if(!message) return window.out?.('usage: comms seal <node> <message>','warn');
    try{
      const recipient=await crypto.subtle.importKey('jwk',JSON.parse(raw),{name:'ECDH',namedCurve:'P-256'},false,[]);
      const eph=await crypto.subtle.generateKey({name:'ECDH',namedCurve:'P-256'},true,['deriveKey']);
      const aes=await crypto.subtle.deriveKey({name:'ECDH',public:recipient},eph.privateKey,{name:'AES-GCM',length:256},false,['encrypt']);
      const iv=crypto.getRandomValues(new Uint8Array(12));
      const cipher=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv},aes,new TextEncoder().encode(message)));
      const pub=await crypto.subtle.exportKey('jwk',eph.publicKey);
      const envelope={v:1,alg:'ECDH-P256+A256GCM',to:nodeId,ts:new Date().toISOString(),epk:pub,iv:bytesToB64u(iv),ct:bytesToB64u(cipher)};
      const token=await gatewayToken(nodeId,'comms.envelope');
      if(!token) return;
      const res=await fetch(GATEWAY+'/v1/envelope',{method:'POST',headers:{'content-type':'application/json','x-cryptic-token':token},body:JSON.stringify({ciphertext:JSON.stringify(envelope)})});
      const data=await res.json();
      if(!res.ok) throw new Error(data.error||'gateway_rejected');
      window.ledger?.('comms.envelope.accepted',{node:nodeId,receipt:data.receipt?.id,bytes:data.receipt?.bytes});
      window.out?.('Encrypted envelope accepted. receipt='+data.receipt?.id+' · gateway stored no plaintext.','good');
    }catch(e){ window.out?.('Seal failed: '+e.message,'bad'); }
  }

  async function comms(args){
    const op=(args.shift()||'').toLowerCase();
    if(op==='pair') return pairNode(args.shift(),args.shift());
    if(op==='seal') return sealToNode(args.shift(),args.join(' '));
    if(op==='key-format'){
      const sample={kty:'EC',crv:'P-256',x:'…',y:'…',ext:true};
      return window.out?.('Pair format: base64url(JSON.stringify(publicJwk)). Example shape: '+JSON.stringify(sample),'system');
    }
    window.out?.('comms: pair <node> <base64url-public-jwk> | seal <node> <message> | key-format','system');
  }

  async function proposeChange(args){
    const nodeId=args.shift();
    const proposal=args.join(' ').trim();
    if(!nodeId || !proposal) return window.out?.('usage: change <node> <proposal>','warn');
    if(!nodeById(nodeId)) return window.out?.('Unknown node: '+nodeId,'warn');
    const token=await gatewayToken(nodeId,'change.propose');
    if(!token) return;
    try{
      const res=await fetch(GATEWAY+'/v1/change/propose',{method:'POST',headers:{'content-type':'application/json','x-cryptic-token':token},body:JSON.stringify({proposal})});
      const data=await res.json();
      if(!res.ok) throw new Error(data.error||'proposal_rejected');
      window.ledger?.('change.proposed',{node:nodeId,receipt:data.receipt?.id,sha:data.receipt?.proposal_sha256});
      window.out?.('CHANGE PROPOSED, NOT APPLIED. receipt='+data.receipt?.id+' sha256='+data.receipt?.proposal_sha256+'. Authenticated adapter approval is still required.','good');
    }catch(e){ window.out?.('Change proposal failed: '+e.message,'bad'); }
  }


  async function bridgeAction(action){
    if(!['runtime.info','git.status','git.fetch','git.pull-ff'].includes(action||'')){
      return window.out?.('bridge action: runtime.info | git.status | git.fetch | git.pull-ff','system');
    }
    const url=sessionStorage.getItem('cryptic.bridge.url');
    const secret=sessionStorage.getItem('cryptic.bridge.secret');
    if(!url || !secret) return window.out?.('Bridge not connected. Use bridge connect <url> <secret>.','warn');
    const signed=await gatewayToken('bridge','bridge.action.'+action);
    if(!signed) return;
    try{
      const res=await fetch(url.replace(/\/$/,'')+'/v1/action',{
        method:'POST',
        headers:{
          'content-type':'application/json',
          'authorization':'Bearer '+secret,
          'x-cryptic-request-token':signed
        },
        body:JSON.stringify({action})
      });
      const data=await res.json();
      if(!res.ok) throw new Error(data.error||'bridge_action_failed');
      window.ledger?.('bridge.action',{action,jti:data.claims?.jti});
      window.out?.('BRIDGE ACTION '+action+'\n'+JSON.stringify(data.result,null,2),'good');
    }catch(e){ window.out?.('Bridge action failed: '+e.message,'bad'); }
  }

  async function init(){
    try{
      const r=await fetch('./config/nodes.public.json',{cache:'no-store'});
      registry=await r.json();
    }catch(e){
      window.out?.('Node registry load failed: '+e.message,'warn');
      registry={nodes:[]};
    }
    renderNodes();
    checkGateway();
  }

  window.CrypticRuntime={
    gateway:GATEWAY,
    init,
    list:listNodes,
    open:openNode,
    signedToken:gatewayToken,
    comms,
    change:(args)=>proposeChange([...args]),\n    bridgeAction,
    get registry(){return registry;}
  };

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
