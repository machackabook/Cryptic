/** Session geometry sampler. Stages 435-438. Paste not rewritten. No secrets.
 *  session hash beec41f1 / living hash 7cd81012 / infinity 438
 *  four cases: infinity | hamiltonian | triangular | torus
 */
export const SESSION_HASH = 'beec41f1';
export const LIVING_HASH = '7cd81012';
export const STAGE = 438;

export function sampleInfinity(theta, phi, major, minor, t, idx) {
  // Lemniscate of Bernoulli mathematical mapping
  const scale = major * 1.5;
  const denom = 1 + Math.pow(Math.sin(theta), 2);
  return {
    x: (scale * Math.cos(theta)) / denom,
    z: (scale * Math.sin(theta) * Math.cos(theta)) / denom,
    y: minor * Math.sin(phi) * Math.sin(t * 0.5 + idx),
  };
}

export function sampleHamiltonianXZ(theta, major, t) {
  const hScale = major;
  return {
    x: hScale * Math.cos(theta * 3) * Math.cos(theta),
    z: hScale * Math.cos(theta * 3) * Math.sin(theta),
    y: hScale * Math.sin(theta * 3) + Math.sin(t) * 2,
  };
}

export function sampleTriangularYLane(idx, major, minor, t) {
  const sector = (idx % 3 - 1) * major * 0.5;
  return { sector, y: sector + Math.sin(t) * minor };
}

export function sampleTorusTube(major, minor, phi, theta, t, idx) {
  const tube = major + minor * Math.cos(phi);
  return {
    tube,
    x: tube * Math.cos(theta),
    z: tube * Math.sin(theta),
    y: minor * Math.sin(phi) * Math.sin(t * 0.5 + idx),
  };
}

/**
 * State space slice sampler:
 * Sₙ(t) = { xₙ, yₙ, zₙ=nΔz, τ=t, p, α, stateₙ } | O=(0,0,0)
 */
export function sampleStateSpace(n, t, deltaZ = 0.5, p = 1.0, alpha = 0.08) {
  const theta = (n * 0.28) + t * 0.05;
  const h = sampleHamiltonianXZ(theta, 6 * p, t);
  return {
    n,
    xn: h.x,
    yn: h.y,
    zn: n * deltaZ,
    tau: t,
    p,
    alpha,
    staten: `S_${n}(${t.toFixed(2)})`,
    origin: { x: 0, y: 0, z: 0 }
  };
}

export function sessionGeometryHolds() {
  const a = sampleHamiltonianXZ(0.4, 10, 0);
  const b = sampleHamiltonianXZ(0.4, 10, Math.PI / 2);
  const lane = sampleTriangularYLane(0, 10, 3, Math.PI / 2);
  const lane2 = sampleTriangularYLane(2, 14, 3, Math.PI / 2);
  const tube = sampleTorusTube(10, 3, 0, 0, 0, 0);
  const inf = sampleInfinity(Math.PI / 2, 0, 10, 3, 0, 0);
  return {
    stage: STAGE,
    session: SESSION_HASH,
    living: LIVING_HASH,
    infinityLemniscate: Math.abs(inf.x) < 1e-9 && Math.abs(inf.z) < 1e-9 && inf.y === 0,
    hamiltonianXZTimeFree: a.x === b.x && a.z === b.z && Math.abs((b.y - a.y) - 2) < 1e-9,
    triangularYLaneThetaFree: lane.sector === -5 && lane.y === -2 && lane2.sector === 7 && lane2.y === 10,
    torusTubeSharedXZ: tube.tube === 13 && tube.x === 13 && tube.z === 0 && tube.y === 0,
    pasteRewritten: false,
    secrets: false,
  };
}
