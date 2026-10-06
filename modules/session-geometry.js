/** Session geometry sampler. Stages 435-437. Paste not rewritten. No secrets.
 *  session hash beec41f1 / living hash 7cd81012
 *  four cases only: infinity | hamiltonian | triangular | torus
 */
export const SESSION_HASH = 'beec41f1';
export const LIVING_HASH = '7cd81012';
export const STAGE = 437;

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

export function sessionGeometryHolds() {
  const a = sampleHamiltonianXZ(0.4, 10, 0);
  const b = sampleHamiltonianXZ(0.4, 10, Math.PI / 2);
  const lane = sampleTriangularYLane(0, 10, 3, Math.PI / 2);
  const lane2 = sampleTriangularYLane(2, 14, 3, Math.PI / 2);
  const tube = sampleTorusTube(10, 3, 0, 0, 0, 0);
  return {
    stage: STAGE,
    session: SESSION_HASH,
    living: LIVING_HASH,
    hamiltonianXZTimeFree: a.x === b.x && a.z === b.z && Math.abs((b.y - a.y) - 2) < 1e-9,
    triangularYLaneThetaFree: lane.sector === -5 && lane.y === -2 && lane2.sector === 7 && lane2.y === 10,
    torusTubeSharedXZ: tube.tube === 13 && tube.x === 13 && tube.z === 0 && tube.y === 0,
    pasteRewritten: false,
    secrets: false,
  };
}
