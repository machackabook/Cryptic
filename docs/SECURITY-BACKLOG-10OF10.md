# CRYPTIC // 10-of-10 Security Control Backlog

**Target:** ten evidence-backed control families. **Current score: NOT SCORED / NOT PRODUCTION VERIFIED.** A control is complete only with attached real evidence, owner sign-off and rollback proof. Do not infer a perfect result from passing static tests.

| # | Control | Current evidence | Exit criterion |
|---:|---|---|---|
| 1 | Scope and assets | Public GitHub Pages files and Cloudflare zone identified | Enumerate GitHub Pages sites/custom domains, source roots, owner and sensitivity classification |
| 2 | Secret and history hygiene | Static current-tree patterns (partial) | Complete Git history, artifact, provider key and exposure review; rotate any confirmed exposed tokens |
| 3 | Browser injection/CSP | PR #3 merged source fixes | Real browser XSS, CSP, third-party script integrity, and regression tests succeed |
| 4 | Identity and GitHub permission | Access pilot currently has no configured IdP/policies | Configure GitHub OAuth, server-side collaborator permission, scoped authz and negative tests |
| 5 | Device and machine identities | No live binding proven | Device key enrollment, challenge signatures, replay prevention, optional Access device posture / mTLS |
| 6 | AI bot and robots policy | Cloudflare zone config can publish managed robots and known bot block; GitHub Pages unaffected | Verify /robots.txt at each actual origin, bot challenge/block telemetry and controlled 403 |
| 7 | Bridge/worker authorization | PR #3 source checks for CORS, TTL, replay, mutations | Real bridge/gateway token signature validation, revocation, replay across restart, allowlist, rate limits |
| 8 | Storage, telemetry and data retention | Browser local-first restrictions in PR #3 | Prove encrypted private state, retention schedule, export/delete, telemetry minimization |
| 9 | Supply chain/release | PR #4 hourly workflow prepared | Runner success, lockfile/dependency review, pinned Actions SHA, code review and protected release gates |
| 10 | Continuous response/recovery | Pages Sentinel source scanner | Verified hourly runs, alert routing, tested restore, incident playbooks and published signed evidence manifest |

### Operating pipeline

ORCHBENCH → LIVE_EXECUTION → ADAM_PROOF_GATES → PRODUCTION_VERIFIED → ARCHBENCHSHOP

Cain: proposal/risk classification operator; Abel: independent evidence/verification operator. These are planned roles, not claimed deployed human or machine principals. Neither can bypass failed checks.

### Remediation priorities

P0: authenticate restricted content on an actual protected origin; never assume GitHub Pages authorization. P0: confirm any key exposures and rotate first. P1: block known AI crawlers and verify policy at domain root. P1: fix existing CI failures and harden supply chain. P1: adopt explicit evidence for each functional gate. P2: extend beyond 24-file sampling without losing reliable scan runtime; report coverage. P2: add legal/privacy review and request workflow.

### Evidence receipt requirements

Each row's promotion receipt must contain control ID, approved principal, commit SHA, live target URL, test executable, timestamp, test result, limited-scope analysis, signer/checkpoint and rollback proof. Fail closed on missing evidence. Avoid claiming a 10/10 rating as a security guarantee.
