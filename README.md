# Cryptic

**The HyperTerminal Sovereign Operating System** — first public promoted surface for the Cryptic / Nexus / GAIA lineage.

Numeral remembered: `137451921129154222`. Continuity receipt: `docs/LEDGER-STAMP.md` (hop 520). This public tree is source-only. It does not store bridge tokens, provider keys, or device pair codes.

Cryptic is a portable browser command environment with an optional localhost bridge. The public runtime intentionally separates **what the browser can truly execute** from native or provider operations that require authenticated adapters.

Package version on this tree: `0.9.2` (`package.json`). This is a browser-first public surface. Adapter labels and local receipts are not proof that provider actions, device pairing, or remote operations have occurred.

## v0.7.0 capabilities

- Cosmic Guardian entry gate and consent boundary.
- HyperTerminal command fabric with a local evidence ledger.
- **A new scoped runtime request token for every requested adapter operation.** Tokens are short-lived correlation receipts, not secrets or provider credentials.
- Provider request entry points for Gemini, GitHub, Google Drive, Ollama, OpenAI, Amazon Q, IBM Watson and the local bridge. Provider API execution requires an authenticated adapter; an action that is not connected reports `NOT_CONFIGURED`.
- 963 Hz Web Audio sonification.
- Mandelbrot-inspired global-space traversal field.
- BottomRight.AI expandable pocket widget.
- DevTools API through `CrypticConsole`.
- Multi-transport routing through `CrypticBus`.
- HTTPS command deep-links and installed-PWA `web+cryptic:` protocol handling.
- Dedicated edge relay at `https://bus.crypticnews.org`.
- Optional `runtime/bridge.mjs`, bound to localhost and restricted to safe status/version probes.
- Manual evidence gate (`node scripts/verify.mjs`) and test suites (`node --test tests/security.test.mjs` and `node --test tests/public-surface.test.mjs`). Workflows are configured to run these checks, but the most recent GitHub Actions run failed before any job steps because no runner was assigned. Do not treat the suites as CI-passed until a run shows executed steps and a successful conclusion.

## v0.9.2 security and truthfulness improvements

- Browser entry CSP narrows loopback connections to the documented local ports, adds canonical/social metadata, keyboard skip navigation, and a no-JavaScript fallback.
- `_headers` defines response security headers for Cloudflare Pages deployments. GitHub Pages does not interpret `_headers`; the CSP meta tag is the fallback, and response-only directives such as `frame-ancestors` need a header-capable edge/proxy.
- `robots.txt` and the page metadata preserve the existing no-index/no-AI-crawling policy. These are advisory controls: they do not make publicly published files private.
- Terminal output now escapes HTML in AI-marked text. Local ledger writes allowlist metadata fields and scrub legacy raw payloads; runtime correlation receipts are no longer restored from browser storage.
- Commands no longer report synthetic device pairing, SSH identity, model-quorum scores, embedding vectors, successful filesystem recovery, or production promotion when no connected service performed those actions.
- Panel controls expose accessible labels and state; the pop-out uses the separate `panel.html` surface and falls back to an in-page panel if the browser blocks pop-ups.
- Security review: [`docs/PUBLIC-SECURITY-REVIEW.md`](docs/PUBLIC-SECURITY-REVIEW.md).

The no-index choice deliberately favors the current publication/privacy policy over search-engine discoverability. Automated scores must be interpreted against that policy; no Lighthouse, SEO, accessibility, or penetration-test score is claimed until the deployed artifact is actually measured.

## Local AXS terminal + SSH identity (0.9.2)

The dashboard contains optional **AXS** and **Cryptic Identity / HULE-LACE** modules.

- AXS connects only to a backend you start yourself at `ws://127.0.0.1:8767`. The backend requires a fresh 256-bit process token as its first WebSocket authentication frame; the UI keeps it in tab memory only. PTYs remain alive across browser detach/reattach while the Rust backend process is still running. Android may still stop background processes, so this is not a promise of OS-level immortality.
- The AXS server binds to loopback only. Its optional VNC/websockify path is also loopback-only. Do not put port 8767, VNC or websockify behind a public tunnel.
- The `#prompt` hook is deliberately `NOT_CONFIGURED` until a real authenticated model adapter exists. The backend does not echo a simulated model response as if it had been generated.
- SSH keys are generated on the device with OpenSSH; the browser never generates or stores a private key. `scripts/cryptic-identity.sh` refuses to overwrite existing keys and supports fingerprints, detached signatures and verification under the `cryptic-axs` namespace.
- `scripts/cryptic-key-fragments.py` only normalizes complete public-key data or recovers an exact public key from a supplied trusted inventory matching an expected fingerprint. It never reconstructs missing bytes or repairs a private key. Its check is structural; use `ssh-keygen -lf <key.pub> -E sha256` and a signed challenge before trusting a key.
- `scripts/cryptic-lace.py` wraps canonical bytes in a zlib/base64url envelope with a SHA-256 check. The `A → ª → Å` ZWJ motif and clip-path fingerprint are a reversible/presentation layer only, not encryption or authentication. Canonical key bytes and signed payloads are never transliterated.

Build the backend in Termux:

```bash
pkg update -y
pkg install -y rust clang make pkg-config openssl-tool openssh python
cd axs-backend
cargo build --release
./target/release/cryptic-axs-backend --port 8767
```

The process prints a local pairing token; paste it into the AXS panel and keep it private. Build and runtime behavior are **not considered production-verified until Cargo CI, authenticated/invalid-token integration tests, PTY detach/reattach checks, and deployed-browser QA pass**.

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
