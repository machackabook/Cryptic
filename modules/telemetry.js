export function mount(root){
 const rows=root.querySelector('#telemetryRows'),metrics=root.querySelector('#telemetryMetrics'),health=root.querySelector('#telemetryHealth');
 function refresh(){
  const summary=window.CrypticConsole?.telemetry?.summary?.();
  if(!summary)return;
  if(rows)rows.textContent=String(summary.rows||0);
  if(metrics){
   metrics.replaceChildren();
   const t=summary.latest;
   const pairs=[['LCP',t?.web_vitals?.lcp_ms!=null?String(t.web_vitals.lcp_ms)+' ms':'—'],['CLS',t?.web_vitals?.cls!=null?String(t.web_vitals.cls):'—'],['INP',t?.web_vitals?.inp_ms!=null?String(t.web_vitals.inp_ms)+' ms':'—'],['RESOURCES',String(t?.resources?.count??0)]];
   for(const [label,value] of pairs){
    const card=document.createElement('div');card.className='mini-card';
    const b=document.createElement('b');b.textContent=label;
    const span=document.createElement('span');span.textContent=value;
    card.append(b,span);metrics.append(card);
   }
  }
  if(health)health.textContent=navigator.onLine?'LOCAL / NETWORK AVAILABLE':'LOCAL ONLY';
 }
 root.querySelector('#telemetrySnapshot')?.addEventListener('click',()=>{window.CrypticConsole?.telemetry?.snapshot?.('dashboard');refresh()});
 root.querySelector('#telemetrySend')?.addEventListener('click',async()=>{const result=await window.CrypticConsole?.telemetry?.send?.('dashboard');if(health)health.textContent=result?.ok?'SEND ACKNOWLEDGED':'SEND UNCONFIRMED';refresh()});
 root.querySelector('#telemetryExport')?.addEventListener('click',()=>window.CrypticConsole?.telemetry?.export?.());
 refresh();
}
