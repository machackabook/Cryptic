# PR #4 analysis and implementation evidence

The review expands Pages Sentinel into a source-audit workflow and an authenticated
local security console with a device registry, scoped telemetry ingestion and bounded
host automation. The original public Pages hardening remains in place.

## Scanner and evidence corrections

- Configuration, documents and potential credential files participate in credential
  inspection. Test fixture behavior is explicitly excluded while credential checks
  remain active. Oversized, truncated, unavailable or capped source coverage fails.
- Fleet source receipts resolve the default branch to an immutable commit. They
  describe source coverage, not the deployed Pages branch or build artifact.
- Only exact HTTPS GitHub API requests receive the API credential. Redirects are
  rejected and reads have byte/time limits. Errors and findings omit matched values.
- Empty integrity attributes and origin comments no longer suppress scanner rules.
- Source diff evidence uses exact event revisions and NUL-delimited filenames.
  Missing/mismatched revision evidence produces an unverified failure.
- Workflow actions use pinned revisions and read-only repository permissions;
  artifacts include content hashes and expire after 30 days.
- Remaining Magic same-origin scriptable frames were removed or isolated. Panel
  surfaces open as top-level windows, preserving module storage/module loading without
  combining scripts and same-origin privileges inside a sandbox.

## Documents made functional

Five supplied byte fingerprints and precise evidence citations populate the public
source catalog. Operating profiles provide registration gates, metric allowlists,
vendor temperature/serial reference bounds and explicit control boundaries. Measured
values outside reference bounds are retained and flagged. No receiver is pre-registered
or assumed installed, and no raw attachment, location, key, or prompt is published.

The collector measures real local load/memory/uptime only after explicit activation.
Devices get one-time scoped credentials; mutations require freshness/replay controls;
revocation is immediate. Atomic private state and bounded metadata receipts support
restart and export. Prior GAIA commands no longer return invented successful test,
device, model, or authentication results.

## DNS and VPN

Offline checks validate DNSSEC/CAA/TTL/address policy, two fixed DoH resolvers and a
narrow Tailscale template. Live DNS observation requires explicit consent and a private
operator policy. Tailscale policy validation is an offline contract check, not the
platform policy compiler or live traffic proof.

Authenticated Cloudflare inspection found the domain-owning account, a WARP profile,
an inactive existing Tunnel, no private routes and no Access applications. A new
isolated remotely managed Tunnel and a self-hosted Access application for
`security.crypticnews.org` were then staged. The new application has no Allow policies
and denies all access; the origin configuration requires Access audience validation
and only targets the loopback collector. No DNS record, private route, enrollment,
allow policy, or default WARP profile change was applied. No Tunnel credential was
printed or committed.

The connected GitHub login authorizes repository operations. It cannot substitute
for a dedicated GitHub OAuth client used by Cloudflare Access. The collector host,
identity setup and end-to-end deployment remain prerequisites. The user selected
PR templates/checks as the final scope, so further live rollout is pending.

## Verification boundary

Regression checks cover scanner trust/coverage, DNS/Tailscale guardrails, exact diff
receipts, console action routing, actual console/service API compatibility, scoped
device credentials, replay defense, revocation, filesystem boundaries and real host
measurements. The current-tree scanner reports no critical/high indicators or coverage
errors; remaining medium HTML/inline behavior indicators require contextual review.

A browser fixture exercises the actual console markup and button handlers. Local
headless browser execution was blocked by workspace socket restrictions;
authenticated Cloudflare Browser Rendering then ran the fixture successfully:
**9 browser checks passed across 9 API mutations**. This verifies event bindings and
UI gates against the fixture. Live collector startup, DNS observation, physical device
integration, OAuth login, connector sessions and tailnet enforcement remain release
checks; fixture and unit tests do not establish PRODUCTION_VERIFIED.

The current-main rebase preserved new interfaces, pinned external D3/Three.js assets
with SRI, refreshed CSP script/event hashes, and corrected fabricated model/keypair
result labels.

The static development server now uses native Node without third-party dependencies.
Its allowlist serves the console's public configs and documents while rejecting
private paths, traversal, unsupported methods and symlinks. Directory redirects keep
relative module and stylesheet URLs functional. `npm run build` now performs actual
JavaScript/CSP/source validation rather than printing an unconditional success.

Final verification after rebase: **46 regression cases across eight suites pass**;
syntax checks cover 54 external scripts and all inline scripts; CSP hashes match all
19 full documents. The bounded local scanner reads 162 eligible files with no
critical/high indicators or coverage errors. Eighteen medium static rendering
indicators remain for contextual review. GitHub main is currently unprotected; the
proposed ruleset is disabled and needs owner administration plus working CI before
activation. Both workflows use pinned actions and credential-free checkout; weekly
Dependabot action updates are configured. This is a follow-up to already-merged
PR #4, not a change to its closed branch.
