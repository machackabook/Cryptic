
const canvas = document.getElementById('skyboxCanvas');
const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });

let w = 0, h = 0, dpr = 1;
let mx = 0.5, my = 0.45, currMx = 0.5, currMy = 0.45;
let warpSpeed = 1, warpTarget = 1;
let showOrbits = true;
let accretionMultiplier = 1.0;
let selectedGalaxy = 0;

const GALAXIES = [
  { name: 'Andromeda M31', x: -0.35, y: -0.28, z: 2.2, arms: 2, radius: 120, tilt: 0.62, color: '190, 80%, 70%' },
  { name: 'Triangulum M33', x: 0.42, y: -0.32, z: 2.6, arms: 3, radius: 95, tilt: 0.45, color: '275, 85%, 72%' },
  { name: 'Sombrero M104', x: -0.48, y: 0.25, z: 2.1, arms: 1, radius: 110, tilt: 0.88, color: '45, 95%, 75%' },
  { name: 'Whirlpool M51', x: 0.38, y: 0.22, z: 1.9, arms: 2, radius: 130, tilt: 0.25, color: '165, 90%, 65%' },
  { name: 'Cartwheel Ring', x: -0.15, y: -0.42, z: 3.1, arms: 4, radius: 85, tilt: 0.52, color: '330, 85%, 70%' },
  { name: 'Cigar M82', x: 0.22, y: -0.46, z: 2.8, arms: 1, radius: 100, tilt: 0.95, color: '15, 90%, 68%' },
  { name: 'Cosmic Gateway Core', x: 0.0, y: 0.0, z: 1.0, arms: 5, radius: 210, tilt: 0.38, color: '175, 100%, 75%' }
];

const STAR_COUNT = 320;
const stars = [];
for (let i = 0; i < STAR_COUNT; i++) {
  stars.push({
    x: (Math.random() - 0.5) * 2,
    y: (Math.random() - 0.5) * 2,
    z: 0.2 + Math.random() * 2.5,
    size: 0.4 + Math.random() * 1.8,
    hue: Math.random() > 0.6 ? 180 : (Math.random() > 0.5 ? 275 : 45),
    twinkle: Math.random() * Math.PI * 2,
    speed: 0.001 + Math.random() * 0.004
  });
}

const ORBITAL_PARTICLES = 3200;
const particles = [];
for (let i = 0; i < ORBITAL_PARTICLES; i++) {
  const tier = i % 7;
  const baseR = 75 + tier * 46 + (i % 11) * 3;
  const ecc = 0.08 + tier * 0.035;
  const inc = (tier - 3) * 0.12;
  particles.push({
    tier,
    baseR,
    ecc,
    inc,
    theta: Math.random() * Math.PI * 2,
    speed: (0.0008 + (7 - tier) * 0.00045) * (0.8 + Math.random() * 0.4),
    size: 0.8 + Math.random() * 1.6,
    hue: tier === 0 ? 45 : (tier === 1 ? 175 : (tier === 2 ? 270 : (tier === 3 ? 195 : (tier === 4 ? 140 : 310))))
  });
}

