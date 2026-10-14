# Supplied document evidence and network hardening

Assessment date: 2026-10-13. The reviewed public derivative is
[document-provenance.public.json](../config/document-provenance.public.json).
It records five attachment titles, SHA-256 fingerprints, exact evidence
locations, supplied claims, software interpretations, and limits.

Checksums and text extraction were verified against the supplied files. The
described runtime, external links, publisher authenticity, hardware capabilities,
installed devices, DNS configuration, and Tailscale policy were not independently
verified. A checksum identifies source bytes; it does not establish ownership,
authorship, trusted execution, or security certification.

## GAIA runtime and provenance boundaries

The supplied **GAIA / AXS / ABEL — Provenance and Runtime Gate v5.0.0** describes:

- **Bounded provenance**: public metadata cannot establish ownership of private
  conversations, broader code authorship, or collaborator identities (line 3).
  Attribution claims need direct confirmation (line 33).
- **Explicit local execution**: local lifecycle commands, a run only for an
  explicitly requested installed model, no automatic dependency/model downloads,
  and no silent cloud delegation (lines 23–25, 28–29).
- **Minimal records and opt-in caching**: a metadata/hash ledger omits raw prompt
  text; response replay caching is optional with restricted file permissions
  (line 26). Public records must also omit raw responses, credentials, private
  network inventory, and precise location data. Hashing a secret or a guessable
  value does not make it safe to publish. A hash chain requires a trusted retained
  anchor to support an integrity comparison. Browser storage cannot provide the
  described file permission boundary.
- **A scoped stop**: an external gate validates ownership before terminating its
  process group and cannot stop other daemons or hardware (line 27). A browser
  stop control stops its own monitoring requests/timers; DNS enforcement and
  tailnet isolation require separately authenticated administrative controls.

These are supplied protocol claims. This repository does not acquire or execute
the described CLI, download its models, or infer that the runtime is installed.
The mathematical and acoustic passages (lines 15–19) do not establish physical
measurements, local clock integrity, DNS authenticity, or network protection.

## Hardware references and their limits

| Source | Exact evidence | Bounded use |
| --- | --- | --- |
| NavStrike-M, 20-C96-14 | p. 1 primary communication interface; p. 2 Interfaces and System characteristics | Vendor describes RS-422, GPS radio inputs, timing and key-input capabilities. Reference-only hardware evidence; no installed adapter or measured behavior is established. |
| NavStrike, 20-C96-10 | p. 1 Key features and benefits; p. 2 Interfaces and System characteristics | Vendor describes GPS anti-spoofing, RS-422, timing and key input. GPS anti-spoofing does not authenticate DNS answers or validate Tailscale policy. |
| NavStorm-M, 23-B98-01 | p. 1 Key features; p. 2 Reliability, Interfaces and performance footnote | Vendor describes layered protection, a security-certified module, built-in tests, serial interfaces, key zeroization and bounded data hold; performance depends on conditions. These motivate general layering, health checks, revocation and explicit stale evidence. They are not a software implementation specification. |
| NavStorm+, 20-C96-09 | p. 1 Key features and benefits; p. 2 Interfaces and Reliability | Vendor describes GPS anti-jamming, LVCMOS serial interface, built-in tests, key zeroization and bounded hold. Separate sensitive device telemetry from public monitoring and distinguish stale from current observations. |

No datasheet supplies DNS, DNSSEC, TLS, TCP/IP, DoH, Tailscale, or browser security
configuration. Radio anti-jamming capabilities do not secure DNS transport or a
tailnet. Hardware hold durations and timing specifications are not monitoring
freshness thresholds or measured clock assurance. No hardware code, device
commands, key-loading workflow, or operational deployment is integrated here.

All four PDFs are general product descriptions with disclaimers on page 2. Their
public-clearance footer dates are **11/20**, **07/20**, **7/23**, and **07/20** in
the table's order; filenames containing 2025 do not prove a 2025 publication.

## Applying the evidence to DNS and Tailscale

The runtime boundary supports explicit observation and a separate private
enforcement workflow. The following are software hardening recommendations,
derived from that boundary and to be checked against current platform guidance:

1. Accept only bounded query names, record types, resolver choices, and
   administrative parameters. Private collectors must validate destinations and
   redirects and reject unintended private/reserved targets. Public JavaScript
   must not hold enrollment credentials, administrative tokens, or secret URLs.
2. Label DNS evidence by what was measured. HTTPS/DoH transport to a resolver
   does not establish DNSSEC authenticity, resolver privacy, or system-wide DNS
   policy. Browser DNS timing is a performance observation. It is not a DNS
   security test. Show observation time, expiry, unknown, denied, timeout, and
   stale states accurately.
3. Review Tailscale controls on a trusted administrative host: least-privilege
   principals/tags/ports, explicit grants, device approval/posture where
   applicable, restricted short-lived enrollment credentials, expiry/revocation,
   and administrator MFA. Review route, exit-node and public exposure settings
   deliberately. A public Pages dashboard cannot apply or attest these settings.
4. Keep prompts, responses, keys, signed/authenticated links, private node
   identifiers, resolver query histories, and exact location data out of public
   catalogs, browser storage, exported evidence and logs. Store secrets in private
   host or CI secret storage. Collect the minimum status needed for the decision.
5. Report missing or stale private evidence as unverified. An observed endpoint
   response does not justify claiming all parameters, private data, or network
   policy are secured.

## Publication pipeline and approval

The existing [GAIA publication contract](GAIA-URL-ASSIMILATION-v1.md) defines
**Discover → Observe → Normalize → Classify → Verify → Fingerprint →
Review/Promote → Reverify**. **Review/Promote** is the approval stage for sanitized
public derivatives. The supplied runtime document does not itself define that
pipeline or prove its stages were completed.

This derivative excludes raw attachments, extraction output, private message
metadata, inaccessible conversation identifiers, local paths and personal
attribution. An attachment fingerprint is kept only for the supplied document
bytes; hashes of secret values or authenticated URLs are excluded. Future public
records must be reviewed under the same contract, with their verification state
retained accurately and deployment checked separately.

## Extraction limits

The Markdown has 33 lines. Each PDF extracted as two pages, eight PDF pages in
total. `pdftotext -layout` emitted font-weight warnings but completed for every
file. Images and diagrams were not OCR processed and were not used as evidence.
No external reference, device, CLI, resolver, or tailnet was accessed during the
document analysis. The JSON lists each original-byte SHA-256 and states the
independent-verification boundary explicitly.
