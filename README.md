# Cryptic

**The HyperTerminal Sovereign Operating System** — first public promoted surface for the Cryptic / Nexus / GAIA lineage.

Numeral remembered: `137451921129154222`. Continuity receipt: `docs/LEDGER-STAMP.md` (hop 520). This public tree is source-only. It does not store bridge tokens, provider keys, or device pair codes.

Cryptic is a portable browser command environment with an optional localhost bridge. The public runtime intentionally separates **what the browser can truly execute** from native or provider operations that require authenticated adapters.

Package version on this tree: `0.8.0` (`package.json`). The capability list below is the v0.7 surface still shipped in this public root; it is not a claim that every adapter is live.

## v0.7.0 capabilities

- Cosmic Guardian entry gate and consent boundary.
- HyperTerminal command fabric with a local evidence ledger.
- **A new scoped runtime request token for every requested adapter operation.** Tokens are short-lived correlation receipts, not secrets or provider credentials.
- Provider request surfaces for Gemini, GitHub, Google Drive, Ollama, OpenAI, Amazon Q, IBM Watson and the local bridge.
- 963 Hz Web Audio sonification.
- Mandelbrot-inspired global-space traversal field.
- BottomRight.AI expandable pocket widget.
- DevTools API through `CrypticConsole`.
- Multi-transport routing through `CrypticBus`.
- HTTPS command deep-links and installed-PWA `web+cryptic:` protocol handling.
- Dedicated edge relay at `https://bus.crypticnews.org`.
- Optional `runtime/bridge.mjs`, bound to localhost and restricted to safe status/version probes.
- Manual evidence gate (`node scripts/verify.mjs`) with common secret-pattern scanning. The GitHub-hosted workflow is intentionally paused until this repository has an available Actions runner. Doc cascade lives in `.github/workflows/cascade.yml` and only checks that README, SECURITY, and the stamp exist and that obvious secret filenames are absent.

## Run locally

```bash
python3 -m http.server 8080
# open http://127.0.0.1:8080
```

## Optional local bridge

```bash
export CRYPTIC_BRIDGE_TOKEN="$(openssl rand -hex 24)"
export CRYPTIC_WORKSPACE_ROOT="$PWD"
node runtime/bridge.mjs
```

Use the same local session token value when connecting from Cryptic. In Cryptic, run:

```text
bridge connect http://127.0.0.1:7331 <CRYPTIC_BRIDGE_TOKEN>
bridge status
bridge action git.status
bridge action git.pull-ff
```

Do not commit the bridge secret. Generate it in the shell. Leave it out of git.

## Developer Console + Message Bus

On the Cryptic page, Developer Tools can call the runtime directly:

```js
CrypticConsole.exec("status")
CrypticConsole.telemetry.snapshot()
await CrypticConsole.telemetry.send("devtools")

CrypticBus.routes()
await CrypticBus.command("status")
await CrypticBus.bridge("git.status")
```

The aggregate bus can reuse one message ID across loopback, same-origin BroadcastChannel, localhost, and the dedicated edge relay. The localhost bridge stores signed telemetry bus frames in `.cryptic/telemetry.jsonl`.

URL form:

```text
https://machackabook.github.io/Cryptic/terminal/?cmd=status&autorun=1
```

See `docs/DEVTOOLS-MESSAGE-BUS.md`.

## Capability gateway

The public command center uses `https://api.crypticnews.org` as its edge capability gateway.

- A fresh signed token is minted for each requested scope.
- The HMAC signing key is stored only as a Cloudflare Worker secret.
- Private node endpoints are reserved for the Worker secret map, not committed to GitHub.
- Encrypted Cryptic envelopes are opaque to the gateway.
- Change requests are proposals until a separately authenticated adapter authorizes and applies them.

See `docs/CRYPTIC-COMMUNICATION.md`.

## GitHub Pages

In **Settings → Pages**, choose **Deploy from a branch**, select `main` and `/(root)`, then save. The public surface is already rooted at `index.html`; the separate verification workflow remains the evidence gate for each push.

## Public security boundary

The Cosmic Guardian screen is a visual/consent gate, **not server-side access control**. GitHub Pages is static and public. Real restricted access belongs behind an authentication proxy or authenticated backend.

Provider secrets, private Enclave material, and the uploaded Firebase configuration are intentionally excluded from this public repository. Policy: `SECURITY.md`. Pairing note: `docs/PUBLIC-PRIVATE-PAIRING.md`.

© 2026 Cryptic News LLC / The Architect. All rights reserved.

## Magic Window

The public HTMX command-browser workspace is available at:

`https://machackabook.github.io/Cryptic/magic/`

It preserves the mechanics of the historical **MAGIC WINDOW OF ܞ - MONOLITH NEURAL POLYMORPH** artifact while replacing its synthetic WSS labels with real Cryptic runtime state. Terminal, Singularity, Telemetry, Communications, Nodes and Welcome surfaces swap inside the stable visual shell.

The top-left root control toggles the UI clear so the live visualizer can be exposed without destroying state.
