# NEXUS Developer Browser — staged native architecture

Status: development candidate; no production verification, merge approval or deployment authorization.

The public Nexus dashboard remains a web application. Its classic dark/cyan/gold/green/purple palette is retained. The new native console runs separately at `http://127.0.0.1:7341/`. Native source is under `native/developer-browser/`; never publish that directory in a Pages artifact. The existing public page does not receive broker, gateway, browser-profile or model credentials.

## Boundaries and transport

Chrome's raw CDP protocol does not authenticate application users. Loopback alone is not authentication. The broker therefore uses Playwright's **private debugging pipe** with an independently launched browser and a fresh temporary user-data directory. There is no `--remote-debugging-port`, TCP CDP proxy, arbitrary CDP relay, arbitrary flag editor, shell endpoint, cookie access or generic evaluation endpoint. A verified executable SHA-256 is required before launch. Canary, developer Chromium or Chrome for Testing can be selected by absolute binary path; the broker does not install or pretend to transform stable Chrome into Canary.

The HTTP listener binds only IPv4 loopback. Exact Host validation prevents DNS rebinding. Public and foreign origins are rejected without CORS permission; the local panel is same-origin. A 256-bit or stronger local secret and a fresh SYNAPSE capability are both required for every action. Only one operation runs at a time; request size, timeouts and replay-cache size are bounded. Health requires the local secret. UI assets contain no credentials and have restrictive CSP.

Capabilities are validated over HTTPS through the configured SYNAPSE/aiohttp gateway `/v1/verify`. Claims must include `aud=nexus-developer-browser`, `sub`, unique `jti`, exact action `scope`, expiry within 120 seconds, and `request_sha256` over the exact action JSON. The broker consumes each `jti` once. Gateway responses must represent authenticated, cryptographically verified capabilities after OAuth/MFA; this project does not mint credentials or supply a fabricated OAuth service. The gateway must separately authorize MCP tool names, arguments, destinations, quotas and model access. `/v1/mcp` and `/v1/gemini` receive the same action-bound authorization and must enforce one-time execution, not consume the token during read-only verification. No gateway/model calls have been verified against production.

Native browser actions: start, stop, navigate to an operator-allowlisted HTTP(S) origin, inspect a shallow DOM document, and choose normal/slow3g/offline network conditions. The temporary profile has no browser account sync, extension loading, device permissions or saved host credentials. Stop closes the context and removes its profile. A crash may leave a temporary profile; the operator must inspect and remove only directories identified as belonging to this broker. Windows ACLs must restrict the account and receipt directory; POSIX mode bits alone do not enforce Windows ACLs.

The URL allowlist controls **broker navigation**, not all browser egress. Redirects, page scripts and subresources are untrusted. This is not a network sandbox. Use owned preview content; enforce host firewall/container egress restrictions before browsing untrusted sites or expanding access. Never log into personal or production accounts in this profile. Local malware running as the same OS user remains outside this security boundary.

## Host setup and commands

Use a supported Node LTS, a separately installed browser and the package manager available on your host. From repository root:

```text
node --test native/developer-browser/broker.test.mjs native/developer-browser/adam-gates.test.mjs
node native/developer-browser/build-extension.mjs
node native/developer-browser/build-preview.mjs
```

Install the pinned native package separately (`pnpm --dir native/developer-browser install --frozen-lockfile --ignore-scripts` with its pnpm lockfile). Configure `NEXUS_BROKER_SECRET` from your native secret manager, `NEXUS_GATEWAY` as an HTTPS origin, `NEXUS_CHROME_PATH` as an absolute binary path, `NEXUS_CHROME_SHA256` as a reviewed binary digest, and `NEXUS_RECEIPT_DIR` as an absolute private directory outside both repositories. Optional `NEXUS_PREVIEW_ORIGINS` is a comma-separated exact-origin allowlist, default `http://127.0.0.1:3000`. Nothing in these docs is an issued credential.

```text
node native/developer-browser/broker.mjs
node native/developer-browser/cli.mjs health
node native/developer-browser/cli.mjs browser.start
node native/developer-browser/cli.mjs browser.inspect
node native/developer-browser/cli.mjs browser.stop
```

For every CLI action, set `NEXUS_CAPABILITY_FILE` to a private file containing a freshly issued action-bound capability. The native console accepts the same credentials in memory and clears each capability after submission. Never put secrets into URLs, localStorage, source files or Pages variables. A CLI response is an observed operation result, not an independent attestation.

