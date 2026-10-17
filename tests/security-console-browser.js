const realFetch=globalThis.fetch.bind(globalThis);
const results=[];const assert=(ok,label)=>{if(!ok)throw Error(label);results.push(label)};
try{
 const page=await realFetch('../security/index.html').then(r=>r.text());
 const html=new DOMParser().parseFromString(page,'text/html');document.body.replaceChildren(...html.body.childNodes);
 const catalog=await realFetch('../config/device-profiles.public.json').then(r=>r.json());
 const sources=await realFetch('../config/document-provenance.public.json').then(r=>r.json());
 const state={automation:{running:false,intervalMs:15000},devices:[],host:null};
 const posts=[];const deviceToken='browser-fixture-device-credential-'.repeat(2);
 globalThis.fetch=async(url,opts={})=>{
  if(!String(url).includes('/api/security/'))return realFetch(url,opts);
  const suffix=new URL(url).pathname.replace('/api/security','');let payload={};
  if(opts.method==='POST'){
   const body=JSON.parse(opts.body);posts.push({suffix,body});
   if(suffix==='/devices'){state.devices.push({...body,status:'registered'});payload={deviceToken}}
   if(suffix.endsWith('/telemetry')){state.devices[0].status='active';payload={accepted:true}}
   if(suffix.endsWith('/revoke'))state.devices[0].status='revoked';
   if(suffix==='/automation/start')state.automation.running=true;
   if(suffix==='/automation/stop')state.automation.running=false;
   if(suffix==='/automation/config')state.automation.intervalMs=body.intervalMs;
   if(suffix==='/vpn/plan'){assert(Boolean(body.cidr)&&!Object.hasOwn(body,'target'),'VPN plan contract');payload={plan:{applied:false}}}
  }else if(suffix==='/status')payload={status:state};
  else if(suffix==='/profiles')payload={profiles:catalog.profiles,sources:sources.sources};
  else if(suffix==='/devices')payload={devices:state.devices};
  else if(suffix==='/telemetry')payload={samples:[],host:state.host};
  else if(suffix==='/vpn')payload={vpn:{status:'unverified'}};
  else if(suffix==='/export')payload={evidence:{productionVerified:false}};
  else if(suffix==='/receipts')payload={receipts:[],anchor:{}};
  return new Response(JSON.stringify({ok:true,...payload}));
 };
 await import('../security/console.js');
 const root=document.querySelector('#securityConsole');
 const field=n=>root.querySelector('[name="'+n+'"]');
 const action=n=>root.querySelector('[data-action="'+n+'"]');
 const wait=async predicate=>{for(let i=0;i<200;i++){if(predicate())return;await new Promise(r=>setTimeout(r,10))}throw Error('UI deadline')};
 const submit=async(form,expect)=>{root.querySelector('[data-form="'+form+'"]').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));await wait(expect)};
 await wait(()=>field('profileId').options.length===6);
 assert(action('startAutomation').disabled,'Disconnected actions disabled');
 field('adminToken').value='browser-fixture-operator-credential-'.repeat(2);
 await submit('connect',()=>root.querySelector('[data-view="connection"]').textContent==='Authenticated');
 assert(field('adminToken').value==='','Operator input cleared');
 field('deviceId').value='browser-device';field('deviceName').value='Browser receiver';field('profileId').value='navstorm-m-23-b98-01';field('reviewed').checked=true;
 await submit('register',()=>Boolean(root.querySelector('[data-view="deviceToken"]').value));
 assert(!root.querySelector('[data-view="handoff"]').hidden,'One-time device handoff');
 field('telemetryDeviceId').value='browser-device';field('deviceCredential').value=deviceToken;field('metrics').value='{"temperatureC":95}';
 await submit('telemetry',()=>state.devices[0].status==='active');
 assert(posts.some(p=>p.suffix.endsWith('/telemetry')&&p.body.metrics.temperatureC===95),'Out-of-reference measurement retained');await wait(()=>!action('configureAutomation').disabled);
 field('intervalSeconds').value='5';await submit('automation',()=>state.automation.intervalMs===5000);await wait(()=>!action('startAutomation').disabled);
 action('startAutomation').click();await wait(()=>state.automation.running&& !action('stopAutomation').disabled);assert(action('startAutomation').disabled,'Start/stop state gates');
 action('stopAutomation').click();await wait(()=>!state.automation.running&&!action('startAutomation').disabled);
 action('offlineAudit').click();await wait(()=>posts.some(p=>p.suffix==='/audit'&&p.body.mode==='offline'));await wait(()=>!action('offlineAudit').disabled);
 assert(action('dnsAudit').disabled,'DNS consent gate');root.querySelector('[data-view="dnsConsent"]').checked=true;root.querySelector('[data-view="dnsConsent"]').dispatchEvent(new Event('change',{bubbles:true}));action('dnsAudit').click();await wait(()=>posts.some(p=>p.body.mode==='dns'&&p.body.networkConsent));await wait(()=>!action('offlineAudit').disabled);
 field('vpnTarget').value='10.24.0.0/24';field('vpnOperators').value='operator@example.invalid';await submit('vpn',()=>!root.querySelector('[data-view="vpnPlan"]').hidden);
 root.querySelector('[data-action="revoke"]').click();await wait(()=>state.devices[0].status==='revoked');await wait(()=>!action('refresh').disabled);
 action('dismissCredential').click();assert(!root.querySelector('[data-view="deviceToken"]').value,'Device credential clear');
 action('disconnect').click();assert(action('refresh').disabled,'Disconnect gates mutations');
 const output=document.createElement('pre');output.id='results';output.textContent='PASS '+results.length+' browser checks; '+posts.length+' authenticated API mutations';document.body.append(output);
}catch(e){const output=document.createElement('pre');output.id='results';output.textContent='FAIL '+e.message;document.body.append(output)}
