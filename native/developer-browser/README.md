# Native package

Read [architecture and operational boundaries](../../docs/NEXUS-DEVELOPER-BROWSER.md) before starting. This is a development candidate, not a verified production browser or an Enclave mount.

The local panel does not share credentials with Pages. Host browser launch and cleanup must pass separately before release. Optional Lighthouse has its own dependencies under `audit/` and remains disabled until explicitly configured. IWA signing and external signaling/TURN are not configured.

```text
node --test broker.test.mjs adam-gates.test.mjs restore-artifact.test.mjs
node build-extension.mjs
node build-preview.mjs
```
