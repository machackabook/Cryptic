/**
 * Cryptic Modular Visualizer — Complex Orbital Field & Astrodynamic Manifold
 * Architecture Contract: z[n+1] = z[n]^2 + c Mandelbrot complex phase trajectories
 * Multi-tier 3D perspective Keplerian resonance rings, Kerr lensing, and particle streams.
 */

export function mount(root) {
  const canvas = root.querySelector('#visualizerCanvas');
  const ctx = canvas.getContext('2d', { alpha: true, desynchronized: true });

  let w = 0, h = 0, dpr = 1;
  let on = true, lastTime = 0, fps = 60, frames = 0, stamp = performance.now();
  let mx = 0.5, my = 0.45, currMx = 0.5, currMy = 0.45;
  let pulseWave = 0, pulseActive = false;

  // Starfield background & 7 Galaxies Skybox Clusters
  const STAR_COUNT = 240;
  const stars = [];

  // Keplerian Orbital Stream Particles
  const STREAM_COUNT = 480;
  const streamParticles = [];

  // 7 Deep Space Spiral Galaxies
  const GALAXIES_7 = [
    { name: 'Andromeda', x: 0.18, y: 0.22, arms: 2, radius: 48, hue: 190 },
    { name: 'Triangulum', x: 0.82, y: 0.28, arms: 3, radius: 42, hue: 275 },
    { name: 'Sombrero', x: 0.15, y: 0.72, arms: 1, radius: 45, hue: 45 },
    { name: 'Whirlpool', x: 0.85, y: 0.68, arms: 2, radius: 50, hue: 165 },
    { name: 'Cartwheel', x: 0.32, y: 0.82, arms: 4, radius: 36, hue: 330 },
    { name: 'Cigar', x: 0.68, y: 0.14, arms: 1, radius: 40, hue: 15 },
    { name: 'Gateway', x: 0.50, y: 0.45, arms: 5, radius: 72, hue: 175 }
  ];

  function initParticles() {
    stars.length = 0;
    for (let i = 0; i < STAR_COUNT; i++) {
      stars.push({
        x: Math.random(),
        y: Math.random(),
        r: 0.5 + Math.random() * 1.8,
        baseAlpha: 0.15 + Math.random() * 0.55,
        twinkleSpeed: 0.001 + Math.random() * 0.003,
        phase: Math.random() * Math.PI * 2,
        hue: Math.random() > 0.6 ? 180 : (Math.random() > 0.5 ? 275 : 45)
      });
    }

    streamParticles.length = 0;
    for (let i = 0; i < STREAM_COUNT; i++) {
      // 7 distinct orbital harmonic bands
      const band = i % 7;
      const baseRadius = 85 + band * 42 + (i % 9) * 6;
      const ecc = 0.10 + (band * 0.04);
      const inclination = (band - 3) * 0.12;
      const speedMult = Math.pow(160 / Math.max(50, baseRadius), 1.2) * 0.00048;
      streamParticles.push({
        band,
        baseRadius,
        ecc,
        inclination,
        angle: Math.random() * Math.PI * 2,
        speed: speedMult * (0.85 + Math.random() * 0.35),
        size: 0.8 + Math.random() * 2.0,
        hue: band === 0 ? 45 : (band === 1 ? 175 : (band === 2 ? 270 : (band === 3 ? 195 : (band === 4 ? 140 : (band === 5 ? 310 : 210))))),
        alpha: 0.35 + Math.random() * 0.60
      });
    }
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    w = Math.max(1, rect.width);
    h = Math.max(1, rect.height);
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  window.addEventListener('resize', resize, { passive: true });
  window.addEventListener('pointermove', e => {
    mx = e.clientX / Math.max(1, window.innerWidth);
    my = e.clientY / Math.max(1, window.innerHeight);
  }, { passive: true });

  window.addEventListener('pointerdown', () => {
    pulseActive = true;
    pulseWave = 0;
  }, { passive: true });

  resize();
  initParticles();

  // Complex iteration orbit: z[n+1] = z[n]^2 + c (Mandelbrot & Julia trajectory weaving)
  function computeMandelbrotOrbit(ca, cb, t, scale, cx, cy, tiltX, tiltY) {
    let x = 0, y = 0;
    const pts = [];
    const rotSpeed = t * 0.00004;
    const cosR = Math.cos(rotSpeed);
    const sinR = Math.sin(rotSpeed);

    for (let i = 0; i < 36; i++) {
      const nx = x * x - y * y + ca;
      const ny = 2 * x * y + cb;
      x = nx;
      y = ny;
      if (x * x + y * y > 24) break;

      // 3D projection with tilt and depth factor
      const rx = x * cosR - y * sinR;
      const ry = x * sinR + y * cosR;
      const z = Math.sin(i * 0.35 + t * 0.0008) * 0.5;

      const fov = 400;
      const pz = fov / (fov + z * 160);
      const px = cx + Math.tanh(rx * 0.75) * scale * pz + tiltX * z * 60;
      const py = cy + Math.tanh(ry * 0.75) * scale * 0.52 * pz + tiltY * z * 40;

      pts.push([px, py, pz]);
    }
    return pts;
  }

  function draw(t) {
    if (!on) return;

    // Smooth lerp mouse coordinates
    currMx += (mx - currMx) * 0.055;
    currMy += (my - currMy) * 0.055;

    const tiltX = (currMx - 0.5) * 2;
    const tiltY = (currMy - 0.5) * 2;

    const cx = w * (0.5 + (currMx - 0.5) * 0.04);
    const cy = h * (0.45 + (currMy - 0.5) * 0.03);
    const minDim = Math.min(w, h);
    const baseScale = minDim * 0.38;

    // Clear with deep space radial falloff
    ctx.clearRect(0, 0, w, h);

    const bgGrad = ctx.createRadialGradient(cx, cy, 20, cx, cy, Math.max(w, h) * 0.85);
    bgGrad.addColorStop(0, 'rgba(14, 38, 72, 0.52)');
    bgGrad.addColorStop(0.35, 'rgba(6, 19, 41, 0.42)');
    bgGrad.addColorStop(0.72, 'rgba(2, 8, 19, 0.82)');
    bgGrad.addColorStop(1, 'rgba(1, 3, 8, 0.96)');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // 1. Distant Starfield with twinkle and depth parallax
    for (let i = 0; i < stars.length; i++) {
      const s = stars[i];
      const sx = s.x * w + tiltX * (s.r * 8);
      const sy = s.y * h + tiltY * (s.r * 6);
      const alpha = s.baseAlpha + Math.sin(t * s.twinkleSpeed + s.phase) * 0.2;
      ctx.fillStyle = `hsla(${s.hue}, 90%, 75%, ${Math.max(0.05, alpha)})`;
      ctx.beginPath();
      ctx.arc(sx, sy, s.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // 1b. 7 Galaxies Deep Celestial Cores & Spiral Filaments
    for (let i = 0; i < GALAXIES_7.length; i++) {
      const g = GALAXIES_7[i];
      const gx = g.x * w + tiltX * 16;
      const gy = g.y * h + tiltY * 12;
      const rad = g.radius * (minDim / 900);

      ctx.save();
      ctx.translate(gx, gy);
      ctx.rotate(t * 0.00012 * (i % 2 === 0 ? 1 : -1));

      // Galaxy Core Glow
      const gGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, rad);
      gGrad.addColorStop(0, `hsla(${g.hue}, 90%, 75%, 0.45)`);
      gGrad.addColorStop(0.3, `hsla(${g.hue}, 85%, 65%, 0.16)`);
      gGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = gGrad;
      ctx.beginPath();
      ctx.arc(0, 0, rad, 0, Math.PI * 2);
      ctx.fill();

      // Spiral arms
      ctx.strokeStyle = `hsla(${g.hue}, 80%, 70%, 0.18)`;
      ctx.lineWidth = 0.8;
      for (let arm = 0; arm < g.arms; arm++) {
        const offset = (arm / g.arms) * Math.PI * 2;
        ctx.beginPath();
        for (let s = 0; s < 24; s++) {
          const theta = offset + s * 0.22;
          const r = (s / 24) * rad * 0.9;
          const px = Math.cos(theta) * r;
          const py = Math.sin(theta) * r * 0.65;
          if (s === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
      }
      ctx.restore();
    }

    // 2. Gravitational Wave Pulse (on click or harmonic beat)
    if (pulseActive) {
      pulseWave += 3.2;
      const pAlpha = Math.max(0, 1 - pulseWave / (minDim * 0.7));
      if (pAlpha <= 0) {
        pulseActive = false;
      } else {
        ctx.save();
        ctx.strokeStyle = `rgba(0, 255, 204, ${pAlpha * 0.38})`;
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.ellipse(cx, cy, pulseWave, pulseWave * 0.42, tiltX * 0.15, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }

    // 3. Primary Astrodynamic Orbital Tracks (Keplerian Multi-Plane Rings)
    const RING_TIERS = 10;
    for (let r = 0; r < RING_TIERS; r++) {
      const ringRadius = 65 + r * 38 + Math.sin(t * 0.0006 + r * 0.7) * 7;
      const ecc = 0.26 + (r * 0.014);
      const rot = Math.sin(t * 0.00004 + r * 0.38) * 0.45 + tiltX * 0.12;
      const bRad = ringRadius * (ecc + tiltY * 0.04);

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rot);

      // Main orbital ellipse
      ctx.beginPath();
      ctx.ellipse(0, 0, ringRadius, Math.max(10, bRad), 0, 0, Math.PI * 2);

      // Alternating cyan / gold / violet harmonic line styling
      const isMajor = r === 2 || r === 5 || r === 8;
      if (isMajor) {
        ctx.strokeStyle = r === 2 ? 'rgba(0, 255, 204, 0.28)' : (r === 5 ? 'rgba(245, 206, 112, 0.32)' : 'rgba(157, 91, 254, 0.26)');
        ctx.lineWidth = 1.1;
      } else {
        ctx.strokeStyle = `rgba(${50 + r * 16}, ${160 + r * 8}, 255, ${0.11 - r * 0.007})`;
        ctx.lineWidth = 0.65;
      }
      ctx.stroke();

      // Orbital Meridian Calipers & Node Ticks on major rings
      if (isMajor) {
        const tickAngles = [0, Math.PI * 0.5, Math.PI, Math.PI * 1.5];
        for (const ta of tickAngles) {
          const tx = Math.cos(ta) * ringRadius;
          const ty = Math.sin(ta) * bRad;
          ctx.beginPath();
          ctx.arc(tx, ty, 1.8, 0, Math.PI * 2);
          ctx.fillStyle = r === 5 ? 'rgba(245, 206, 112, 0.85)' : 'rgba(0, 255, 204, 0.8)';
          ctx.fill();

          // Small radial tick
          ctx.beginPath();
          ctx.moveTo(tx - 4, ty);
          ctx.lineTo(tx + 4, ty);
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
      }

      ctx.restore();
    }

    // 4. Complex Julia-Mandelbrot Phase Trajectory Filament Weave
    const ORBIT_STRANDS = Math.max(90, Math.min(220, Math.floor(w / 6.5)));
    for (let i = 0; i < ORBIT_STRANDS; i++) {
      const a = (i / ORBIT_STRANDS) * Math.PI * 2;
      const modPhase = t * 0.000019;
      const ca = -0.7436 + Math.cos(a * 2.05 + modPhase) * (0.135 + 0.02 * Math.sin(i * 0.5));
      const cb = 0.1318 + Math.sin(a * 1.42 - modPhase * 0.8) * (0.135 + 0.015 * Math.cos(i * 0.7));

      const pts = computeMandelbrotOrbit(ca, cb, t, baseScale, cx, cy, tiltX, tiltY);
      if (pts.length < 3) continue;

      // Color gradation across strands: cyan through electric indigo and gold
      const hue = 176 + (i % 48) * 2.1 + Math.sin(t * 0.0004 + i) * 14;
      const lum = 68 + (i % 5) * 4;
      const alpha = 0.022 + 0.055 * ((i % 8) / 8);

      ctx.strokeStyle = `hsla(${hue}, 95%, ${lum}%, ${alpha})`;
      ctx.lineWidth = 0.5 + (i % 4) * 0.22;

      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (let k = 1; k < pts.length; k++) {
        // Curve smoothly between points
        const xc = (pts[k - 1][0] + pts[k][0]) * 0.5;
        const yc = (pts[k - 1][1] + pts[k][1]) * 0.5;
        ctx.quadraticCurveTo(pts[k - 1][0], pts[k - 1][1], xc, yc);
      }
      ctx.stroke();
    }

    // 5. Keplerian Resonance Stream Particles (Drifting along Elliptical Belts)
    for (let i = 0; i < streamParticles.length; i++) {
      const sp = streamParticles[i];
      sp.angle += sp.speed;
      if (sp.angle > Math.PI * 2) sp.angle -= Math.PI * 2;

      // Elliptical coordinate calculation
      const er = sp.baseRadius * (1 - sp.ecc * sp.ecc) / (1 + sp.ecc * Math.cos(sp.angle));
      const zOffset = Math.sin(sp.angle + sp.inclination) * 35;
      const pz = 400 / (400 + zOffset + tiltY * 50);

      const px = cx + Math.cos(sp.angle) * er * 1.15 * pz + tiltX * zOffset * 0.4;
      const py = cy + Math.sin(sp.angle) * er * 0.48 * pz + tiltY * zOffset * 0.3;

      const size = Math.max(0.6, sp.size * pz);
      const alpha = Math.min(1, Math.max(0.08, sp.alpha * pz));

      ctx.fillStyle = `hsla(${sp.hue}, 95%, 70%, ${alpha})`;
      ctx.beginPath();
      ctx.arc(px, py, size, 0, Math.PI * 2);
      ctx.fill();

      // Leading tail highlight on key resonance particles
      if (i % 9 === 0) {
        const tailX = px - Math.sin(sp.angle) * 7 * pz;
        const tailY = py + Math.cos(sp.angle) * 3 * pz;
        ctx.strokeStyle = `hsla(${sp.hue}, 90%, 80%, ${alpha * 0.45})`;
        ctx.lineWidth = 0.75;
        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(px, py);
        ctx.stroke();
      }
    }

    // 6. Central Singularity Accretion Core & Photon Sphere Corona
    const corePulse = Math.sin(t * 0.002) * 6;
    const coreRadius = 140 + corePulse;

    // Outer ethereal aura
    const outerAura = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreRadius * 1.6);
    outerAura.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
    outerAura.addColorStop(0.03, 'rgba(160, 255, 240, 0.88)');
    outerAura.addColorStop(0.12, 'rgba(0, 255, 204, 0.32)');
    outerAura.addColorStop(0.28, 'rgba(157, 91, 254, 0.16)');
    outerAura.addColorStop(0.55, 'rgba(14, 40, 85, 0.06)');
    outerAura.addColorStop(1, 'transparent');
    ctx.fillStyle = outerAura;
    ctx.beginPath();
    ctx.arc(cx, cy, coreRadius * 1.6, 0, Math.PI * 2);
    ctx.fill();

    // Photon Sphere Lensing Ring
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.lineWidth = 1.4;
    ctx.shadowColor = '#00ffcc';
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 46 + corePulse * 0.4, 20 + corePulse * 0.2, tiltX * 0.2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // Singularity Horizon Center Point (pitch-black vacuum eye)
    ctx.save();
    ctx.fillStyle = '#010307';
    ctx.beginPath();
    ctx.arc(cx, cy, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 7. Celestial Cardinal Crosshairs & Telemetry Markers
    ctx.save();
    ctx.strokeStyle = 'rgba(85, 233, 255, 0.16)';
    ctx.lineWidth = 0.8;
    ctx.setLineDash([4, 6]);

    // Horizontal orbital axis
    ctx.beginPath();
    ctx.moveTo(cx - baseScale * 1.35, cy);
    ctx.lineTo(cx + baseScale * 1.35, cy);
    ctx.stroke();

    // Vertical polar axis
    ctx.beginPath();
    ctx.moveTo(cx, cy - baseScale * 0.75);
    ctx.lineTo(cx, cy + baseScale * 0.75);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  function loop(t) {
    requestAnimationFrame(loop);
    if (!on || document.hidden || t - lastTime < 24) return;
    lastTime = t;
    draw(t);
    frames++;
    if (t - stamp >= 1000) {
      fps = Math.round((frames * 1000) / (t - stamp));
      frames = 0;
      stamp = t;
      window.dispatchEvent(new CustomEvent('cryptic:visualizer-fps', { detail: { fps } }));
    }
  }

  requestAnimationFrame(loop);

  window.CrypticVisualizer = {
    setEnabled(v) {
      on = Boolean(v);
      canvas.style.opacity = on ? '1' : '0';
    },
    toggle() {
      this.setEnabled(!on);
    },
    get enabled() {
      return on;
    },
    resize,
    triggerPulse() {
      pulseActive = true;
      pulseWave = 0;
    }
  };
}
