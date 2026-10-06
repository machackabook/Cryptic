import {sampleHamiltonianXZ,sampleTorusTube,sessionGeometryHolds} from '../modules/session-geometry.js';

const T=globalThis.THREE;
if(!T)throw new Error('Three.js failed to load');

const $=s=>document.querySelector(s);
const safeJSON=(key,fallback=[])=>{try{const v=JSON.parse(localStorage.getItem(key)||'null');return v??fallback}catch{return fallback}};
const engine={renderer:null,scene:null,camera:null,knot:null,material:null,points:null,clock:new T.Clock(),targetMutation:.08,currentMutation:.08,focus:false,realSignal:0,lastLedger:0,lastTelemetry:0};

function appendLedger(event,data={}){
 const arr=safeJSON('cryptic.ledger',[]);
 arr.push({ts:new Date().toISOString(),event,data});
 if(arr.length>512)arr.splice(0,arr.length-512);
 localStorage.setItem('cryptic.ledger',JSON.stringify(arr));
 renderData();
}

function realCounts(){
 const ledger=safeJSON('cryptic.ledger',[]);
 const telemetry=safeJSON('cryptic.telemetry.v1',[]);
 return {ledger:Array.isArray(ledger)?ledger:[],telemetry:Array.isArray(telemetry)?telemetry:[]};
}

function renderLedger(){
 const {ledger}=realCounts(),ul=$('#ledgerList');
 ul.innerHTML='';
 for(const row of ledger.slice(-12).reverse()){
   const li=document.createElement('li');
   const t=document.createElement('time');
   t.textContent='['+(row.ts?new Date(row.ts).toLocaleTimeString():'--')+'] ';
   li.append(t,document.createTextNode(String(row.event||'event')));
   ul.appendChild(li);
 }
 if(!ledger.length){const li=document.createElement('li');li.textContent='No Cryptic receipts yet.';ul.appendChild(li)}
 $('#metricLedger').textContent=String(ledger.length);
}

async function renderRoutes(){
 const grid=$('#busState');
 const states={sameOrigin:true,edge:false,localhost:Boolean(sessionStorage.getItem('cryptic.bridge.url'))};
 try{
   const r=await fetch('https://bus.crypticnews.org/v1/status',{cache:'no-store'});
   states.edge=r.ok;
   const j=await r.json().catch(()=>({}));
   $('#edgeReceipt').textContent=r.ok?'EDGE '+(j.version||'ONLINE')+' · '+(j.persistence||'receipt mode'):'Edge bus degraded';
 }catch(e){$('#edgeReceipt').textContent='Edge bus unavailable: '+e.message}
 grid.innerHTML='';
 for(const [name,on] of Object.entries(states)){
   const d=document.createElement('div');d.className='route-chip '+(on?'on':'');d.textContent=name.toUpperCase()+' · '+(on?'READY':'OFF');grid.appendChild(d)
 }
 $('#metricBridge').textContent=states.localhost?'ON':'OFF';
}

async function renderSurfaces(){
 const box=$('#surfaceList');box.innerHTML='';
 try{
   const r=await fetch('../config/nodes.public.json',{cache:'no-store'}),j=await r.json();
   for(const n of (j.nodes||[]).slice(0,14)){
     const a=document.createElement('a');a.className='surface-link';a.href=n.interface_url||n.repo||'#';a.textContent=n.label||n.id;
     const href=a.getAttribute('href')||'';
     if(href.startsWith('./')){
       a.href='#';a.onclick=e=>{e.preventDefault();openSameOriginSurface(n)}
     }else{a.target='_blank';a.rel='noopener noreferrer'}
     box.appendChild(a);
   }
 }catch(e){box.textContent='Node registry unavailable: '+e.message}
}

