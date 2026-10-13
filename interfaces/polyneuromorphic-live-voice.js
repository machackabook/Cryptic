
const canvas = document.getElementById('audioCanvas');
const ctx = canvas.getContext('2d');

let w = 0, h = 0;
function resize() {
  w = canvas.width = canvas.clientWidth * window.devicePixelRatio;
  h = canvas.height = canvas.clientHeight * window.devicePixelRatio;
}
window.addEventListener('resize', resize);
resize();

// Populate 48 Synaptic Nodes
const grid = document.getElementById('neuronGrid');
const neurons = [];
for (let i = 0; i < 48; i++) {
  const d = document.createElement('div');
  d.className = 'neuron-node';
  d.textContent = i + 1;
  grid.appendChild(d);
  neurons.push(d);
}

let audioCtx = null;
let analyser = null;
let osc = null;
let isVoiceActive = false;
let isSolfeggioActive = false;
let micStream = null;
let micSource = null;

function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 512;
  }
}

document.getElementById('btnVoice').onclick = () => {
  initAudio();
  audioCtx.resume().catch(()=>{});
  isVoiceActive = !isVoiceActive;
  document.getElementById('btnVoice').textContent = isVoiceActive ? 'PAUSE NEURAL VOICE' : 'START NEURAL VOICE';
  if (isVoiceActive) playNeuralVoicePhrase();
};

document.getElementById('btnSolfeggio').onclick = () => {
  initAudio();
  if (isSolfeggioActive) {
    if (osc) { osc.stop(); osc.disconnect(); osc = null; }
    isSolfeggioActive = false;
    document.getElementById('btnSolfeggio').textContent = '963 HZ RESONANCE';
  } else {
    osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    g.gain.value = 0.035;
    osc.frequency.value = 963;
    osc.type = 'sine';
    osc.connect(g);
    g.connect(analyser);
    g.connect(audioCtx.destination);
    osc.start();
    isSolfeggioActive = true;
    document.getElementById('btnSolfeggio').textContent = 'STOP 963 HZ';
    document.getElementById('peakFreq').textContent = '963 Hz';
  }
};

document.getElementById('btnMic').onclick = async () => {
  initAudio();
  try {
    if (micStream) {
      for (const track of micStream.getTracks()) track.stop();
      micSource?.disconnect();
      micSource = null; micStream = null;
      document.getElementById('btnMic').textContent = 'ENABLE MIC';
      document.getElementById('btnMic').setAttribute('aria-pressed','false');
      const status=document.getElementById('micStatus'); if(status)status.textContent='Microphone stopped; stream tracks released.';
      return;
    }
    await audioCtx.resume();
    micStream = await navigator.mediaDevices.getUserMedia({audio:true});
    micSource = audioCtx.createMediaStreamSource(micStream);
    micSource.connect(analyser);
    document.getElementById('btnMic').textContent = 'STOP MIC';
    document.getElementById('btnMic').setAttribute('aria-pressed','true');
    const status=document.getElementById('micStatus'); if(status)status.textContent='Microphone active in this tab only.';
  } catch (e) {
    document.getElementById('btnMic').textContent='ENABLE MIC';
    const status=document.getElementById('micStatus'); if(status)status.textContent='Microphone unavailable or denied: '+String(e.message||e).slice(0,160);
  }
};

function playNeuralVoicePhrase() {
  if (!isVoiceActive) return;
  const osc1 = audioCtx.createOscillator();
  const osc2 = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  
  const baseFreq = 140 + Math.random() * 90;
  osc1.frequency.setValueAtTime(baseFreq, audioCtx.currentTime);
  osc1.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, audioCtx.currentTime + 0.35);
  osc2.frequency.setValueAtTime(baseFreq * 2.02, audioCtx.currentTime);
  
  gain.gain.setValueAtTime(0.001, audioCtx.currentTime);
  gain.gain.linearRampToValueAtTime(0.045, audioCtx.currentTime + 0.05);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.45);
  
  osc1.connect(gain);
  osc2.connect(gain);
  gain.connect(analyser);
  gain.connect(audioCtx.destination);
  
  osc1.start();
  osc2.start();
  osc1.stop(audioCtx.currentTime + 0.45);
  osc2.stop(audioCtx.currentTime + 0.45);
  
  setTimeout(playNeuralVoicePhrase, 300 + Math.random() * 500);
}

const timeData = new Uint8Array(256);
const freqData = new Uint8Array(256);

function renderLoop(t) {
  requestAnimationFrame(renderLoop);
  
  ctx.fillStyle = '#020409';
  ctx.fillRect(0, 0, w, h);

  if (analyser) {
    analyser.getByteTimeDomainData(timeData);
    analyser.getByteFrequencyData(freqData);
  } else {
    for (let i = 0; i < 256; i++) {
      timeData[i] = 128 + Math.sin(t * 0.005 + i * 0.08) * 22;
      freqData[i] = Math.max(0, 70 + Math.sin(t * 0.003 + i * 0.12) * 50 - i * 0.2);
    }
  }

  // 1. Frequency Spectrum Bars (Synaptic ribbons)
  const barWidth = (w / 128);
  for (let i = 0; i < 128; i++) {
    const val = freqData[i] / 255;
    const barHeight = val * h * 0.55;
    const hue = 175 + (i / 128) * 110;
    ctx.fillStyle = `hsla(${hue}, 95%, 65%, 0.45)`;
    ctx.fillRect(i * barWidth, h - barHeight, barWidth - 1, barHeight);
  }

  // 2. Multi-Channel Neuromorphic Waveform Oscilloscope
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = '#00ffcc';
  ctx.shadowColor = '#00ffcc';
  ctx.shadowBlur = 12;
  ctx.beginPath();

  const sliceWidth = w / 256;
  let x = 0;
  for (let i = 0; i < 256; i++) {
    const v = timeData[i] / 128.0;
    const y = v * (h * 0.38) + (h * 0.15);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
    x += sliceWidth;
  }
  ctx.stroke();
  ctx.shadowBlur = 0;

  // 3. Firing Random Spikes in Neuron Sidebar
  if (Math.random() > 0.3) {
    const idx = Math.floor(Math.random() * neurons.length);
    neurons[idx].classList.add('active');
    setTimeout(() => neurons[idx].classList.remove('active'), 120);
  }
}
requestAnimationFrame(renderLoop);
