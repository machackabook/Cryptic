# Cryptic Runtime Status

## v0.8.0 — Modular visual command center

**Repository / publication**
- Repository: `machackabook/Cryptic`.
- Visibility: public.
- GitHub reports Pages enabled.
- Default branch: `main`.

**Dashboard architecture**
- The previous monolithic `index.html` has been replaced by a thin compositor shell.
- The dashboard is composed from independent panel HTML/controller files through `modules/manifest.json`.
- Shared borders, radius, glass, glow, spacing, and 12-pixel snap geometry are defined centrally.
- Visualizer, Terminal, Nodes, Message Bus, Telemetry, Runtime, Controls, Header, and Guardian are independent modules.
- `panel.html?module=<id>` opens the same source module as a standalone panel.
- Unlimited fly-out instances are created through the compositor rather than by copying markup.
- Panel visibility, collapse, and glass state can be changed independently.

**Visualizer**
- Full-page complex-orbit rendering is active behind the snap fabric.
- The field uses iterative complex trajectories derived from `z[n+1] = z[n]^2 + c`.
- It deliberately avoids a conventional black escape-time Mandelbrot blot.
- The center viewport remains transparent so the live visual field is visible through the dashboard.

**Command/runtime continuity**
- Existing Cryptic capability gateway, node registry, runtime tokens, message bus, telemetry API, local bridge, communications envelopes, and controlled bridge actions remain separate from presentation.
- The terminal command engine now lives in `core/terminal-core.js`.
- DevTools Console, Message Bus, and Runtime adapters are loaded by the compositor after the panels are mounted.

**Security boundary**
- No provider credential is intentionally embedded into the dashboard modules.
- Public page code remains an interface; privileged system changes still require the authenticated capability/bridge path.

**Verification boundary**
- Repository structure and Pages-enabled status have been read back from GitHub.
- This environment cannot directly resolve the public GitHub Pages host for a visual browser render, so the exact live rendered frame is not claimed as independently screenshot-verified in this pass.
