# AGENTS.md — GAIA/NEXUS verified execution
These are operational instructions for Codex and other compatible coding agents, not permission to bypass auth.
1. Identify repository and scope; record branch, source SHA, changes and tests.
2. Preserve working modules, existing palette and routes. Additive changes before rewrites.
3. Read GEMINI.md and docs/ADAM_RELEASE_GATES.md. Explain provenance and observed/live status.
4. Run source checks (TypeScript, build, security, public surface, route/link/button probes). Store sanitized receipts in CI artifacts; no secret values or chats.
5. Never label UI simulations or self-reported state as production proof.
6. No production changes until review, independent verification, branch protection and an authorized deployment approval.
7. Public API GET endpoints only unless a separate authenticated service enforces actions; default deny for /api/private, /enclave, /internal.
8. Autonomous assistants cannot approve their own gate promotion, credential minting, network scans, or publication.
9. Session transcript archives: separate consent-based exports of user-visible prompts/responses, encrypted with short retention and access auditing; no access to hidden model reasoning or provider-internal logs.
10. Any critical vulnerability or credential exposure stops promotion and requires revocation plus history review.
