# NEXUS Magic Browser: Route-to-Document Verification (TDOC-12014)

This specification governs only the PUBLIC static Magic Browser within `machackabook/Cryptic`. It is not an authentication service or authorization bypass. The 20 allowlisted routes are local checked-in HTML fragments and should only display documents/interfaces that exist in the repository. Every fragment is fetched using a same-origin URL; failures explicitly display an error. Navigation is independent of htmx and Three.js.

## Functional map

HOME → `magic/surfaces/home.html`; TERMINAL → `magic/surfaces/terminal.html` (actual Cryptic terminal panel); GALAXIES / GENIE / CONSENSUS / VOICE / SENTINEL / QUINE / EMBEDDING / IRC / MATRIX → `magic/surfaces/<route>.html` loading allowlisted interfaces. SINGULARITY, TELEMETRY, BUS (COMMS), NODES use existing `panel.html?module=...`; DOCUMENTS retains existing PDF corpus UI; RULES & DOCS opens a static index of checked-in architecture and security documents; NETWORK, AURORA, WELCOME are also registered.

## Truth and privilege gates

- Tier T0: read-only public architecture, local browser telemetry and explicitly visualized demonstrations. Interface widgets alone confer no authority.
- Tier T1 member: backend-authenticated scoped session, user consent, encrypted chat/export, no client-side trust.
- Tier T2 developer: verified session + repository collaborator authorization, no arbitrary shell from public Pages.
- Tier T3 architect: MFA, hardware/device proof where available, signed capabilities and independent ADAM gate operators. Cain records evidence; Abel verifies it. Both are proposed roles, not verified live services.
- Agent instructions: `GEMINI.md`, `AGENTS.md`, Copilot instructions (once merged), and `docs/SECURITY-OPERATIONS.md`. They direct coding agents; enforce with GitHub branch rulesets and a private server, not text alone.
- The synthetic galaxies and geometry are VISUALS; network/agent/model connectors remain UNVERIFIED until real receipts show otherwise.
- External status endpoints such as bus.crypticnews.org may be unavailable. A failed request must not set READY.
- Public source and docs are not private credentials; no API keys, transcripts, token fingerprints, identity metadata or protected Enclave volume within GitHub Pages.

## CI proof checklist

Run `node --test magic/tests/*.test.mjs`. Check every route fragment exists; confirm iframe src targets under `interfaces/` or public `panel.html`, verify valid relative URLs. Verify route selection, browser history, known and unknown errors, network-denial fallback, active tab state and mobile scrolling in an actual browser. Only mark browser verification PASS after a real Page test—not static inspection.

Before promotion, run Git-history secret scan, dependency and build checks, actual live site probes and backup restore. ORCHBENCH → LIVE_EXECUTION → ADAM_PROOF_GATES → PRODUCTION_VERIFIED → ARCHBENCHSHOP. Until those gates pass, this document and source changes are a proposed integration.
