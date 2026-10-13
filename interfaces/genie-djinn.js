
(function(){
  'use strict';

  // 1. Smokeless Flame Background Particle Engine
  const flameCanvas = document.getElementById('flameCanvas');
  const fCtx = flameCanvas.getContext('2d');
  let fw = 0, fh = 0, fDpr = 1;
  const particles = [];
  const P_COUNT = 90;

  function resizeFlame(){
    fDpr = Math.min(window.devicePixelRatio||1, 2);
    fw = window.innerWidth;
    fh = window.innerHeight;
    flameCanvas.width = fw * fDpr;
    flameCanvas.height = fh * fDpr;
    fCtx.setTransform(fDpr, 0, 0, fDpr, 0, 0);
  }
  window.addEventListener('resize', resizeFlame, {passive:true});
  resizeFlame();

  for(let i=0; i<P_COUNT; i++){
    particles.push({
      x: Math.random()*fw,
      y: Math.random()*fh,
      vx: (Math.random()-0.5)*0.8,
      vy: -0.4 - Math.random()*1.2,
      r: 1 + Math.random()*3,
      hue: Math.random() > 0.5 ? (160 + Math.random()*40) : (270 + Math.random()*50),
      alpha: 0.1 + Math.random()*0.5,
      life: Math.random()*100
    });
  }

  function renderFlame(){
    fCtx.clearRect(0,0,fw,fh);
    for(const p of particles){
      p.x += p.vx + Math.sin(p.y*0.01)*0.4;
      p.y += p.vy;
      p.life++;
      if(p.y < -10 || p.life > 180){
        p.x = Math.random()*fw;
        p.y = fh + 10;
        p.life = 0;
      }
      fCtx.fillStyle = `hsla(${p.hue}, 100%, 65%, ${p.alpha * 0.4})`;
      fCtx.beginPath();
      fCtx.arc(p.x, p.y, p.r, 0, Math.PI*2);
      fCtx.fill();
    }
    requestAnimationFrame(renderFlame);
  }
  requestAnimationFrame(renderFlame);

  // 2. Interactive World Model Canvas
  const worldCanvas = document.getElementById('worldCanvas');
  const wCtx = worldCanvas.getContext('2d');
  let ww = 0, wh = 0, wDpr = 1;
  let mx = 0.5, my = 0.5, isDown = false;
  let simTime = 0;
  let worldSeed = "137451921129154222";

  function resizeWorld(){
    wDpr = Math.min(window.devicePixelRatio||1, 1.5);
    const rect = worldCanvas.getBoundingClientRect();
    ww = Math.max(1, rect.width);
    wh = Math.max(1, rect.height);
    worldCanvas.width = ww * wDpr;
    worldCanvas.height = wh * wDpr;
    wCtx.setTransform(wDpr, 0, 0, wDpr, 0, 0);
  }
  window.addEventListener('resize', resizeWorld, {passive:true});
  setTimeout(resizeWorld, 50);

  worldCanvas.addEventListener('pointermove', e => {
    const r = worldCanvas.getBoundingClientRect();
    mx = (e.clientX - r.left) / r.width;
    my = (e.clientY - r.top) / r.height;
    document.getElementById('worldCoords').textContent = `X: ${Math.round(mx*1000)} | Y: ${Math.round(my*1000)} | TRAJECTORY: ACTIVE`;
  }, {passive:true});

  worldCanvas.addEventListener('pointerdown', () => { isDown = true; });
  window.addEventListener('pointerup', () => { isDown = false; });

  function drawWorldSimulation(){
    if(!ww || !wh) { requestAnimationFrame(drawWorldSimulation); return; }
    wCtx.fillStyle = 'rgba(2, 4, 10, 0.22)';
    wCtx.fillRect(0, 0, ww, wh);

    simTime += 0.02;
    const cx = ww * 0.5;
    const cy = wh * 0.5;
    const pIntensity = isDown ? 1.8 : 1.0;

    // Grid lines of the latent world manifold
    wCtx.strokeStyle = 'rgba(0, 255, 204, 0.08)';
    wCtx.lineWidth = 1;
    for(let x=0; x<ww; x+=40){
      wCtx.beginPath();
      wCtx.moveTo(x, 0);
      wCtx.lineTo(x, wh);
      wCtx.stroke();
    }
    for(let y=0; y<wh; y+=40){
      wCtx.beginPath();
      wCtx.moveTo(0, y);
      wCtx.lineTo(ww, y);
      wCtx.stroke();
    }

    // Concentric orbital ripples influenced by Djinn presence
    const rings = 12;
    for(let i=1; i<=rings; i++){
      const r = i * 16 + Math.sin(simTime + i * 0.4) * 8 * pIntensity;
      const angle = simTime * 0.5 + i * 0.2;
      const ox = cx + (mx - 0.5) * 60;
      const oy = cy + (my - 0.5) * 40;

      wCtx.strokeStyle = i % 3 === 0 ? 'rgba(245, 206, 112, 0.4)' : (i % 2 === 0 ? 'rgba(157, 91, 254, 0.4)' : 'rgba(0, 255, 204, 0.4)');
      wCtx.lineWidth = i % 3 === 0 ? 1.5 : 0.8;
      wCtx.beginPath();
      wCtx.ellipse(ox, oy, r * 1.5, r * 0.65, angle * 0.1, 0, Math.PI * 2);
      wCtx.stroke();
    }

    // Floating latent particles (World Tokens)
    const tokens = 36;
    for(let k=0; k<tokens; k++){
      const theta = (k / tokens) * Math.PI * 2 + simTime * 0.2;
      const rad = 70 + (k % 5) * 25 + Math.sin(simTime * 2 + k) * 10;
      const px = cx + Math.cos(theta) * rad * 1.6 + (mx - 0.5) * 40;
      const py = cy + Math.sin(theta) * rad * 0.7 + (my - 0.5) * 30;

      wCtx.fillStyle = k % 4 === 0 ? '#f5ce70' : (k % 2 === 0 ? '#9d5bfe' : '#00ffcc');
      wCtx.beginPath();
      wCtx.arc(px, py, 2.2, 0, Math.PI * 2);
      wCtx.fill();
    }

    requestAnimationFrame(drawWorldSimulation);
  }
  requestAnimationFrame(drawWorldSimulation);

  // 3. Audio 963 Hz Solfeggio Harmonic Trigger
  let audioCtx = null;
  let osc = null;
  const soundBtn = document.getElementById('soundBtn');

  soundBtn.addEventListener('click', () => {
    if(window.parent && window.parent.CrypticTerminal?.toggle963){
      window.parent.CrypticTerminal.toggle963();
      soundBtn.textContent = 'RESONATING 963 Hz';
      return;
    }
    if(osc){
      osc.stop();
      osc.disconnect();
      osc = null;
      soundBtn.textContent = '963 Hz RESONANCE';
    } else {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      const gain = audioCtx.createGain();
      gain.gain.value = 0.035;
      osc = audioCtx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = 963;
      osc.connect(gain).connect(audioCtx.destination);
      osc.start();
      soundBtn.textContent = '963 Hz ACTIVE [STOP]';
    }
  });

  // 4. Intent & Wish Invocation Engine
  const logEl = document.getElementById('invocationLog');
  const wishInput = document.getElementById('wishPrompt');
  const grantBtn = document.getElementById('grantWishBtn');
  const forgeWorldBtn = document.getElementById('forgeWorldBtn');
  const mintBtn = document.getElementById('transmuteTokenBtn');
  const clearBtn = document.getElementById('clearLogBtn');

  function appendLog(speaker, text, type='djinn'){
    const div = document.createElement('div');
    div.className = 'log-entry';
    const now = new Date().toISOString().slice(11, 19);
    const label=document.createElement('span');
    label.className=type==='user'?'log-receipt':'log-djinn';
    label.textContent=`[${now}] ${speaker}:`;
    div.append(label,document.createTextNode(' '+String(text)));
    logEl.appendChild(div);
    logEl.scrollTop = logEl.scrollHeight;
  }

  async function sha256(str){
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
    return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('').slice(0,16);
  }

  async function grantIntent(customWish){
    const wish=(customWish||wishInput.value||'').trim();
    if(!wish){appendLog('GENIE DJINN','Enter an intent before recording a request.');return}
    appendLog('SEEKER',wish,'user');
    wishInput.value='';
    const term=window.CrypticTerminal||(window.parent!==window?window.parent.CrypticTerminal:null);
    if(term?.exec){
      try{const result=await term.exec('genie wish '+wish);appendLog('GENIE DJINN','Local request submitted. Status: '+String(result?.status||'LOCAL_RESULT_UNCONFIRMED')+'. No world model or external action is claimed.','djinn')}
      catch{appendLog('GENIE DJINN','Request could not be submitted to the local Cryptic runtime. No model action occurred.','djinn')}
    }else appendLog('GENIE DJINN','Recorded in this page session only. No model adapter is connected and no external action occurred.','djinn');
    const hud=document.getElementById('worldHud');if(hud)hud.textContent='WORLD MODEL: LOCAL VISUALIZATION ONLY · REQUEST NOT EXECUTED';
  }

  grantBtn.addEventListener('click', () => grantIntent());
  wishInput.addEventListener('keydown', e => {
    if(e.key === 'Enter' && !e.shiftKey){
      e.preventDefault();
      grantIntent();
    }
  });

  forgeWorldBtn.addEventListener('click',()=>{
    const seed='local.'+Math.random().toString(36).slice(2,10);
    worldSeed=seed;
    document.getElementById('activeSeedTag').textContent='LOCAL VISUAL SEED: '+seed.toUpperCase();
    appendLog('GENIE DJINN','Local visualization seed changed. No world model was called or synthesized.','djinn');
  });

  mintBtn.addEventListener('click',async()=>{
    const term=window.CrypticTerminal||(window.parent!==window?window.parent.CrypticTerminal:null);
    if(term?.mintToken){
      try{const receipt=await term.mintToken('djinn.local.receipt');appendLog('GENIE DJINN','Local correlation receipt created. This is not an authorization credential. Fingerprint: '+receipt.fp,'djinn');return}catch{}
    }
    const fp=await sha256(document.documentElement.outerHTML);
    appendLog('GENIE DJINN','Local page fingerprint only; no capability token was minted. SHA-256 prefix: '+fp,'djinn');
  });

  clearBtn.addEventListener('click', () => {
    logEl.replaceChildren(); appendLog('GENIE DJINN','Visible session log cleared. No persistent ledger was altered.','djinn');
  });

  // Vector Cards Click Handlers
  document.querySelectorAll('.vector-card').forEach(card => {
    card.addEventListener('click', () => {
      const intent = card.dataset.intent;
      if(intent === 'world-seed-1374'){
        grantIntent('Manifest World Seed 137451921129154222');
      } else if(intent === 'latent-torus'){
        grantIntent('Sample Toroidal Hamiltonian phase trajectory Sn(t)');
      } else if(intent === 'sovereign-attestation'){
        grantIntent('Forge sovereign attestation and verifiable credential receipt');
      } else if(intent === 'flame-resonance'){
        soundBtn.click();
        appendLog('GENIE DJINN', '963 Hz solfeggio frequency crown alignment activated.', 'djinn');
      }
    });
  });

})();
