import {TIERS,runLocalCommand} from './lite-core.mjs';
const $=s=>document.querySelector(s);
const output=$('#output'),field=$('#command');
function append(message){
 const p=document.createElement('p');p.textContent=String(message);output.appendChild(p);
 while(output.childNodes.length>75)output.removeChild(output.firstChild);
 output.scrollTop=output.scrollHeight;
}
function run(value){
 const result=runLocalCommand(value);
 if(result.kind==='clear')output.replaceChildren();
 else append('PUBLIC:// '+String(value).slice(0,180)+'\n'+result.text);
}
function setTier(key){
 const tier=TIERS[key];if(!tier)return;
 $('#tier-name').textContent=tier.label;
 $('#tier-description').textContent=tier.description;
 $('#tier-status').textContent=tier.status;
 $('#tier-abilities').replaceChildren(...tier.abilities.map(s=>{const li=document.createElement('li');li.textContent=s;return li;}));
 document.querySelectorAll('[data-tier]').forEach(b=>{const on=b.dataset.tier===key;b.classList.toggle('selected',on);b.setAttribute('aria-pressed',String(on));});
}
document.querySelectorAll('[data-tier]').forEach(button=>button.addEventListener('click',()=>setTier(button.dataset.tier)));
$('#command-form').addEventListener('submit',e=>{e.preventDefault();const cmd=field.value.trim();if(!cmd)return;run(cmd);field.value='';field.focus();});
$('#help-btn').addEventListener('click',()=>run('help'));
$('#status-btn').addEventListener('click',()=>run('status'));
$('#clear-btn').addEventListener('click',()=>run('clear'));
setTier('public');

/* A compiled advanced viewer is optional; keep navigation functional until deployed. */
const advancedSource='https://github.com/machackabook/Cryptics-Hyper-Terminal-OS';
const advancedLinks=[...document.querySelectorAll('a[href="./full/"]')];
fetch(new URL('./full/index.html',location.href),{method:'HEAD',redirect:'error',cache:'no-store'})
 .then(response=>{if(!response.ok)throw Error('Advanced bundle unavailable');})
 .catch(()=>{for(const link of advancedLinks){link.href=advancedSource;link.textContent='VIEW ADVANCED SOURCE ↗';link.title='Compiled HyperTerminal deployment has not been verified';}});
