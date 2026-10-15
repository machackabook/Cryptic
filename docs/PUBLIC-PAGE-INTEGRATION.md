# Cryptic Public Page Integration Boundary — 2026-10-14

**Canonical public landing page:** [Open Cryptic](https://machackabook.github.io/Cryptic/)

**Publishable source of truth:** [machackabook/Cryptic](https://github.com/machackabook/Cryptic), `main`. GitHub Pages deploys from this repository only when Pages configuration and successful deployment evidence confirm it. Repository commits alone do not verify a deployed site.

## Connected public source repositories

| Public project | Scope | Promotion policy |
| --- | --- | --- |
| [Cryptic](https://github.com/machackabook/Cryptic) | Browser landing, HTML, modular dashboard, controlled runtime interface | Public Pages code requires source scan, tests and explicit approval |
| [Cryptics Hyper Terminal OS](https://github.com/machackabook/Cryptics-Hyper-Terminal-OS) | React/Vite app and separate execution bridge contract | Independent application; port only reviewed, publishable UI or APIs |
| [Cryptic Nexus Axis](https://github.com/machackabook/Cryptic-Nexus-Axis) | Workflow and automation control-plane source | No automatic workflow or privileged access granted by a public link |
| [GAIA — The Nexus Generation](https://github.com/machackabook/Gaia-The-Nexus-Generation) | Public factory documentation and software architecture | Do not copy restricted operational data into public pages |

## Publication requirements

1. Inspect the branch diff and resolve conflicts against the latest `main` without downgrading package versions.
2. Perform current-tree and Git-history credential scans, dependency and licensing reviews.
3. Run executable build, tests, browser regression, and accessible keyboard/phone viewport checks.
4. For model, weather, geospatial, emergency, network, and hardware states, distinguish **verified live data** from offline fixtures and unavailable services. Never show a generated incident, dispatch or AI response as real.
5. Require a separately authenticated backend for any native command, Gemini inference, OAuth session or device operation. Browser-scoped receipts do not confer authority. Keep private data, credentials and signed identity keys out of public repositories.
6. Capture audit receipts for the exact reviewed commit and deployed artifact, then obtain explicit operator approval before merge or release.

Promotion remains:
`ORCHBENCH → LIVE_EXECUTION → ADAM_PROOF_GATES → PRODUCTION_VERIFIED → ARCHBENCHSHOP`

## Merge blockers identified from source review

- Some historical feature branches have diverged substantially from `main`; they require selective replay, conflict resolution and regression tests, not blind branch merging.
- The device-registry security branch changes `package.json` from `0.9.2` to `0.8.0`; preserve the current version unless an explicit migration proves otherwise.
- The Hyper Terminal React app contains pre-seeded incident, weather, network and quorum states; real service claims require verified adapters or unambiguous non-live labeling.
- GitHub status checks did not establish an executed passing CI gate for the README consolidation commits at the time of this review.

**Private operational repositories are intentionally not publication inputs.** Their contents must never be bulk-merged into this public tree.
