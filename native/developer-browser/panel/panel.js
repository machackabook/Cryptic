const form=document.querySelector('#action-form');
form.addEventListener('submit',async event=>{
  event.preventDefault();
  const action=event.submitter?.value;
  const secret=document.querySelector('#secret');
  const capability=document.querySelector('#capability');
  const input=['browser.navigate','browser.lighthouse'].includes(action)?{url:document.querySelector('#url').value}:action==='browser.throttle'?{profile:document.querySelector('#profile').value}:{};
  const headers={Authorization:'Bearer '+secret.value};
  const options={headers,signal:AbortSignal.timeout(120000),redirect:'error'};
  if(action!=='health'){headers['Content-Type']='application/json';headers['x-synapse-capability']=capability.value;options.method='POST';options.body=JSON.stringify({action,input});}
  capability.value='';
  const buttons=[...form.querySelectorAll('button')];buttons.forEach(b=>b.disabled=true);
  document.querySelector('#status').textContent='Waiting for observed result…';
  try{const response=await fetch(action==='health'?'/health':'/v1/action',options);const result=await response.json();document.querySelector('#result').textContent=JSON.stringify(result,null,2);document.querySelector('#status').textContent=response.ok?'Request completed; see observed result.':'Request denied or failed; no success claimed.';}
  catch{document.querySelector('#status').textContent='Broker unavailable or request timed out. Inspect state before retrying a mutation.';}
  finally{buttons.forEach(b=>b.disabled=false);}
});
