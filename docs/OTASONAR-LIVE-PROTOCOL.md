# OTASONAR v2 — live beacon data plane and Pandora Pages HUD

Dedicated GitHub repository for the operator to create: **`machackabook/otasonar-beacon-fabric`**. The full Node 20+ implementation, HTML Infinity Canvas, tests, private-config template and README are distributed as the `OTASONAR_Beacon_Fabric_v2.0.0.zip` deliverable. **No repository has been created automatically.**

## Public interface

`https://machackabook.github.io/Cryptic/interfaces/otasonar-beacon-fabric.html` (available **only after PR merge / Pages deployment**).

This page is deliberately **read-only**, uses no external script CDN and **does not invent telemetry**. It loads `config/otasonar.public.json` and requires BOTH an HTTPS URL hosted under `crypticnews.org` and a pinned Ed25519 public key. A signed controller payload must match `otasonar.telemetry/v2` and have a fresh timestamp; otherwise the page reports **SOURCE UNAVAILABLE**, with **zero** claimed verified peers.

## Live local backend flow

1. `cp config.example.json config.json` in the dedicated source checkout; set a unique local `agentId`. Node 20+, then run `npm test` and `node agent.mjs`.
2. The backend binds only `127.0.0.1:8768` by default, generating a locally protected Ed25519 key on first launch. Read its public identity from `/api/v1/identity`. It cannot expose a public internet listener.
3. Enroll **each approved target** using its exact HTTPS `/api/v1/beacon` address and pinned public key. An explicitly opted-in loopback peer may use HTTP; no LAN sweeps, RF tracking, or port scans occur.
4. A human clicks **PROBE SELECTED** in the locally served HUD. The server creates a fresh nonce, records `REQUEST_LOAD`, sends one request, verifies a signed nonce+identity+timestamp response, measures actual elapsed time and records `ACK_VERIFIED` or `PROBE_FAILED`, followed by `REQUEST_UNLOAD`. Concurrent operations and request frequency are bounded.
5. The controller returns a signed, timestamped telemetry envelope. It reports configured peers separately from currently verified peers (30-second freshness). The local HUD displays actual receipts and measurements and allows JSON export.
6. For remote Pages display, deploy a **separate privacy-reviewed, read-only HTTPS adapter** behind Cloudflare Access, validate CORS and authentication, and publish ONLY safe aggregates. Pin the adapter's/forwarded controller's public signing key. **No Cloudflare adapter or device Access policy is deployed as part of this PR.**

## Governance

`DISCOVER → OBSERVE → NORMALIZE → VERIFY → FINGERPRINT → PLAN → APPROVE → REVERIFY`.

No TFTP/PXE activation, shell execution, RF emission, arbitrary target discovery, or privileged configuration mutation is available. Signatures and actual HTTP round-trip times demonstrate receipt validity and reachability, **not physical GPS/RF direction**. BERH/Fourier mathematics are presentation models, not measured zero-latency channels.

The existing public Cryptic repository has unresolved security findings recorded in [security issue #5](https://github.com/machackabook/Cryptic/issues/5). Do not promote this change or private adapter until security CI and ADAM gates pass. A successful local test does **not** prove production readiness.

## Proof available now

A local Node test with two actual instances and separate signing identities passed the following checks: empty verified count before probe; malformed nonce rejection; cross-origin POST rejection; unknown-target rejection; valid signed acknowledgement and measured RTT; load/ack/unload events; signature verification and tamper rejection. Live cloud, LAN, Jetson, or 6K-agent deployment has **not** been verified.

## Routing ownership

Cloudflare `1.1.1.1` is a public DNS resolver, **not a safe worker ingress URL**. Use a controlled Cloudflare hostname under `crypticnews.org` and protected authenticated upstreams. Keep radio operations non-invasive and opt-in, with device identity and route receipts stored outside public GitHub Pages.
