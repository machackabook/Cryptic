# Security Policy

Cryptic is intentionally split into a public presentation surface, private operational repositories, and optional authenticated runtime bridges.

## Never commit reusable secrets

Never commit provider credentials, OAuth refresh/access tokens, Firebase service-account keys, API keys, passwords, session cookies, SSH private keys, device signing private keys, or bridge secrets to this repository **or** to its paired private repositories.

Browser runtime request tokens are short-lived correlation/scope capabilities. They are not provider credentials and do not grant direct provider access by themselves.

## Public / private architecture

- The public Cryptic repository contains publishable interface code, public capability metadata, reviewed assets, and public endpoints.
- Device-specific telemetry, receipts, private topology metadata, internal runbooks, and configuration state belong in an independent private NexusCryptic instance repository.
- Actual credentials remain device-local or in a provider-managed secret store.
- Public GitHub Pages is not an authentication boundary. The Cosmic Guardian is a consent/session boundary and presentation surface.

See `docs/PUBLIC-PRIVATE-PAIRING.md`.

## Runtime bridge

The local bridge requires a separately supplied bearer secret plus scoped Cryptic capabilities for controlled operations. Arbitrary unauthenticated shell execution is not part of the public interface.

## Credential exposure response

If a reusable credential is accidentally committed, treat it as compromised: revoke/rotate it first, then remove it from repository history. Deleting only the visible file is insufficient.

## Evidence-first releases

A feature must not be described as production-verified until executable verification receipts support that claim.
