
(function(){
  'use strict';

  const SOURCE_DOCS = {golden_army:"LOCAL GEOMETRY VISUALIZATION ONLY",nexus_sigma:"NO CONNECTED DEVICE TELEMETRY",master_alchemist:"NO PRODUCTION EVIDENCE ATTACHED"};

  const canvas = document.getElementById('matrixCanvas');
  const ctx = canvas.getContext('2d');
  let w = 0, h = 0, dpr = 1;

  function resize(){
    dpr = Math.min(window.devicePixelRatio||1, 2);
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener('resize', resize, {passive:true});
  resize();

  const sysTime = { start: performance.now(), current: performance.now(), elapsed: 0 };
  const metrics = {
    throughputSigma: 15000,
    entropyShards: 420,
    kerrDistortion: 0.85,
    hopfSpeed: 0.5,
    jaccardConvergence: 0.8420,
    activeNode: 42,
    loopCounter: 1,
    layoutMode: 'twin' // 'twin', 'merged', 'overlaid'
  };

  // 1. Dual Geometric Renderers
  function drawBackground(){
    const grad = ctx.createLinearGradient(0, 0, w, h);
    const colorShift = (Math.sin(sysTime.elapsed * 0.1) + 1) * 25;
    grad.addColorStop(0, `hsla(${260 + colorShift}, 48%, 4%, 1)`);
    grad.addColorStop(0.5, '#020205');
    grad.addColorStop(1, `hsla(${180 + colorShift}, 52%, 3%, 1)`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Subtle matrix text stream watermark
    ctx.save();
    ctx.font = '8px monospace';
    ctx.fillStyle = 'rgba(0, 255, 208, 0.035)';
    ctx.fillText(SOURCE_DOCS.golden_army, 40, h * 0.35);
    ctx.fillText(SOURCE_DOCS.nexus_sigma, 40, h * 0.38);
    ctx.fillText(SOURCE_DOCS.master_alchemist, 40, h * 0.41);
    ctx.restore();
  }

  function drawHopfFibrationTorus(cx, cy, r){
    ctx.save();
    ctx.translate(cx, cy);
    const tf = sysTime.elapsed * metrics.hopfSpeed * 0.8;
    ctx.lineWidth = 1;

    const fibers = 42;
    for(let i=0; i<fibers; i+=2){
      const phi = (i / fibers) * Math.PI * 2 + tf;
      ctx.beginPath();
      for(let j=0; j<=360; j+=15){
        const theta = (j / 360) * Math.PI * 2;
        const x = (r + r * 0.5 * Math.cos(theta)) * Math.cos(phi + theta * 0.1);
        const y = (r + r * 0.5 * Math.cos(theta)) * Math.sin(phi + theta * 0.1);
        if(j === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = `hsla(${170 + i * 2.5}, 100%, 55%, ${0.08 + (metrics.jaccardConvergence * 0.18)})`;
      ctx.stroke();
    }

    // Hopf Core Anchor
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#00ffd0';
    ctx.shadowColor = '#00ffd0';
    ctx.shadowBlur = 15;
    ctx.fill();
    ctx.restore();
  }

  function drawKerrSingularity(cx, cy, radius){
    ctx.save();
    ctx.translate(cx, cy);

    // Lensing distortion rings
    const rings = 7;
    for(let i=0; i<rings; i++){
      const cr = radius * (1 + i * 0.22) * metrics.kerrDistortion;
      ctx.beginPath();
      ctx.ellipse(0, 0, cr, cr * 0.38, sysTime.elapsed * (0.2 + i * 0.04), 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(138, 43, 226, ${0.45 / (i + 1)})`;
      ctx.lineWidth = 1.6;
      ctx.stroke();
    }

    // Central Singularity Pulse
    const pulse = radius * 0.38 + Math.sin(sysTime.elapsed * 4.5) * 5;
    const radGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, pulse);
    radGrad.addColorStop(0, '#00ffd0');
    radGrad.addColorStop(0.25, 'rgba(138, 43, 226, 0.85)');
    radGrad.addColorStop(0.7, 'rgba(74, 14, 143, 0.35)');
    radGrad.addColorStop(1, 'rgba(2, 2, 5, 0)');
    ctx.fillStyle = radGrad;
    ctx.beginPath();
    ctx.arc(0, 0, pulse, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // 2. Loop Execution & Telemetry Updates
  function step(){
    sysTime.current = performance.now();
    sysTime.elapsed = (sysTime.current - sysTime.start) / 1000;

    metrics.throughputSigma = 15000 + Math.sin(sysTime.elapsed * 2) * 4200;
    metrics.entropyShards = Math.floor(400 + Math.cos(sysTime.elapsed * 0.5) * 180);
    metrics.jaccardConvergence = 0.80 + Math.sin(sysTime.elapsed * 0.3) * 0.08;
    metrics.activeNode = (Math.floor(sysTime.elapsed * 8) % 720) + 1;

    if(Math.floor(sysTime.elapsed) % 10 === 0 && metrics.loopCounter < Math.floor(sysTime.elapsed/10)+1){
      metrics.loopCounter = Math.floor(sysTime.elapsed/10)+1;
    }

    // Update DOM telemetry
    document.getElementById('teleTime').textContent = sysTime.elapsed.toFixed(3) + ' s';
    document.getElementById('teleThroughput').textContent = metrics.throughputSigma.toFixed(1) + ' sim units/s';
    document.getElementById('teleEntropy').textContent = metrics.entropyShards + ' Units';
    document.getElementById('teleJaccard').textContent = metrics.jaccardConvergence.toFixed(4) + ' J(A,B)';
    document.getElementById('teleNode').textContent = `SIM_INDEX_${String(metrics.activeNode).padStart(3,'0')} / 720 [NOT HARDWARE]`;
    document.getElementById('loopTick').textContent = `LOOP: ${String(metrics.loopCounter).padStart(4,'0')}`;
  }

  function frame(){
    step();
    drawBackground();

    const minDim = Math.min(w, h);
    if(metrics.layoutMode === 'twin'){
      const cx1 = w * 0.32;
      const cx2 = w * 0.68;
      const cy = h * 0.46;
      drawHopfFibrationTorus(cx1, cy, minDim * 0.18);
      drawKerrSingularity(cx2, cy, minDim * 0.16);
    } else if(metrics.layoutMode === 'overlaid'){
      const cx = w * 0.50;
      const cy = h * 0.46;
      drawHopfFibrationTorus(cx, cy, minDim * 0.22);
      drawKerrSingularity(cx, cy, minDim * 0.18);
    } else {
      const cx = w * 0.50;
      const cy = h * 0.46;
      drawHopfFibrationTorus(cx, cy, minDim * 0.15);
      drawKerrSingularity(cx, cy, minDim * 0.25);
    }

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // 3. Interactive UI Controls
  const btnLayout = document.getElementById('btnLayout');
  const kerrSlider = document.getElementById('kerrSlider');
  const hopfSlider = document.getElementById('hopfSlider');
  const btnAudio = document.getElementById('btnAudio');
  const btnMint = document.getElementById('btnMint');

  btnLayout.onclick = () => {
    if(metrics.layoutMode === 'twin'){
      metrics.layoutMode = 'overlaid';
      btnLayout.textContent = 'OVERLAID ARRAY';
    } else if(metrics.layoutMode === 'overlaid'){
      metrics.layoutMode = 'merged';
      btnLayout.textContent = 'MERGED ARRAY';
    } else {
      metrics.layoutMode = 'twin';
      btnLayout.textContent = 'TWIN ARRAY';
    }
  };

  kerrSlider.oninput = e => {
    metrics.kerrDistortion = parseFloat(e.target.value);
  };
  hopfSlider.oninput = e => {
    metrics.hopfSpeed = parseFloat(e.target.value);
  };

  let audioCtx = null, osc = null;
  btnAudio.onclick = () => {
    if(window.parent?.CrypticTerminal?.toggle963){
      window.parent.CrypticTerminal.toggle963();
      btnAudio.classList.toggle('active');
      return;
    }
    if(osc){
      osc.stop(); osc.disconnect(); osc = null;
      btnAudio.classList.remove('active');
      btnAudio.textContent = 'SONIFY';
    } else {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      const g = audioCtx.createGain(); g.gain.value = 0.035;
      osc = audioCtx.createOscillator();
      osc.type = 'sine'; osc.frequency.value = 963;
      osc.connect(g).connect(audioCtx.destination);
      osc.start();
      btnAudio.classList.add('active');
      btnAudio.textContent = '963Hz [ON]';
    }
  };

  btnMint.onclick = async () => {
    let fp='LOCAL-ONLY';
    const term=window.parent?.CrypticTerminal;
    if(term?.mintToken){
      try{
        const t=await term.mintToken('matrix.local.receipt',{kerr:metrics.kerrDistortion,hopf:metrics.hopfSpeed,mode:metrics.layoutMode});
        fp=String(t?.fp||fp);
        term.out?.('[MATRIX VISUALIZATION] Local correlation receipt created; no production evidence or device state was verified. receipt='+fp,'warn');
      }catch(e){}
    }else{
      try{
        const bytes=new TextEncoder().encode(JSON.stringify({kerr:metrics.kerrDistortion,hopf:metrics.hopfSpeed,mode:metrics.layoutMode}));
        const digest=await crypto.subtle.digest('SHA-256',bytes);
        fp=[...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('').slice(0,16);
      }catch{}
    }
    btnMint.textContent='LOCAL FP: '+fp.slice(0,8);
    setTimeout(()=>{btnMint.textContent='CREATE LOCAL RECEIPT'},2000);
  };

})();
