import {safeReference,protectedFrame} from './security-guard.mjs';
import {installSecureRouter} from './surface-router.mjs';
import {sampleHamiltonianXZ,sampleTorusTube,sessionGeometryHolds} from '../modules/session-geometry.js';

const T=globalThis.THREE;
// Controls remain functional if the integrity-pinned optional WebGL dependency is unavailable.

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
 const states={sameOrigin:true,edge:false,localhost:Boolean(window.CrypticBridgeProfile?.url)};
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
 const box=$('#surfaceList');box.replaceChildren();
 const root=new URL('../',location.href).href;
 try{
  const r=await fetch('../config/nodes.public.json',{redirect:'error',cache:'no-store',headers:{accept:'application/json'}});
  if(!r.ok||r.redirected)throw Error('GOD_REGISTRY_SOURCE_DENIED');
  const j=await r.json();
  for(const n of (j.nodes||[]).slice(0,50)){
   const url=safeReference(n.interface_url||n.repo,root,location.origin);
   if(!url)continue;
   const a=document.createElement('a');a.className='surface-link';a.href=url;a.textContent=String(n.label||n.id).slice(0,90);
   const embedded=protectedFrame(n,root,location.origin);
   if(embedded){a.addEventListener('click',e=>{e.preventDefault();openSameOriginSurface(n)})}
   else{a.target='_blank';a.rel='noopener noreferrer';a.referrerPolicy='no-referrer'}
   box.appendChild(a);
  }
  if(!box.childElementCount)box.textContent='No approved repository links available.';
 }catch(e){box.textContent='GOD REGISTRY BLOCKED: '+e.message}
}
function openSameOriginSurface(node){
 const root=new URL('../',location.href).href,src=protectedFrame(node,root,location.origin);
 if(!src)throw Error('GOD_EMBED_DENIED');
 const stage=$('#magicStage');stage.replaceChildren();
 const section=document.createElement('section');section.className='magic-surface';
 const frame=document.createElement('iframe');frame.src=src;frame.title=String(node.label||node.id).slice(0,90);
 frame.setAttribute('sandbox','allow-scripts');frame.referrerPolicy='no-referrer';
 section.appendChild(frame);stage.appendChild(section);
 $('#browserLocation').textContent='cryptic://surface/'+String(node.id).replace(/[^-\\w]/g,'').slice(0,70);
 appendLedger('magic.surface.open',{node:String(node.id).slice(0,60)});
}

function updateSignal(){
 const {ledger,telemetry}=realCounts();
 const ledgerDelta=Math.max(0,ledger.length-engine.lastLedger),teleDelta=Math.max(0,telemetry.length-engine.lastTelemetry);
 engine.lastLedger=ledger.length;engine.lastTelemetry=telemetry.length;
 engine.realSignal=Math.min(1,engine.realSignal*.82+ledgerDelta*.12+teleDelta*.2);
 const baseline=engine.focus ? .35 : .08;
 engine.targetMutation=Math.min(1.15,baseline+engine.realSignal*.62+Math.min(.25,telemetry.length/400));
 $('#metricTelemetry').textContent=String(telemetry.length);
}

let clockMode = 'UTC'; // 'UTC', 'LOCAL', 'EPOCH', 'SIDEREAL'
const clockModes = ['UTC', 'LOCAL', 'EPOCH', 'SIDEREAL'];

function getSiderealTime(date) {
  // Greenwich Mean Sidereal Time (GMST) approximation
  const jd = (date.getTime() / 86400000) + 2440587.5;
  const d = jd - 2451545.0;
  let gmst = 18.697374558 + 24.06570982441908 * d;
  gmst = gmst % 24;
  if (gmst < 0) gmst += 24;
  const hours = Math.floor(gmst);
  const minutes = Math.floor((gmst - hours) * 60);
  const seconds = Math.floor(((gmst - hours) * 60 - minutes) * 60);
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')} GST`;
}