To run the opt-in real browser test, set `NEXUS_CHROME_PATH` and run `node native/developer-browser/browser-smoke.mjs`. It hashes the selected binary, starts a private-pipe profile, serves an owned local preview, navigates, inspects, throttles, rejects privileged schemes/evaluation and checks cleanup. It does not authenticate to production SYNAPSE. `NEXUS_TEST_PLAYWRIGHT_MODULE` is a test-only override for an already installed Playwright module.

## Pipelines and adapters

- MV3: `build-extension.mjs` validates a zero-permission extension and creates an unpacked artifact with SHA-256 provenance. It opens the local console and source workspace only; no debugger, nativeMessaging, content scripts, host permissions or secret access. Load it manually in the separate developer profile if reviewed; the broker's automation profile disables extensions.
- PWA: `build-preview.mjs` builds a standalone local WebRTC test page, web manifest, icon and minimal service worker. Serve the output on loopback/HTTPS. Installability is browser-dependent and requires an actual browser check; a manifest alone is not an installation receipt.
- IWA: `build-preview.mjs --iwa` deliberately fails pending a reviewed bundler/signer, native private signing key and supported-host test. A PWA directory is not a signed IWA. No signed bundle or installed IWA is claimed. See [Chrome IWA documentation](https://developer.chrome.com/docs/iwa/).
- Editor: the HyperTerminal browser module and local console link to the actual repository in vscode.dev. This does not tunnel the local filesystem. code-server requires a separately authenticated loopback service and operator-managed workspace permissions; no unauthenticated deployment is included.
- WebRTC: preview exchanges a real local data-channel message between two peers only after a click, with no STUN/TURN or media capture. External signaling and TURN remain disabled. Production requires authenticated rooms, per-peer authorization, bounded offers/candidates, short-lived TURN credentials, quotas, origin checks and consent. Local preview is not an external call.
- Android: `adapters.mjs` offers an explicitly configured, SHA-256-verified native `adb devices -l` inventory adapter with no shell expansion. Device pairing, ADB network exposure, APK installation, flashing, Termux installation and wireless connection remain unavailable through the broker. Termux is detected only on an actual Android host; Windows is not Termux.
- BLE: browser support and an explicit user-gesture device chooser are required; a browser flag does not grant hardware access. No BLE connection is claimed.
- Lighthouse: an optional adapter under `native/developer-browser/audit/` uses the official Puppeteer page handoff API with `pipe: true`. It launches a separate hash-verified temporary profile and writes the real Lighthouse report privately, returning only category scores and report hash. Install its separately pinned dependencies and set `NEXUS_ENABLE_LIGHTHOUSE=1` only after host validation. It is disabled by default and has not passed a host audit in this session. Do not expose a debugging port as a shortcut.
- PSTN/VoIP: local WebRTC preview cannot call phone numbers. An actual telecom gateway/provider, authenticated account, consent and billing configuration are required.

## Provenance and ADAM release gates

Private local JSONL receipts record authorization intent before actions and completion afterward. They omit capability tokens, prompts, full URLs, DOM and model content. UUIDs identify events; they are not signatures. If receipt writing fails, authorization stops before execution. A completion-write failure is an ambiguous side-effect state; inspect before retrying. Build manifests hash actual generated files and are explicitly unsigned.

`adam-gates.mjs` verifies Ed25519 signed security/build/browser/restore/release-approval receipts against separately supplied public keys. Each gate must use a different trusted key, name the exact commit, declare a pass and include an evidence SHA-256 no older than 24 hours. Trusted keys and receipt bundles must come from an independent release authority outside the repository. Unit-test keys are generated fixtures, never production approvals. Evidence hashes must be checked against retained artifacts by that authority. The verifier itself does not merge, deploy or alter GitHub protections. Existing Pages publishing configuration is unchanged. Independent security, build, browser, restore and explicit release approval remain mandatory before release.

## Earlier drafts and platform facts

Cryptic draft [#10](https://github.com/machackabook/Cryptic/pull/10) provides tiered Pages packaging from a pinned HyperTerminal revision; draft [#11](https://github.com/machackabook/Cryptic/pull/11) provides allowlisted Magic routes. This work does not silently merge either draft. Their browser checks and release gates still need independent evidence. Public Pages supports static assets, not native services.

A website cannot register or implement privileged `chrome://` or `chrome-untrusted://` internal schemes. A downloaded EXE is not an executable browser document. A public page cannot natively mount an APFS sparsebundle; APFS mounting requires a supported OS and the authorized SYNAPSE/SecureFS integration. No Enclave mount, SecureFS protection or signed Golden G copyright footer is asserted here. Arbitrary code evaluation requires a separately authorized isolated runtime with its own filesystem, network, CPU/time and credential restrictions. See [Chrome remote-debugging profile isolation guidance](https://developer.chrome.com/blog/remote-debugging-port).
