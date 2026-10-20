# Cryptic HyperTerminal Polyglot Quine OS — GAIA AE-M5 (TDOC-0037)

## Integration boundary

- `singularity/index.html` is the public-facing HyperTerminal/Singularity entry with live WebGL2 AE-M4 galaxy embedded.
- Existing `index.html`, `interfaces/polyglot-quine-shell.html`, the `cryptic-bus`, and the authenticated `runtime/bridge.mjs` remain intact.
- All browser visitors get the same portable local-only read/visual/compute functions. **Visiting the page does not register a node or provide access to the visitor's OS.**
- Compute registration starts only after **VOLUNTEER THIS TAB** is clicked on the same-origin **localhost coordinator**; it can be revoked with STOP and is automatically suspended on page hide. No persistent volunteer registration.
- Job type is allowlisted to `vector.dot` with <=128 finite numeric vector pairs. Single low-priority dedicated Worker per volunteering tab; per-volunteer one claim, 8 volunteer cap, 32 pending jobs cap, numeric results independently recomputed by the coordinator. No scripts, LLM training, GPU mining, private files, anonymous background jobs, device scans, or shell commands.
- The `news diff` feature reads only published `STATUS.md`, compares to a **browser-local** previous snapshot, and displays a bounded line delta. It does not inspect private repositories.
- `quine hash` computes SHA-256 of 4 same-origin source assets. This is a reproducibility *fingerprint*, not a cryptographically signed release or self-replicating code.

## Run locally (Node.js >=20; from any working directory)

After copying the `singularity/` directory and the `docs/SINGULARITY-AE-M5.md` file into the *Cryptic* repository root:

```bash
node singularity/coordinator.mjs
# open http://127.0.0.1:8088/singularity/
```

In tab A, choose **COMPUTE NODES → VOLUNTEER THIS TAB**. In tab B, choose **SUBMIT TO OPT-IN POOL**. A receipt appears only after tab A calculates and the coordinator independently verifies its result. Without tab A, a queued job stays queued (not successful). **COMPUTE ON MY DEVICE** works without a coordinator, including from GitHub Pages, using a local Web Worker.

On mobile devices a localhost server must be started **on that mobile device** (or the site must be served from a user-approved local network service with its own authentication). `localhost` always means the machine where the browser runs, never the developer's computer.

## Public vs local deployment

- **GitHub Pages:** renders dashboard, galaxy, local browser commands, local computation, public news diff (if `STATUS.md` exists). The pooled-compute coordinator is NOT running on static hosting. The UI accurately reports `STATIC BROWSER MODE`.
- **localhost:** Node process binds only `127.0.0.1:8088`, uses an in-memory queue and ephemeral volunteer tokens; same-origin POST JSON and Host checks; nothing goes to the public internet.
- **Future multi-device mesh:** must use a separately deployed HTTPS/WSS authenticated coordinator, per-node consent, identity, audit log, rate limits, compute budgets, and peer threat modeling. This build does **not** silently federate users or use visitor devices as a remote cloud resource. Never put the existing privileged bridge or PTY port on the public internet.
- Modern browsers may require a **Local Network Access** prompt for an HTTPS public page trying to contact localhost. Rather than bypass this, run the shell same-origin locally; the public page does not probe local ports.

## ADAM evidence gates

`DISCOVER → OBSERVE → NORMALIZE → CLASSIFY → VERIFY → FINGERPRINT → LOOKUP_REMEDY → APPLY_REMEDY → REVERIFY`

Measured/syntax-tested assets, endpoint responses and example job receipts are evidence for those bounded operations only; WebGL2 GPU operation, public GitHub Pages deployment, mobile lifecycle behavior and distributed-network security remain **unverified** until independently tested.