function updateSystemClock() {
  const now = new Date();
  const clk = $('#sysUtcClock');
  const dt = $('#sysUtcDate');
  const lbl = $('#clockModeLabel');

  if (clockMode === 'UTC') {
    if (lbl) lbl.textContent = 'SYSTEM CLOCK // UTC';
    const hh = String(now.getUTCHours()).padStart(2, '0');
    const mm = String(now.getUTCMinutes()).padStart(2, '0');
    const ss = String(now.getUTCSeconds()).padStart(2, '0');
    if (clk) clk.textContent = `${hh}:${mm}:${ss} UTC`;
    if (dt) {
      const yr = now.getUTCFullYear();
      const mo = String(now.getUTCMonth() + 1).padStart(2, '0');
      const da = String(now.getUTCDate()).padStart(2, '0');
      dt.textContent = `${yr}-${mo}-${da} · CONTINUITY TICK`;
    }
  } else if (clockMode === 'LOCAL') {
    if (lbl) lbl.textContent = 'SYSTEM CLOCK // LOCAL';
    if (clk) clk.textContent = now.toLocaleTimeString();
    if (dt) dt.textContent = now.toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
  } else if (clockMode === 'EPOCH') {
    if (lbl) lbl.textContent = 'SYSTEM CLOCK // UNIX EPOCH';
    if (clk) clk.textContent = String(Math.floor(now.getTime() / 1000)) + 's';
    if (dt) dt.textContent = `${now.getTime()} ms · CONTINUUM`;
  } else if (clockMode === 'SIDEREAL') {
    if (lbl) lbl.textContent = 'SYSTEM CLOCK // SIDEREAL';
    if (clk) clk.textContent = getSiderealTime(now);
    if (dt) dt.textContent = 'EQUINOX J2000.0 · STELLAR PHASE';
  }
}
updateSystemClock();
setInterval(updateSystemClock, 250);

// Clock mode toggle on click
const sysWidget = $('#sysClockWidget');
if (sysWidget) {
  sysWidget.onclick = (e) => {
    if (e.target && e.target.id === 'clockCopyBtn') return;
    const curIdx = clockModes.indexOf(clockMode);
    clockMode = clockModes[(curIdx + 1) % clockModes.length];
    updateSystemClock();
    appendLedger('system.clock.mode', { mode: clockMode });
  };
}

const copyBtn = $('#clockCopyBtn');
if (copyBtn) {
  copyBtn.onclick = async (e) => {
    e.stopPropagation();
    const clk = $('#sysUtcClock');
    const text = clk ? clk.textContent : new Date().toISOString();
    try {
      await navigator.clipboard.writeText(text);
      copyBtn.textContent = 'COPIED';
      setTimeout(() => { copyBtn.textContent = 'COPY'; }, 1500);
      appendLedger('system.clock.copy', { text });
    } catch {
      copyBtn.textContent = 'SYNCED';
      setTimeout(() => { copyBtn.textContent = 'COPY'; }, 1500);
    }
  };
}

setInterval(() => { renderData(); renderRoutes(); }, 3500);
window.addEventListener('storage', e => {
  if (e.key === 'cryptic.ledger' || e.key === 'cryptic.telemetry.v1') renderData();
});

