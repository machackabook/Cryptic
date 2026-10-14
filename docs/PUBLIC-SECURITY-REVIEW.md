# Cryptic Public-Surface Security Review

Review scope: source tree for `machackabook/Cryptic` and its GitHub Pages public surface. This is a source review; it is not a Lighthouse score, external penetration test, independent cryptographic audit, or proof that deployed response headers are active.

## Controls now in source

- The root dashboard and hardened standalone visualization pages request no indexing through page metadata. The repository includes `robots.txt` and an AI-crawler advisory policy. These are crawler requests, not access control: publicly published source and pages remain accessible to anyone who has the URL or fetches them directly.
- The root and pop-out entry pages use a Content Security Policy that restricts scripts to the same origin and limits browser-to-device WebSockets to documented loopback port 8767. Loopback ports are explicitly enumerated rather than wildcarded.
- `_headers` provides response-header policy for deployments on compatible edge hosting, including Cloudflare Pages. GitHub Pages does not process `_headers`; the meta CSP is a fallback and cannot enforce response-only policies such as `frame-ancestors` or HSTS.
- Terminal-generated text uses escaping before limited formatting. The local ledger only keeps allowlisted metadata fields and migrates away legacy sensitive payload fields. Runtime receipts are not loaded from persistent browser storage.
- Provider buttons, consensus, model embedding, device enrollment, remote recovery, and ADAM promotion do not claim success unless the relevant authenticated adapter returns evidence. Missing adapters report an explicit unconfigured/unverified state.
- Public subpages now externalize boot JavaScript to same-origin files, remove synthetic model/identity “success” receipts, disclose visualization-only telemetry, and use no-index CSP policy. The PNT dashboard is a catalogue/simulator, not a live GNSS, anti-jam, atomic-clock, or certification measurement.
- The AXS Rust backend source binds its WebSocket listener to `127.0.0.1`, checks Origin against an allowlist, requires a process-scoped random token as the first frame, and rejects oversized/unsupported packets. It runs PTYs only when the operator starts the backend. Event logs contain metadata, not raw shell input or the auth token. The process may still be stopped by Android's background-process policy.
- The browser AXS panel accepts loopback endpoints only and keeps the token in tab memory. Do not expose AXS, VNC, websockify or the token to a LAN/public tunnel.
- SSH public-key handling validates OpenSSH blob structure and SHA-256 fingerprints, supports joining complete wrapped fragments and exact inventory recovery, and refuses overwrite. The validator does not reconstruct missing bytes, does not accept private key inputs, and does not independently verify all elliptic-curve point semantics. Confirm with OpenSSH on the device and use a fresh signed challenge.
- HULE/LACE preserves canonical bytes in a compressed base64url envelope with a SHA-256 integrity check. ZWJ aliases and SVG clip paths are display/checksum aids, not encryption, signatures, or identity proof.

## Verification required before promotion

1. `node --test tests/security.test.mjs tests/public-surface.test.mjs` and `python -m unittest discover -s tests -p 'test_*.py' -v` must pass in CI.
2. Cargo must complete `cargo fmt --check` and `cargo check` for `axs-backend`; then run invalid-token and valid-token WebSocket tests plus PTY session detach/reattach, resize, create/attach, and confirmed termination on a supported Termux target.
3. Confirm the latest GitHub Actions run actually executed steps and finished successfully. Past runs failed before steps because a runner was not assigned; do not mark those runs as passing.
4. Test dashboard tabs, every module controller, panel hide/collapse/ghost/duplicate/pop-out, pop-up-blocked fallback, keyboard access, reduced-motion behavior, and mobile layout in a real browser.
5. Verify current response headers on the actual published URL/CDN. Configuration in `_headers` alone does not prove that GitHub Pages applies the settings.
6. Run a repository-tree and history-aware secret scan. A current-tree pattern scan alone cannot prove that previous commits or external copies were scrubbed.
7. Confirm every source URL, capability endpoint and provider action returns the actual expected response. A locally rendered state, checksum, token-like string, or transport-accepted receipt is not proof of remote operation.

## External-analysis and discoverability policy

The no-index choice intentionally reduces search-engine discoverability and asks compliant crawlers not to index the page. It does not make public code private or guarantee that every external analyzer will refrain from fetching the URL. Do not publish secrets, private-key material or credentials in any public file. No external-analysis, SEO, Lighthouse, accessibility, privacy or penetration-test score is asserted until the deployed artifact has been tested by that tool.
