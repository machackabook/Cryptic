# Cryptic Modular Dashboard Contract — v0.8.0

The generated Cryptic / GAIA command-center artwork is the **visual design contract**, not a background screenshot and not a disposable mockup.

## Rule: one visible function, one module

Every principal dashboard section is represented by its own repository files:

- `modules/header.html` + `modules/header.js`
- `modules/terminal.html` + `modules/terminal.js`
- `modules/nodes.html` + `modules/nodes.js`
- `modules/viewport.html` + `modules/viewport.js`
- `modules/bus.html` + `modules/bus.js`
- `modules/telemetry.html` + `modules/telemetry.js`
- `modules/runtime.html` + `modules/runtime.js`
- `modules/controls.html` + `modules/controls.js`
- `modules/visualizer.html` + `modules/visualizer.js`
- `modules/guardian.html` + `modules/guardian.js`

`modules/manifest.json` is the composition registry.

## Shared frame geometry

Visual fidelity is centralized in:

- `ui/tokens.css` — colors, frame line, radius, glass opacity, glow, snap size.
- `ui/dashboard.css` — the 12-column snap geometry, frame chrome, transparency behavior, floating-panel behavior.
- `ui/modules.css` — module-specific internal layouts.

This prevents each panel from gradually developing a different border, radius, spacing, or glass treatment.

## Shell

`index.html` contains no dashboard implementation. It only provides:

- the visualizer layer,
- the effects layer,
- the snap grid,
- the fly-out layer,
- the Guardian layer,
- and `ui/dashboard.js`.

The compositor fetches module files independently.

## Reusable panels

`panel.html?module=<id>` loads the same module file in a separate browser window.

A panel is therefore not copied when it is popped out. The pop-out and dashboard instance consume the same module source.

`CrypticDashboard.spawn("<module>")` creates another fly-out instance.

## Rendering contract

The visualizer intentionally uses the complex iteration

`z[n+1] = z[n]^2 + c`

as an orbital/phase-trajectory generator rather than rendering a conventional escape-time Mandelbrot blot. This keeps the mathematics while matching the clean orbital command-center composition.

## Modular update rule

When one section changes, update that section's HTML/controller and, only when necessary, its shared visual token. Do not replace the entire dashboard for a single-panel revision.
