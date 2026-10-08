# GAIA URL Assimilation — Public Publication Contract v1

Status: **SOURCE INVENTORY NOT AVAILABLE / NOT YET AUDITED**  
Assessment date: 2026-10-08  
Destination: `machackabook/Cryptic/living-ledger/v1/`  
Private operational companion: `machackabook/Project-NexusCryptic`.

## Scope and honesty of evidence

The operator reports 407 supplied URLs. The individual 407 source URLs have not been available to this publication operation; thus **0 URLs were parsed, audited, or promoted**. The number 407 is an operator-reported target, not a verified inventory count. No fetched source content, classified URL counts, or live deployment successes are asserted.

## Stage gates

1. **Discover**: receive an explicit versioned input manifest with source-of-record and acquisition time.
2. **Observe**: parse scheme, origin and encoding. Do not execute URLs, JavaScript, data URLs or network requests.
3. **Normalize**: bounded percent-decoding; decode data URL bytes only into local quarantine; keep original input untouched under an approved secure local store.
4. **Classify**: label source type (repository, paper, documentation, video, asset, cloud document, API, local/private, unknown); do not infer trust from category.
5. **Verify**: validate actual source access, integrity, license and provenance; check for credentials, private addresses, embedded code, redirect tokens and tracking IDs.
6. **Fingerprint**: SHA-256 source bytes locally, with source receipt, timing, and encoding metadata. Do not publish hashes of sensitive bearer values or authenticated URLs.
7. **Review/Promote**: manual authorization for each publishable record, using a sanitized derivative. Publishing is never automatic.
8. **Reverify**: inspect deployed static output; preserve a hash-linked local receipt and evidence for each promotion.

## Public allowlist contract

Public JSON can contain the stable record ID, broad category, non-sensitive display name, *approved* public origin/URL, provenance attribution, license note, verification state and publish-safe content digest. The default is **no raw URLs**. No hostname, path, query, fragment, embedded text or hash derived from an authenticated/private URL is promoted without explicit review. Do not include raw auth fields, signed links, OAuth redirects, passwords, credentials, device tokens, bearer IDs, API keys, private IPs, hardware identifiers or internal backend topology.

Use URL and HTML parsing as *data*, never `eval`, dynamic scripts, auto-followed redirects or in-page remote fetch. All source-derived display strings must be emitted as text, not HTML. Store original source separately from publishable metadata, with an append-only hash-chain receipt on a controlled device or private storage; a private GitHub repo is not a secret vault.

## Independent verification boundaries

`README.md` and `STATUS.md` identify `https://machackabook.github.io/Cryptic/` as the intended Pages site. An external browser fetch did not independently confirm live rendering. Existing `scripts/verify.mjs` and `.github/workflows/cascade.yml` are limited evidence gates, not full security attestation. A publicly readable device-key-like value is present in `config/nodes.public.json` and should be reviewed for data minimization; token status has not been established. The service worker currently caches arbitrary successful GET responses; use an asset allowlist for sensitive-capable runtimes.

## Contract extension

Append new reviewed records and receipts without rewriting historical source data. Maintain source-ID to public-ID mappings only in the private lineage ledger; record a public catalog schema version on every release. Do not silently convert `pending` to `verified`.
