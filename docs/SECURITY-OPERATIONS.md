# Cryptic Pages Sentinel v1.0 — Security Operations

## Canonical promotion pipeline
ORCHBENCH → LIVE_EXECUTION → ADAM_PROOF_GATES → PRODUCTION_VERIFIED → ARCHBENCHSHOP

Cain and Abel are distinct proposed ADAM gate-operator roles, not a claim that independent operators are deployed. Neither can bypass evidence-first verification.

- ORCHBENCH: inventory public Pages repositories and produce source diffs.
- LIVE_EXECUTION: execute GitHub Actions, preserve run IDs and audit reports.
- ADAM_PROOF_GATES: DISCOVER → OBSERVE → NORMALIZE → CLASSIFY → VERIFY → FINGERPRINT → LOOKUP_REMEDY → APPLY_REMEDY → REVERIFY.
- PRODUCTION_VERIFIED: only after genuine deployed browser, backend, functional and security checks; static scanning alone never satisfies this gate.
- ARCHBENCHSHOP: reviewed release destination, never an automatically awarded status.

## Operations

After this pull request is merged and Actions schedules are active, the workflow performs an hourly read-only fleet review and PR/push local scans. Fleet scan lists public repositories of machackabook, Azazeleous, crypticmetaverse and thearchitectofgaia-boop; only repos with has_pages=true are scanned. No private repository data or cross-repo changes are attempted.

Reports are saved as GitHub Actions artifacts for 30 days at reports/security/pages-audit-{local,fleet}.{json,md} and reports/security/recent-diff.{json,md}. Results disclose file paths, line numbers and rule IDs but never matched credential values. Scanner failures and coverage gaps are not promoted as success.

## Verified limits
- GitHub Pages is static and public; Cosmic Guardian is a UI/consent layer, not access control.
- CSP meta does not replace security response headers, such as HSTS, frame-ancestors and Permissions-Policy. Use an authenticated backend/proxy for protected capabilities.
- Source inspection selects at most 24 relevant files per public Pages repository. Exceeding the cap or an API failure creates a coverage limitation. Treat 200 HTTP as reachable, not secure.
- GitHub Actions schedules can be delayed or disabled; check workflow run history.
- This process does not edit other GitHub repositories. Distinct Pages issues require reviewed, repository-specific fixes.
- Validate browser rendering, bridge connectivity, original Nexus palette, command behavior, cache refresh and accessibility before merging.
- The branch and PR are review artifacts, not proof that production was updated.

## Local commands
    node --check scripts/pages-security-audit.mjs
    node scripts/pages-security-audit.mjs --local-only
    node scripts/security-diff.mjs
    PAGES_AUDIT_OWNERS=machackabook,Azazeleous node scripts/pages-security-audit.mjs --fleet
