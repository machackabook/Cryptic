# Security Policy

Cryptic is intentionally split into a public browser surface and an optional localhost bridge.

- **Never commit provider credentials, OAuth refresh tokens, Firebase service-account keys, private keys, or bridge secrets.**
- Browser runtime request tokens (`crt.*`) are short-lived correlation/scope receipts. They are **not** provider credentials and grant no remote provider access by themselves.
- The localhost bridge binds to `127.0.0.1` by default and requires a bearer secret generated at startup unless `CRYPTIC_BRIDGE_TOKEN` is supplied from the local environment.
- The first bridge release exposes only a small allowlist of status/version probes. It does not provide arbitrary shell execution.
- Public GitHub Pages cannot provide real access control. The Cosmic Guardian gate is a consent/session boundary and brand surface. Use a real authentication proxy for restricted deployments.

The repository verification workflow blocks common secret formats before Pages deployment.
