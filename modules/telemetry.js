export function mount(root){
 const rows=root.querySelector('#telemetryRows'),metrics=root.querySelector('#telemetryMetrics'),health=root.querySelector('#telemetryHealth');
 function refresh(){const s=window.CrypticConsole?.telemetry?.summary?.();if(!s)return;rows.textContent=s.rows||0;const t=s.latest;metrics.innerHTML=[['LCP',t?.web_vitals?.lcp_ms!=null?t.web_vitals.lcp_ms+' ms':'—'],['CLS',t?.web_vitals?.cls??'—'],['INP',t?.web_vitals?.inp_ms!=null?t.web_vitals.inp_ms+' ms':'—'],['RESOURCES',t?.resources?.count??0]].map(([a,b])=>'<div class="mini-card"><b>'+a+'</b><span>'+b+'</span></div>').join('');health.textContent=navigator.onLine?'LIVE':'LOCAL'}
 root.querySelector('#telemetrySnapshot').onclick=()=>{window.CrypticConsole?.telemetry?.snapshot?.('dashboard');refresh()};
 root.querySelector('#telemetrySend').onclick=async()=>{await window.CrypticConsole?.telemetry?.send?.('dashboard');refresh()};
 root.querySelector('#telemetryExport').onclick=()=>window.CrypticConsole?.telemetry?.export?.();
 refresh();setInterval(refresh,2500);
}
