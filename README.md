# Cryptic

**The HyperTerminal Sovereign Operating System** — first public promoted surface for the Cryptic / Nexus / GAIA lineage.

Cryptic is a portable browser command environment with an optional localhost bridge. The public runtime intentionally separates **what the browser can truly execute** from native or provider operations that require authenticated adapters.

## v0.6.0 capabilities

- Cosmic Guardian entry gate and consent boundary.
- HyperTerminal command fabric with a local evidence ledger.
- **A new scoped runtime request token for every requested adapter operation.** Tokens are short-lived correlation receipts, not secrets or provider credentials.
- Provider request surfaces for Gemini, GitHub, Google Drive, Ollama, OpenAI, Amazon Q, IBM Watson and the local bridge.
- 963 Hz Web Audio sonification.
- Mandelbrot-inspired global-space traversal field.
- BottomRight.AI expandable pocket widget.
- Optional `runtime/bridge.mjs`, bound to localhost and restricted to safe status/version probes.
- Manual evidence gate (`node scripts/verify.mjs`) with common secret-pattern scanning. The GitHub-hosted workflow is intentionally paused until this repository has an available Actions runner.

## Run locally

```bash
python3 -m http.server 8080
# open http://127.0.0.1:8080
```

## Optional local bridge

```bash
export CRYPTIC_BRIDGE_TOKEN="$(openssl rand -hex 24)"\nexport CRYPTIC_WORKSPACE_ROOT="$PWD"\nnode runtime/bridge.mjs
```

Use the same local session token value when connecting from Cryptic. In Cryptic, run:

```text
bridge connect http://127.0.0.1:7331 <CRYPTIC_BRIDGE_TOKEN>
bridge status\nbridge action git.status\nbridge action git.pull-ff
```

Do not commit the bridge secret.

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

Provider secrets, private Enclave material, and the uploaded Firebase configuration are intentionally excluded from this public repository.

© 2026 Cryptic News LLC / The Architect. All rights reserved.