function initWebGL() {
  const canvas = $('#magicCanvas');
  const scene = new T.Scene();
  scene.fog = new T.FogExp2(0x010103, 0.045);
  
  const camera = new T.PerspectiveCamera(56, innerWidth / innerHeight, 0.1, 1500);
  camera.position.set(0, 0, 7.8);
  
  const renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
  renderer.setSize(innerWidth, innerHeight);

  // 1. Central Torus Knot with relativistic metallic shader
  const material = new T.MeshStandardMaterial({
    color: 0x29c8ff,
    roughness: 0.16,
    metalness: 0.88,
    wireframe: true,
    emissive: 0x001c2f
  });
  const geom = new T.TorusKnotGeometry(1.48, 0.32, 240, 52, 3, 5);
  const orig = new Float32Array(geom.attributes.position.array);
  geom.userData.orig = orig;
  const knot = new T.Mesh(geom, material);
  scene.add(knot);

  // Lighting
  scene.add(new T.AmbientLight(0x184260, 0.85));
  const dl1 = new T.DirectionalLight(0x70f6ff, 2.4);
  dl1.position.set(5, 6, 6);
  scene.add(dl1);
  const dl2 = new T.DirectionalLight(0xa855f7, 1.8);
  dl2.position.set(-5, -4, 4);
  scene.add(dl2);

  // 2. 7 Galaxies Deep Celestial Skybox (Clusters of spiral star points)
  const GALAXY_STARS = 1400;
  const gPos = new Float32Array(GALAXY_STARS * 3);
  const gCol = new Float32Array(GALAXY_STARS * 3);
  const galaxyCenters = [
    { x: -14, y: -9, z: -35, arms: 2, hue: 0.52 },  // Andromeda M31
    { x: 16, y: -11, z: -40, arms: 3, hue: 0.78 },  // Triangulum M33
    { x: -18, y: 12, z: -38, arms: 1, hue: 0.12 },  // Sombrero M104
    { x: 14, y: 14, z: -32, arms: 2, hue: 0.45 },   // Whirlpool M51
    { x: -6, y: -16, z: -45, arms: 4, hue: 0.92 },  // Cartwheel Ring
    { x: 8, y: -18, z: -42, arms: 1, hue: 0.05 },   // Cigar M82
    { x: 0, y: 0, z: -25, arms: 5, hue: 0.58 }      // Cosmic Gateway Core
  ];
  
  for (let i = 0; i < GALAXY_STARS; i++) {
    const gIdx = i % galaxyCenters.length;
    const g = galaxyCenters[gIdx];
    const arm = i % g.arms;
    const armTheta = (arm / g.arms) * Math.PI * 2 + (i / GALAXY_STARS) * 12;
    const radius = Math.pow(Math.random(), 0.5) * 6.5;
    const gx = g.x + Math.cos(armTheta) * radius + (Math.random() - 0.5) * 1.2;
    const gy = g.y + Math.sin(armTheta) * radius * 0.45 + (Math.random() - 0.5) * 1.2;
    const gz = g.z + (Math.random() - 0.5) * 2.5;
    gPos[i * 3] = gx; gPos[i * 3 + 1] = gy; gPos[i * 3 + 2] = gz;
    const c = new T.Color().setHSL(g.hue, 0.9, 0.65 + Math.random() * 0.3);
    gCol[i * 3] = c.r; gCol[i * 3 + 1] = c.g; gCol[i * 3 + 2] = c.b;
  }
  const gGeom = new T.BufferGeometry();
  gGeom.setAttribute('position', new T.BufferAttribute(gPos, 3));
  gGeom.setAttribute('color', new T.BufferAttribute(gCol, 3));
  const gMat = new T.PointsMaterial({ size: 0.08, vertexColors: true, transparent: true, opacity: 0.75 });
  const galaxyPoints = new T.Points(gGeom, gMat);
  scene.add(galaxyPoints);

  // 3. Multi-Tier Keplerian Resonance Particles (3,600 Particles across 7 Tiers)
  const count = 3600;
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const tier = i % 7;
    const majorRad = 2.4 + tier * 0.85 + (i % 9) * 0.05;
    const theta = (i / count) * Math.PI * 2 * 17;
    const phi = ((i % 120) / 120) * Math.PI * 2;
    const a = i % 2 === 0 ? sampleHamiltonianXZ(theta, majorRad, 0) : sampleTorusTube(majorRad, 0.85, phi, theta, 0, i);
    pos[i * 3] = a.x;
    pos[i * 3 + 1] = a.y * 0.48;
    pos[i * 3 + 2] = a.z;

    // Harmonic Spectral Tier Colors
    if (tier === 0) { col[i * 3] = 0.0; col[i * 3 + 1] = 1.0; col[i * 3 + 2] = 0.85; } // Ergosphere (Cyan)
    else if (tier === 1) { col[i * 3] = 0.96; col[i * 3 + 1] = 0.82; col[i * 3 + 2] = 0.44; } // Photon Sphere (Gold)
    else if (tier === 2) { col[i * 3] = 0.65; col[i * 3 + 1] = 0.35; col[i * 3 + 2] = 1.0; } // Resonant 1 (Violet)
    else if (tier === 3) { col[i * 3] = 0.15; col[i * 3 + 1] = 0.75; col[i * 3 + 2] = 1.0; } // Resonant 2 (Azure)
    else if (tier === 4) { col[i * 3] = 0.20; col[i * 3 + 1] = 0.95; col[i * 3 + 2] = 0.45; } // Asteroid Belt (Emerald)
    else if (tier === 5) { col[i * 3] = 1.0; col[i * 3 + 1] = 0.45; col[i * 3 + 2] = 0.75; } // Kuiper Stream (Rose)
    else { col[i * 3] = 0.45; col[i * 3 + 1] = 0.85; col[i * 3 + 2] = 0.95; } // Oort/Galactic (Ice)
  }
  const pg = new T.BufferGeometry();
  pg.setAttribute('position', new T.BufferAttribute(pos, 3));
  pg.setAttribute('color', new T.BufferAttribute(col, 3));
  const pm = new T.PointsMaterial({ size: 0.052, vertexColors: true, transparent: true, opacity: 0.88, blending: T.AdditiveBlending });
  const points = new T.Points(pg, pm);
  scene.add(points);

  // 4. Relativistic Accretion Ring Mesh & Photon Lensing Horizon
  const accGeom = new T.RingGeometry(2.1, 4.2, 96);
  const accMat = new T.MeshBasicMaterial({
    color: 0x00ffcc,
    side: T.DoubleSide,
    transparent: true,
    opacity: 0.12,
    wireframe: true,
    blending: T.AdditiveBlending
  });
  const accRing = new T.Mesh(accGeom, accMat);
  accRing.rotation.x = Math.PI * 0.42;
  scene.add(accRing);

  // Singularity Event Horizon Sphere (Dark core)
  const holeGeom = new T.SphereGeometry(0.68, 32, 32);
  const holeMat = new T.MeshBasicMaterial({ color: 0x010206 });
  const hole = new T.Mesh(holeGeom, holeMat);
  scene.add(hole);

  // Photon Sphere Glow Ring
  const photonGeom = new T.TorusGeometry(0.78, 0.025, 16, 100);
  const photonMat = new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 });
  const photonRing = new T.Mesh(photonGeom, photonMat);
  scene.add(photonRing);

  Object.assign(engine, { renderer, scene, camera, knot, material, points, accRing, photonRing, galaxyPoints });

  // Pointer Parallax
  let mouseX = 0, mouseY = 0;
  window.addEventListener('pointermove', e => {
    mouseX = (e.clientX / innerWidth - 0.5) * 2;
    mouseY = (e.clientY / innerHeight - 0.5) * 2;
  }, { passive: true });

  function frame() {
    requestAnimationFrame(frame);
    if (document.hidden) return;

    const t = engine.clock.getElapsedTime();
    engine.currentMutation = T.MathUtils.lerp(engine.currentMutation, engine.targetMutation, 0.025);
    const m = engine.currentMutation;
    $('#metricMutation').textContent = (m * 100).toFixed(1) + '%';

    // Camera Parallax & Kerr Dragging
    camera.position.x = T.MathUtils.lerp(camera.position.x, mouseX * 0.85, 0.05);
    camera.position.y = T.MathUtils.lerp(camera.position.y, -mouseY * 0.65, 0.05);
    camera.lookAt(0, 0, 0);

    // Torus Knot Rotations & Wave Deformations
    knot.rotation.x = t * 0.11;
    knot.rotation.y = t * 0.17;
    const pa = geom.attributes.position, base = geom.userData.orig;
    for (let i = 0; i < pa.count; i++) {
      const x = base[i * 3], y = base[i * 3 + 1], z = base[i * 3 + 2];
      const d = Math.hypot(x, y, z), wave = Math.sin(d * 8 - t * 2.2);
      const nx = Math.sin(y * 3.2 + t) * Math.cos(z * 3.1 - t * 0.4);
      const ny = Math.cos(x * 3.2 - t * 0.8) * Math.sin(z * 3 + t);
      const nz = Math.sin(x * 3.3 + t * 0.6) * Math.cos(y * 3.1 - t);
      pa.setXYZ(i, x + nx * 0.36 * m + x * wave * 0.10 * m, y + ny * 0.36 * m + y * wave * 0.10 * m, z + nz * 0.36 * m + z * wave * 0.10 * m);
    }
    pa.needsUpdate = true;

    // Chromatic Emission Lerp
    material.color.lerpColors(new T.Color(0x29c8ff), new T.Color(0xd545ff), Math.min(1, m));
    material.emissive.lerpColors(new T.Color(0x001c2f), new T.Color(0x35004c), Math.min(1, m));

    // Accretion Ring & Photon Sphere Spin
    accRing.rotation.z = t * 0.14;
    photonRing.rotation.x = Math.sin(t * 0.2) * 0.2;
    photonRing.rotation.y = t * 0.25;

    // 7 Galaxies Deep Celestial Rotation
    galaxyPoints.rotation.y = t * 0.008;

    // 3,600 Orbital Particles Keplerian Motion
    const pp = points.geometry.attributes.position.array;
    for (let i = 0; i < count; i++) {
      const tier = i % 7;
      const majorRad = 2.4 + tier * 0.85 + (i % 9) * 0.05;
      const speedMult = 0.015 + (7 - tier) * 0.006;
      const theta = (i / count) * Math.PI * 24 + t * speedMult;
      const phi = ((i % 120) / 120) * Math.PI * 2 + t * 0.014;
      const a = i % 2 === 0 ? sampleHamiltonianXZ(theta, majorRad, t * 0.35) : sampleTorusTube(majorRad, 0.85, phi, theta, t * 0.35, i);
      const pull = engine.focus ? Math.max(0.25, 1 - m * 0.38) : 1;
      pp[i * 3] = a.x * pull;
      pp[i * 3 + 1] = a.y * 0.48 * pull;
      pp[i * 3 + 2] = a.z * pull;
    }
    points.geometry.attributes.position.needsUpdate = true;

    renderer.render(scene, camera);
  }
  frame();

  addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
    renderer.setSize(innerWidth, innerHeight);
  }, { passive: true });
}

