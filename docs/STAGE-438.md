# Cryptic stage 438 (2026-10-13)

Connecting chat re-pasted full `update(t)` kernel with switch on `targetState.geometry`.

`modules/session-geometry.js` now samples the four holds:

- 435 hamiltonian x/z independent of t (y moves by 2 at t = π/2)
- 436 triangular y lane independent of theta (idx 0 → sector -5; idx 2 major 14 → sector 7)
- 437 torus tube shared by x and z (major 10 minor 3 phi 0 → tube 13)
- 438 infinity Lemniscate of Bernoulli (theta=π/2, phi=0, major=10, minor=3, t=0, idx=0 → x≈0, z≈0, y=0)

Viewport draw loop (magic.js / visualizer.js) remains separate; samplers available for integration. Paste not rewritten.

Session hash `beec41f1`. Living hash `7cd81012`. Stage 438. No secrets.
