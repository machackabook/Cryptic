(() => {
 const log=document.getElementById('logStream');
 function appendLog(text,color=''){const d=document.createElement('div');d.className='log-line '+color;d.textContent='['+new Date().toISOString()+'] '+text;log?.appendChild(d);if(log)log.scrollTop=log.scrollHeight}
 function terminal(){return window.CrypticTerminal||(window.parent!==window?window.parent.CrypticTerminal:null)}
 document.getElementById('btnVerifyPair')?.addEventListener('click',async()=>{
  appendLog('Checking for a connected local bridge or identity verifier...','gold');
  const term=terminal();
  if(!term){appendLog('UNVERIFIED: Cryptic runtime is not available in this page context. No device pair was tested.','gold');return}
  try{const r=await term.exec('bridge status');appendLog('Bridge status requested. The bridge health result does not itself prove Samsung–Chromebook device identity.','gold');if(r?.ok===true)appendLog('A local bridge health response was observed; device pairing remains unverified.','green');else appendLog('No authenticated pairing proof was returned.','gold')}catch{appendLog('UNVERIFIED: bridge or identity adapter unavailable.','gold')}
 });
 document.getElementById('btnQuineLoop')?.addEventListener('click',async()=>{
  try{const bytes=new TextEncoder().encode(document.documentElement.outerHTML);const digest=await crypto.subtle.digest('SHA-256',bytes);const fp=[...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('');appendLog('Measured current page SHA-256: '+fp+'. This is a page fingerprint, not proof of a verified quine loop.','gold')}catch{appendLog('Fingerprint unavailable in this browser context. No quine pass claimed.','gold')}
 });
 document.getElementById('btnAudit')?.addEventListener('click',async()=>{
  const term=terminal();if(!term){appendLog('UNVERIFIED: no runtime adapter connected; no local logs or device paths were scanned.','gold');return}
  try{await term.exec('sentinel audit');appendLog('Audit request dispatched. Inspect the terminal response for bridge availability; this page does not independently scan local disk.','gold')}catch{appendLog('Audit adapter unavailable. No evidence directory was scanned.','gold')}
 });
})();