$('#btnDash').onclick = () => {
  document.body.classList.toggle('dash-active');
  appendLedger(document.body.classList.contains('dash-active') ? 'magic.dash.merge' : 'magic.dash.dock');
};
$('#btnFocus').onclick = e => {
  engine.focus = !engine.focus;
  e.currentTarget.classList.toggle('active', engine.focus);
  updateSignal();
  appendLedger('magic.polymorph.toggle', { active: engine.focus });
};
$('#rootToggle').onclick = e => {
  document.body.classList.toggle('ui-clear');
  const on = document.body.classList.contains('ui-clear');
  e.currentTarget.setAttribute('aria-pressed', String(on));
  appendLedger('magic.ui.clear', { active: on });
};
document.body.addEventListener('click', e => {
  const b = e.target.closest('[data-route]');
  if (b) $('#browserLocation').textContent = 'cryptic://magic/' + b.dataset.route;
});
document.body.addEventListener('htmx:afterSwap', e => {
  if (e.detail?.target?.id === 'magicStage') appendLedger('magic.surface.swap', { path: $('#browserLocation').textContent });
});

$('#systemStatus').innerHTML = 'SYS.OP.REAL<br>GEOMETRY.' + (sessionGeometryHolds().secrets ? 'BLOCKED' : 'VERIFIED');
installSecureRouter(); renderData(); renderRoutes(); renderSurfaces(); if(T)initWebGL(); else $('#systemStatus').textContent='GOD // WEBGL UNAVAILABLE · CONTROLS ACTIVE';
appendLedger('magic.window.online', { version: '0.9.5', source: 'Drive Magic Window neural-polymorph lineage' });
window.CrypticMagic = { engine, renderData, renderRoutes, renderSurfaces, openSameOriginSurface };

