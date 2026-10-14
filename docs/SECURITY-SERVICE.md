# Local security service and working console

The systemd template `security/cryptic-security.service.example` supplies a
dedicated unprivileged collector user, restrictive umask and a writable private
state directory. It is a template: an administrator must install Node, the reviewed
checkout at `/opt/cryptic`, the dedicated user and the 0700 private directory. Store
the generated token in a 0600 root-managed `/etc/cryptic/security.env`; configure
`CRYPTIC_SECURITY_ALLOWED_ORIGINS=https://security.crypticnews.org` for the staged
private endpoint. Installing the unit does not enable any network route by itself.

`security/cloudflare-tunnel.example.json` matches the actual staged hostname/team
and Access audience. The audience is an application identifier, not a credential.
Tunnel enrollment credentials must be retrieved privately and supplied only to the
approved connector host. The catch-all rejects unmatched hostnames, and Access
authorization is required at the connector. The application currently denies all
requests until a reviewed identity provider and Allow policy are configured.

Start the dependency-free service on the approved collector host:

```sh
CRYPTIC_SECURITY_TOKEN="$(openssl rand -hex 32)" npm run start:security
```

Supply the operator token through the host's private secret manager. Do not publish
it or place it in URLs, Git, shared browser storage or artifacts. Open
`http://127.0.0.1:7443/security/` on that host and enter the same token to connect.
The public Pages console is at `/security/`; a cross-origin connection additionally
requires that exact page origin in `CRYPTIC_SECURITY_ALLOWED_ORIGINS`. Local API
mutations require an allowed Origin, a fresh ISO timestamp and a unique request ID.

The console binds Connect, Disconnect, Refresh, Register, Revoke, Telemetry Submit,
interval configuration, Start, Stop, offline audit, opt-in DNS observation, VPN plan,
credential copy/clear, catalog reload and sanitized export to the real API contract.
Disconnected/busy actions are disabled. Credentials remain in page memory and clear
on disconnect; polling stops when disconnected or the page is removed.

The five supplied documents populate source fingerprints and registration profiles.
Four hardware profiles include cited serial-interface and operating-temperature
references, plus bounded health metrics. Those values are reference constraints,
not proof that a receiver is attached. A genuine device adapter submits observed
telemetry using its device-bound credential. Out-of-reference measurements are
retained and flagged, so an overheating observation is not hidden by validation.
Coordinates, raw prompts, passwords and arbitrary metric fields are rejected.

Registry state, token digests, replay receipts and measurements persist atomically
under `.security-private/` with directory mode 0700 and file mode 0600. The HTTP
server serves only the console and explicitly approved public config/doc files;
it cannot serve this directory or source/runtime files. Revocation invalidates the
device credential. Restart leaves automation stopped and retains replay protection.

Start/Stop control only this service's monitoring timer. It measures the actual
collector host's load, memory usage and uptime. It does not start downloaded models,
issue receiver commands, terminate unrelated processes, or apply network controls.
The local metadata receipt chain has a bounded retained anchor; keep an external
trusted anchor to detect rewriting. Exports omit inventory names, device credentials
and raw telemetry.

For the staged Cloudflare pilot, serve this same service through the dedicated
Tunnel behind default-deny Access. Its origin Host header is `localhost:7443`; add
`https://security.crypticnews.org` to the service's allowed Origins on the approved
host. The Tunnel is staged but has no connected collector. GitHub browser sign-in
requires a dedicated OAuth client and reviewed Allow policy; the connected GitHub
repository authorization is not that client. No live private routes are enabled.

API tests execute exported handlers with real isolated private persistence. Local
browser startup was blocked by workspace socket restrictions. Authenticated Cloudflare
Browser Rendering ran the actual console markup/code against an API fixture:
**9 browser checks passed across 9 API mutations**. This verifies event bindings and
UI gates against the fixture. Deployment still needs collector host startup,
authenticated/unauthorized browser checks, OAuth and live VPN traffic tests.