function resize() {
  w = window.innerWidth;
  h = window.innerHeight;
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(w * dpr);
  canvas.height = Math.floor(h * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener('resize', resize);
resize();

window.addEventListener('pointermove', e => {
  mx = e.clientX / Math.max(1, w);
  my = e.clientY / Math.max(1, h);
});

document.getElementById('btnWarp').onclick = () => {
  warpTarget = warpTarget === 1 ? 3.5 : 1;
};
document.getElementById('btnOrbits').onclick = () => {
  showOrbits = !showOrbits;
};
document.getElementById('btnAccretion').onclick = () => {
  accretionMultiplier = accretionMultiplier === 1.0 ? 2.4 : 1.0;
};
document.querySelectorAll('.galaxy-tag').forEach(tag => {
  tag.onclick = e => {
    document.querySelectorAll('.galaxy-tag').forEach(t => t.classList.remove('active'));
    e.target.classList.add('active');
    selectedGalaxy = Number(e.target.dataset.idx);
  };
});

function drawGalaxy(g, t, cx, cy, tiltX, tiltY) {
  const targetX = cx + (g.x + tiltX * 0.08) * w;
  const targetY = cy + (g.y + tiltY * 0.06) * h;
  const rad = g.radius * (w / 1400);

  ctx.save();
  ctx.translate(targetX, targetY);
  ctx.rotate(t * 0.00015 * (selectedGalaxy === GALAXIES.indexOf(g) ? 1.8 : 1.0));
  ctx.scale(1, g.tilt);

  // Galaxy Core Glow
  const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, rad);
  grad.addColorStop(0, `hsla(${g.color}, 0.95)`);
  grad.addColorStop(0.2, `hsla(${g.color}, 0.35)`);
  grad.addColorStop(0.65, `hsla(${g.color}, 0.08)`);
  grad.addColorStop(1, 'transparent');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, rad, 0, Math.PI * 2);
  ctx.fill();

  // Spiral Arms
  for (let arm = 0; arm < g.arms; arm++) {
    const armOffset = (arm / g.arms) * Math.PI * 2;
    ctx.beginPath();
    for (let st = 0; st < 36; st++) {
      const theta = armOffset + st * 0.18;
      const r = (st / 36) * rad * 0.95;
      const px = Math.cos(theta) * r;
      const py = Math.sin(theta) * r;
      if (st === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.strokeStyle = `hsla(${g.color}, 0.22)`;
    ctx.lineWidth = 1.4;
    ctx.stroke();
  }
  ctx.restore();
}

function render(t) {
  requestAnimationFrame(render);

  currMx += (mx - currMx) * 0.05;
  currMy += (my - currMy) * 0.05;
  warpSpeed += (warpTarget - warpSpeed) * 0.04;

  const tiltX = (currMx - 0.5) * 2;
  const tiltY = (currMy - 0.5) * 2;
  const cx = w * 0.5;
  const cy = h * 0.48;

  // 1. Deep Space Void with Radial Accretion Falloff
  ctx.fillStyle = '#010206';
  ctx.fillRect(0, 0, w, h);

  const nebulaGrad = ctx.createRadialGradient(cx, cy, 30, cx, cy, Math.max(w, h) * 0.85);
  nebulaGrad.addColorStop(0, 'rgba(18, 48, 86, 0.42)');
  nebulaGrad.addColorStop(0.35, 'rgba(12, 22, 54, 0.32)');
  nebulaGrad.addColorStop(0.7, 'rgba(4, 9, 22, 0.7)');
  nebulaGrad.addColorStop(1, 'rgba(1, 2, 6, 0.98)');
  ctx.fillStyle = nebulaGrad;
  ctx.fillRect(0, 0, w, h);

  // 2. Stars
  for (let i = 0; i < stars.length; i++) {
    const s = stars[i];
    const px = cx + (s.x * w * 0.5) + tiltX * (s.z * 18);
    const py = cy + (s.y * h * 0.5) + tiltY * (s.z * 14);
    const alpha = 0.2 + Math.sin(t * s.speed + s.twinkle) * 0.35;
    ctx.fillStyle = `hsla(${s.hue}, 90%, 80%, ${Math.max(0.1, alpha)})`;
    ctx.beginPath();
    ctx.arc(px, py, s.size, 0, Math.PI * 2);
    ctx.fill();
  }

  // 3. 7 Galaxies Rendering
  for (const g of GALAXIES) {
    drawGalaxy(g, t, cx, cy, tiltX, tiltY);
  }

  // 4. Keplerian Orbital Resonance Rings
  if (showOrbits) {
    const RINGS = 8;
    for (let r = 0; r < RINGS; r++) {
      const ringRadius = 80 + r * 52 + Math.sin(t * 0.0006 + r) * 8;
      const ecc = 0.24 + r * 0.02;
      const bRad = ringRadius * (ecc + tiltY * 0.03);
      const rot = Math.sin(t * 0.00005 + r * 0.4) * 0.5 + tiltX * 0.15;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rot);
      ctx.beginPath();
      ctx.ellipse(0, 0, ringRadius, Math.max(10, bRad), 0, 0, Math.PI * 2);
      ctx.strokeStyle = r === 2 ? 'rgba(0, 255, 204, 0.32)' : (r === 5 ? 'rgba(245, 206, 112, 0.38)' : 'rgba(85, 244, 255, 0.14)');
      ctx.lineWidth = r === 2 || r === 5 ? 1.4 : 0.8;
      ctx.stroke();

      // Nodes on resonant rings
      if (r === 2 || r === 5) {
        for (let a = 0; a < 4; a++) {
          const ang = (a / 4) * Math.PI * 2 + t * 0.0004;
          const nx = Math.cos(ang) * ringRadius;
          const ny = Math.sin(ang) * bRad;
          ctx.beginPath();
          ctx.arc(nx, ny, 2.4, 0, Math.PI * 2);
          ctx.fillStyle = r === 5 ? '#f5ce70' : '#00ffcc';
          ctx.fill();
        }
      }
      ctx.restore();
    }
  }

  // 5. 3,200 Orbital Stream Particles
  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    p.theta += p.speed * warpSpeed;
    if (p.theta > Math.PI * 2) p.theta -= Math.PI * 2;

    const er = p.baseR * (1 - p.ecc * p.ecc) / (1 + p.ecc * Math.cos(p.theta));
    const zOffset = Math.sin(p.theta + p.inc) * 45;
    const pz = 450 / (450 + zOffset + tiltY * 50);

    const px = cx + Math.cos(p.theta) * er * 1.25 * pz + tiltX * zOffset * 0.35;
    const py = cy + Math.sin(p.theta) * er * 0.52 * pz + tiltY * zOffset * 0.28;

    const size = Math.max(0.6, p.size * pz * (warpSpeed > 1.5 ? 1.4 : 1.0));
    const alpha = Math.min(1, Math.max(0.12, 0.65 * pz));

    ctx.fillStyle = `hsla(${p.hue}, 95%, 72%, ${alpha})`;
    ctx.beginPath();
    ctx.arc(px, py, size, 0, Math.PI * 2);
    ctx.fill();

    // Warp Streaks
    if (warpSpeed > 1.2 && i % 4 === 0) {
      const tailX = px - Math.sin(p.theta) * 12 * (warpSpeed - 0.8);
      const tailY = py + Math.cos(p.theta) * 5 * (warpSpeed - 0.8);
      ctx.strokeStyle = `hsla(${p.hue}, 95%, 80%, ${alpha * 0.4})`;
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(tailX, tailY);
      ctx.lineTo(px, py);
      ctx.stroke();
    }
  }

  // 6. Kerr Singularity & Relativistic Accretion Corona
  const pulse = Math.sin(t * 0.002) * 8;
  const coreRad = (130 + pulse) * accretionMultiplier;

  // Accretion Disk Aura with Doppler Beaming (left side boosted)
  const accretion = ctx.createRadialGradient(cx - 20, cy, 0, cx, cy, coreRad * 1.5);
  accretion.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
  accretion.addColorStop(0.06, 'rgba(0, 255, 204, 0.85)');
  accretion.addColorStop(0.24, 'rgba(157, 91, 254, 0.35)');
  accretion.addColorStop(0.55, 'rgba(14, 40, 95, 0.12)');
  accretion.addColorStop(1, 'transparent');
  ctx.fillStyle = accretion;
  ctx.beginPath();
  ctx.arc(cx, cy, coreRad * 1.5, 0, Math.PI * 2);
  ctx.fill();

  // Photon Sphere Einstein Lensing Ring
  ctx.save();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.8;
  ctx.shadowColor = '#00ffcc';
  ctx.shadowBlur = 22;
  ctx.beginPath();
  ctx.ellipse(cx, cy, 48 + pulse * 0.3, 22 + pulse * 0.15, tiltX * 0.18, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // Pitch-Black Event Horizon Eye
  ctx.fillStyle = '#010206';
  ctx.beginPath();
  ctx.arc(cx, cy, 14, 0, Math.PI * 2);
  ctx.fill();

  // Update Telemetry
  document.getElementById('statVel').textContent = (0.942 * warpSpeed).toFixed(3) + ' c';
  document.getElementById('statDoppler').textContent = (1.488 + Math.sin(t * 0.001) * 0.12).toFixed(3) + ' z';
}
requestAnimationFrame(render);
