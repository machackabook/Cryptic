# Cryptic / Polyglot Quine OS — ADAM staging gates

## Canonical public product direction (2026-10-20)
**Primary OS:** browser-rendered Polyglot Quine HyperTerminal with floating WebGL torus knot, user-permissioned microphone FFT, and optional authenticated Gemini CLI that can propose bounded scene mutations.

**Landing gate:** public entry confirmation plus server-validated, operator-issued key. Key must be configured as a Cloudflare Worker secret; no key is embedded in the public JS. The key is NOT authorization for remote hardware or privileged CLI tools.

**Preserved history:** \`feature/hyperterminal-polyglot-quine-os-v17\`, \`feature/hyperterminal-singularity-ae-m5-tdoc-0037\`, and the public legacy Cryptic terminal. This staging shell retains their browser-safe commands and deny-by-default adapter contract. It is not a mathematical fixed-point quine.

**No DragonRider hero.** Prior DragonRider experience stays only as a legacy archival layer until an independently reviewed migration. Root domain's old Worker has not been modified in staging.

## Current Cloudflare paths
- \`crypticnews.org/nexus/*\` — staging edge Worker \`cryptic-showcase-router\`.
- \`crypticnews.org/\` — existing DragonRider origin until production promotion; no root route changed.
- \`api.crypticnews.org\` and \`bus.crypticnews.org\` — existing independent edge Workers.
- Future root promotion is a separate, reviewed action, only after this document's gates pass.

## Required Cloudflare secrets (not yet provisioned)
- \`CRYPTIC_GATE_KEY\`: operator-issued random public-use entry code, at least 16 characters.
- \`CRYPTIC_GATE_SIGNING_KEY\`: separate random secret, at least 32 characters; signs HttpOnly session cookies.
- \`GEMINI_BRIDGE_URL\`: operator-controlled HTTPS endpoint to a trusted CLI bridge (the \`/v1/gemini\` route).
- \`GEMINI_BRIDGE_TOKEN\`: dedicated authorization token shared only by Worker and CLI bridge.
Secrets must be installed in Cloudflare's encrypted Worker bindings, NOT committed to GitHub.
Implement rate limiting for the login and model endpoints at the Cloudflare edge before public promotion.

## Native Gemini CLI
\`runtime/gemini-cli-scene-bridge.mjs\` is a real Node bridge that invokes an installed and authenticated \`gemini --prompt ... --output-format json --approval-mode plan\` on a dedicated low-privilege host. It binds to loopback. Host it behind a hardened Cloudflare Tunnel with appropriate origin host header and access policies, and verify connectivity in both directions. Never use \`--yolo\`; disable arbitrary tool access through the CLI Policy Engine and OS sandboxing. Model output may only change \`hue\`, \`speed\`, \`energy\`; input/output bounded and receipts returned. No model is bundled in the Worker.

## Evidence promotion
DISCOVER → OBSERVE → NORMALIZE → CLASSIFY → VERIFY → FINGERPRINT → LOOKUP_REMEDY → APPLY_REMEDY → REVERIFY

- [ ] Independent HTTP GET \`/nexus/\` = 200, content-type HTML, hashed CSP, \`x-cryptic-route\` header.
- [ ] No pre-key terminal access; POST missing/incorrect key rejected; valid issued key receives HttpOnly session.
- [ ] Browser WebGL knot visible, floats, responds to scene controls on real mobile/desktop.
- [ ] Microphone access only after clicking the button, recording stops on revoke/navigation.
- [ ] Real Gemini CLI bridge online; live prompt returns model response and verified constrained scene mutation receipt.
- [ ] Audit GitHub changes, source / licenses, access rules, accessibility, privacy and operational resilience.
- [ ] GitHub Actions jobs ran and passed (not merely configured).
- [ ] Root route migration + rollback tested, root origin preserved, public privacy messaging accurate.

Failure at any gate means NOT VERIFIED. No simulated pass badges or unverifiable legal-compliance claims.

## Rollback
Delete only the staging route \`crypticnews.org/nexus/*\` targeting \`cryptic-showcase-router\`. This leaves the existing root \`dragonrideraios-webtvos\` Custom Domain Worker, api gateway, and bus unchanged.
