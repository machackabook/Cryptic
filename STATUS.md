# Cryptic Runtime Status

## v0.5.0 — Initial public runtime

**Implemented**
- Cosmic Guardian entry gate.
- Browser HyperTerminal command fabric.
- Per-request scoped runtime token broker with 10-minute TTL.
- Runtime-token fingerprints recorded in the local provenance ledger.
- Adapter request surfaces: Gemini, GitHub, Google Drive, Ollama, OpenAI, Amazon Q, IBM Watson, Local Bridge.
- 963 Hz Web Audio sonification.
- Mandelbrot-inspired background traversal.
- BottomRight.AI expandable widget.
- PWA manifest + service-worker cache.
- Health-only localhost bridge with explicit environment-supplied token.
- Public/private boundary documentation and secret-ignore rules.

**Verification receipt**
- Local verification script: PASS.
- Inline runtime JavaScript syntax check: PASS.
- GitHub-hosted Actions: PAUSED because GitHub did not assign a hosted runner (runner_id 0) to attempted jobs. The workflow file was removed to avoid publishing a false green/red CI signal. The portable verification script remains in scripts/verify.mjs.

**GitHub Pages**
- Public files are rooted at /index.html.
- Enable once via Repository Settings → Pages → Deploy from a branch → main → /(root).

No provider credentials or uploaded Firebase configuration are published in this repository.
