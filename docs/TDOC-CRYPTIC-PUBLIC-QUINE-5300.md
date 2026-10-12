# Ⓖ TDOC 5300 — Cryptic public governance & routing

**Status:** ORCHBENCH • Proposed • Copyright © 2026 Cryptic News LLC (designated claimant) • Golden G Ⓖ

## Three trust zones

1. `machackabook/Cryptic` is the **public GitHub Pages beta and fallback UI**. It may show navigation, browser-only trace and feature status. It is not an authentication authority, VPN, LAN proxy, or secure credentials vault.
2. The successor Azazeleous / future organization repository is the **proposed production public UI**. Do not redirect real traffic or claim promotion until release checks and ownership are verified.
3. `crypticnews.org` is the **intended authenticated API and telemetry control plane**, using verified Cloudflare deployment, separate origin, server-issued sessions, scoped capabilities, rate limiting, encryption and explicit privacy/retention policy.

## Pages security-route release blocker

At drafting time `security/index.html` was missing from `main`; it is under draft PR #2. Accordingly `https://machackabook.github.io/Cryptic/security/` may return 404 until promotion and Pages deploy. A source branch alone does not deploy a Pages page.

On a project Pages site, use repository-aware relative navigation `./security/` from its root, or a route resolved against `/Cryptic/`; absolute `/security/` mistakenly targets the domain root.

## Boundary and authentication

- The public ID `433855274` is a **visual continuity sequence only**. It is not a password, API key or authorization proof.
- GitHub sign-in must use a correctly configured server-side OAuth / OIDC flow or Cloudflare Access identity layer. A static GitHub Pages link cannot prove the logged-in GitHub account.
- Never collect or store GitHub passwords in Cryptic. Avoid leaking OAuth codes into browser-local trace logs, referrers or cross-repository redirects.
- Restrict post-login `next` targets to an allowlist; do not proxy arbitrary URLs, RFC1918 addresses or private LAN infrastructure.
- Store only bounded, privacy-minimized browser events until a consented, authenticated backend telemetry endpoint is genuinely verified.

## Governance root

Canonical document: **YAHWEHALLAH ALLAHYAHWEH** / TDOC-CRYPTIC-QUINE-5300. Private sections include GOD, ADAM, SelfSave 8/9/10 and Sentinel 11; this public summary intentionally includes no sensitive governance internals, original hilt PASS or provider credentials. Their source-code placeholders do not constitute verified working systems.

ADAM release sequence:
`ORCHBENCH → LIVE_EXECUTION → ADAM_PROOF_GATES → PRODUCTION_VERIFIED → ARCHBENCHSHOP`.

**Release checklist:** merged source; Actions and browser QA; correct Pages base-path routing; HTTPS/API CORS health; server-side identity; authorized trace; secret scan; rollback drill; ADAM evidence receipts. No production claim before all required gates are passed.
