const canvas = document.getElementById('auroraCanvas');
const ctx = canvas.getContext('2d');

let w = 0, h = 0;
function resize() {
  w = canvas.width = window.innerWidth;
  h = canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

let numRibbons = 9;
let shearDirection = 1;

document.getElementById('btnRibbons').onclick = () => {
  numRibbons = numRibbons >= 16 ? 6 : numRibbons + 3;
  document.getElementById('layerVal').textContent = `${numRibbons} Active Ribbons`;
};
document.getElementById('btnShear').onclick = () => {
  shearDirection *= -1;
};

function render(t) {
  requestAnimationFrame(render);
  
  ctx.fillStyle = '#010307';
  ctx.fillRect(0, 0, w, h);

  const cx = w * 0.5;
  const cy = h * 0.45;

  // Background Singularity Corona
  const bgGrad = ctx.createRadialGradient(cx, cy, 20, cx, cy, Math.max(w, h) * 0.75);
  bgGrad.addColorStop(0, 'rgba(0, 255, 204, 0.25)');
  bgGrad.addColorStop(0.35, 'rgba(157, 91, 254, 0.14)');
  bgGrad.addColorStop(0.75, 'rgba(4, 12, 28, 0.65)');
  bgGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, w, h);

  // Aurora Ribbons
  for (let r = 0; r < numRibbons; r++) {
    const layerOffset = r * 35;
    const speed = (0.0006 + r * 0.00018) * shearDirection;
    const hue = (165 + r * 18 + Math.sin(t * 0.0002) * 20) % 360;
    
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(0, h * 0.5);

    for (let x = 0; x <= w; x += 12) {
      const freq1 = 0.0035;
      const freq2 = 0.0085;
      const wave1 = Math.sin(x * freq1 + t * speed + r * 0.8) * 85;
      const wave2 = Math.cos(x * freq2 - t * speed * 1.5 + r * 0.5) * 45;
      const y = h * 0.45 + wave1 + wave2 + (r - numRibbons / 2) * 28;
      ctx.lineTo(x, y);
    }

    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();

    const ribGrad = ctx.createLinearGradient(0, h * 0.2, 0, h * 0.8);
    ribGrad.addColorStop(0, `hsla(${hue}, 95%, 65%, 0)`);
    ribGrad.addColorStop(0.35, `hsla(${hue}, 95%, 65%, 0.18)`);
    ribGrad.addColorStop(0.7, `hsla(${hue}, 90%, 50%, 0.08)`);
    ribGrad.addColorStop(1, 'transparent');

    ctx.fillStyle = ribGrad;
    ctx.fill();

    // Crest Highlight Line
    ctx.strokeStyle = `hsla(${hue}, 100%, 75%, 0.45)`;
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.restore();
  }

  // Update Flux Indicator
  document.getElementById('fluxVal').textContent = (4.218 + Math.sin(t * 0.001) * 0.35).toFixed(3) + ' (unitless visual parameter)';
}
requestAnimationFrame(render);