function openSameOriginSurface(node){
 const stage=$('#magicStage');stage.innerHTML='';
 const section=document.createElement('section');section.className='magic-surface';
 const frame=document.createElement('iframe');frame.src='../'+String(node.interface_url).replace(/^\.\//,'');frame.title=node.label||node.id;frame.sandbox='allow-scripts allow-same-origin allow-forms allow-popups allow-downloads';
 section.appendChild(frame);stage.appendChild(section);$('#browserLocation').textContent='cryptic://surface/'+node.id;
 appendLedger('magic.surface.open',{node:node.id});
}

function updateSignal(){
 const {ledger,telemetry}=realCounts();
 const ledgerDelta=Math.max(0,ledger.length-engine.lastLedger),teleDelta=Math.max(0,telemetry.length-engine.lastTelemetry);
 engine.lastLedger=ledger.length;engine.lastTelemetry=telemetry.length;
 engine.realSignal=Math.min(1,engine.realSignal*.82+ledgerDelta*.12+teleDelta*.2);
 const baseline=engine.focus?.35:.08;
 engine.targetMutation=Math.min(1.15,baseline+engine.realSignal*.62+Math.min(.25,telemetry.length/400));
 $('#metricTelemetry').textContent=String(telemetry.length);
}

function renderData(){renderLedger();updateSignal()}
setInterval(()=>{renderData();renderRoutes()},3500);
window.addEventListener('storage',e=>{if(e.key==='cryptic.ledger'||e.key==='cryptic.telemetry.v1')renderData()});

function initWebGL(){
 const canvas=$('#magicCanvas');
 const scene=new T.Scene();scene.fog=new T.FogExp2(0x010102,.065);
 const camera=new T.PerspectiveCamera(58,innerWidth/innerHeight,.1,1000);camera.position.z=7.2;
 const renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));renderer.setSize(innerWidth,innerHeight);
 const material=new T.MeshStandardMaterial({color:0x29c8ff,roughness:.18,metalness:.84,wireframe:true,emissive:0x001c2f});
 const geom=new T.TorusKnotGeometry(1.45,.30,220,48,3,5),orig=new Float32Array(geom.attributes.position.array);geom.userData.orig=orig;
 const knot=new T.Mesh(geom,material);scene.add(knot);
 scene.add(new T.AmbientLight(0x236080,.7));const dl=new T.DirectionalLight(0x70f6ff,2.2);dl.position.set(4,5,5);scene.add(dl);

 const count=420,pos=new Float32Array(count*3),col=new Float32Array(count*3);
 for(let i=0;i<count;i++){
   const theta=i/count*Math.PI*2*9,phi=(i%70)/70*Math.PI*2;
   const a=i%2===0?sampleHamiltonianXZ(theta,3.7,0):sampleTorusTube(3.8,1.1,phi,theta,0,i);
   pos[i*3]=a.x;pos[i*3+1]=a.y*.58;pos[i*3+2]=a.z;
   col[i*3]=.12;col[i*3+1]=.72+(i%5)*.045;col[i*3+2]=1;
 }
 const pg=new T.BufferGeometry();pg.setAttribute('position',new T.BufferAttribute(pos,3));pg.setAttribute('color',new T.BufferAttribute(col,3));
 const pm=new T.PointsMaterial({size:.055,vertexColors:true,transparent:true,opacity:.76,blending:T.AdditiveBlending});
 const points=new T.Points(pg,pm);scene.add(points);
 Object.assign(engine,{renderer,scene,camera,knot,material,points});

 function frame(){
   requestAnimationFrame(frame);if(document.hidden)return;
   const t=engine.clock.getElapsedTime();engine.currentMutation=T.MathUtils.lerp(engine.currentMutation,engine.targetMutation,.025);
   const m=engine.currentMutation;$('#metricMutation').textContent=(m*100).toFixed(1)+'%';
   knot.rotation.x=t*.10;knot.rotation.y=t*.16;
   const pa=geom.attributes.position,base=geom.userData.orig;
   for(let i=0;i<pa.count;i++){
     const x=base[i*3],y=base[i*3+1],z=base[i*3+2],d=Math.hypot(x,y,z),wave=Math.sin(d*8-t*2.1);
     const nx=Math.sin(y*3.2+t)*Math.cos(z*3.1-t*.4),ny=Math.cos(x*3.2-t*.8)*Math.sin(z*3+t),nz=Math.sin(x*3.3+t*.6)*Math.cos(y*3.1-t);
     pa.setXYZ(i,x+nx*.36*m+x*wave*.10*m,y+ny*.36*m+y*wave*.10*m,z+nz*.36*m+z*wave*.10*m)
   }
   pa.needsUpdate=true;
   material.color.lerpColors(new T.Color(0x29c8ff),new T.Color(0xd545ff),Math.min(1,m));material.emissive.lerpColors(new T.Color(0x001c2f),new T.Color(0x35004c),Math.min(1,m));
   const pp=points.geometry.attributes.position.array;
   for(let i=0;i<count;i++){
     const theta=i/count*Math.PI*18+t*.018*(1+(i%4)*.2),phi=(i%70)/70*Math.PI*2+t*.011;
     const a=i%2===0?sampleHamiltonianXZ(theta,3.7,t*.35):sampleTorusTube(3.8,1.1,phi,theta,t*.35,i);
     const pull=engine.focus?.Math.max(.25,1-m*.38):1;
     pp[i*3]=a.x*pull;pp[i*3+1]=a.y*.58*pull;pp[i*3+2]=a.z*pull;
   }
   points.geometry.attributes.position.needsUpdate=true;
   renderer.render(scene,camera)
 }
 frame();
 addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));renderer.setSize(innerWidth,innerHeight)},{passive:true})
}

$('#btnDash').onclick=()=>{document.body.classList.toggle('dash-active');appendLedger(document.body.classList.contains('dash-active')?'magic.dash.merge':'magic.dash.dock')};
$('#btnFocus').onclick=e=>{engine.focus=!engine.focus;e.currentTarget.classList.toggle('active',engine.focus);updateSignal();appendLedger('magic.polymorph.toggle',{active:engine.focus})};
$('#rootToggle').onclick=e=>{document.body.classList.toggle('ui-clear');const on=document.body.classList.contains('ui-clear');e.currentTarget.setAttribute('aria-pressed',String(on));appendLedger('magic.ui.clear',{active:on})};
document.body.addEventListener('click',e=>{const b=e.target.closest('[data-route]');if(b)$('#browserLocation').textContent='cryptic://magic/'+b.dataset.route});
document.body.addEventListener('htmx:afterSwap',e=>{if(e.detail?.target?.id==='magicStage')appendLedger('magic.surface.swap',{path:$('#browserLocation').textContent})});

$('#systemStatus').innerHTML='SYS.OP.REAL<br>GEOMETRY.'+(sessionGeometryHolds().secrets?'BLOCKED':'VERIFIED');
renderData();renderRoutes();renderSurfaces();initWebGL();
appendLedger('magic.window.online',{version:'0.9.0',source:'Drive Magic Window neural-polymorph lineage'});
window.CrypticMagic={engine,renderData,renderRoutes,renderSurfaces,openSameOriginSurface};
