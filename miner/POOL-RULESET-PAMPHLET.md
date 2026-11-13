# Mining Provider Ruleset Pamphlet

**Catalog:** CRYPTIC / Unified Miner  
**Schema version:** 1.0.0  
**Status:** TEMPLATE — no pool/provider is currently approved by this document.

This pamphlet is the review checklist attached to each provider adapter. It is not a list of approved pools, a recommendation to open an account, or a guarantee of payout. Provider terms change; every entry must cite the provider's current official terms and record when they were checked.

## Required provider record

| Field | Evidence required |
|---|---|
| Provider identity | Official provider name and canonical domain |
| Policy source | Official terms, mining policy, API docs, and privacy notice |
| Retrieval | UTC retrieval timestamp, version/date, SHA-256 of saved public policy copy where permitted |
| Supported chain | Network, asset, consensus mechanism, and supported mining algorithm |
| Work/share rules | Share difficulty, accepted/stale/invalid definitions, vardiff behavior |
| Fees | Pool fee, payout/network fee, conversion fee, other deductions |
| Payout terms | Method, minimum threshold, cadence, confirmation rules, regional availability |
| Eligibility | Age/account restrictions, identity checks, jurisdiction, tax and sanctions requirements |
| API and security | Authentication, scopes, rate limits, key rotation, replay protection |
| Privacy | Data collected, retention, disclosure, deletion and export process |
| Software terms | Allowed miners/workloads, version restrictions, prohibited automation |
| Disputes | Rejected-share review, account suspension, payout dispute process |
| Decision | `UNREVIEWED`, `BLOCKED`, `CONDITIONAL`, or `APPROVED_FOR_TESTING` |
| Review provenance | Reviewer, source links, unresolved items, and signed review receipt |

## Mandatory review rules

1. Use official provider documentation and terms; third-party summaries are discovery aids only.
2. Do not infer a payout guarantee from a calculator, marketing page, or historical payment screenshot.
3. Distinguish a locally computed hash, a submitted share, a pool-accepted share, a network-accepted block, and an actual payout. These are different events.
4. Record pool difficulty and the exact share-validation algorithm. A valid share is not necessarily a valid blockchain block.
5. Record stale/rejected shares and rejected payout events; never hide them in aggregate success metrics.
6. Check account eligibility, minimum age, jurisdiction, tax and identity requirements before considering an adapter. An adapter must remain disabled when eligibility is unknown or unmet.
7. Never place private keys, wallet seed phrases, payout credentials, API tokens, account identifiers, or private receipts in this public repository.
8. Never claim mining or payout activity occurred without independently verifiable provider and chain evidence.
9. A wallet screenshot is not a cryptographic proof of mining, chain inclusion, ownership, or payout settlement.
10. A provider ruleset is versioned. A terms change invalidates the prior approval until reviewed again.

## Source register

No provider entries are approved in this initial pamphlet. Add one record per provider only after reviewing its current official documentation. Do not scrape or bulk-collect provider datasets; comply with the source's access terms and the repository's AI access policy.

## Current system gate

`PREFLIGHT_ONLY` — pool connections, candidate mining, wallet handling, and payout operations are disabled. This gate remains closed until the relevant source code, provider rules, security controls, and eligibility conditions have been reviewed and separately authorized.

---

**The Architect / Nexus / Cryptic News LLC / Project: The Nexus Generation: GaiaSSoul / SERIES: The Nexus of Gaia / ID: 137451921129154222|040592|433855274**
