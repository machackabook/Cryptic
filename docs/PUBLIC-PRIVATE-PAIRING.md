# Cryptic Public / Private Repository Pairing

## Canonical rule

Every deployable Cryptic instance has two logically separate surfaces:

1. **Public presentation surface**
   - derived from the public Cryptic / Welcome Sentience codebase;
   - contains only publishable UI, documentation, public assets, capability descriptions, public node metadata, and public endpoints;
   - may publish GitHub Pages.

2. **Private operational surface**
   - independent private repository under the NexusCryptic organization;
   - contains device telemetry, operational receipts, private topology metadata, internal runbooks, configuration state, and organization-only evidence;
   - never publishes GitHub Pages unless explicitly reviewed and promoted.

The private repository is intentionally **not a private fork of the public repository**. GitHub ties fork visibility to the upstream network, so public forks remain public. Private operational repositories therefore use a paired/mirror model.

## Secrets boundary

Even the private repository must NOT contain:

- private signing keys;
- SSH private keys;
- OAuth refresh/access tokens;
- API keys;
- passwords;
- session cookies;
- raw environment-variable dumps;
- unrestricted device identifiers.

Secrets stay on the device, in a provider secret store, or in an approved secrets manager.

## Samsung instance naming

Canonical private instance repository:

`NexusCryptic/Cryptic-Instance-Samsung-SM-S156V`

A member/device may create another private paired repository using:

`NexusCryptic/Cryptic-Instance-<member-or-device>`

## Promotion rule

Private operational material is never promoted automatically. Promotion to a public-facing repository requires explicit review, redaction, verification, and a new public commit.

## Public roles

- **Welcome Sentience** — public front door / conceptual and visual introduction.
- **Cryptic** — public communications command center, traversal interface, highest-quality publishable capability representation.
- **Per-instance public Pages repositories** — optional public experiences based only on reviewed public code/assets.

## Private roles

- **Per-instance private repositories** — device telemetry, receipts, private configuration, internal operational evidence, member collaboration.
- **Secret stores / device keyrings** — actual credentials and signing material.
