# ADAM / Cryptic Showcase Promotion Gate — 2026-10-20

## Target routing
- \`https://crypticnews.org/\` → public showcase after promotion.
- \`https://crypticnews.org/os/\` → preserved DragonRider/WebTV OS via fetch(request) to existing custom-domain origin Worker.
- \`https://crypticnews.org/nexus/\` → independent staging showcase path.
- \`https://api.crypticnews.org\` and \`https://bus.crypticnews.org\` stay on their existing Cloudflare workers.

## Prohibited claims and content
Never infer legal clearance, model training, TPM attestation, real remote computation, or AI model connectivity from a rendered badge or animation. Do not expose Nexus Enclave, sparsebundles, private repo content, passwords, credentials, identifiers, or device addresses. Do not advertise deployed features that have no observed proof. Browser client connections require explicit user consent; no visitor joins a compute pool automatically.

## Gates (evidence receipts needed)
DISCOVER → OBSERVE → NORMALIZE → CLASSIFY → VERIFY → FINGERPRINT → LOOKUP_REMEDY → APPLY_REMEDY → REVERIFY.
1. Browser locally renders canvas and capability check, with reduced-motion behavior.
2. \`/nexus/\` staging returns 200 and response header \`x-cryptic-route: showcase-v1\`.
3. \`/os/\` still serves original deployed OS, including functional controls and navigability.
4. Existing api/bus custom domains unchanged and accessible.
5. Security review: no secrets/public private data in frontend or diff; CSP and headers tested.
6. Legal review: source/asset licenses, trademark presentation, third-party model permissions and accessibility.
7. Operational review: monitoring, retry, rollback and maintenance owner.
8. Only after gates pass promote root \`crypticnews.org/*\` route. Failed gates remain BLOCKED, not PASS.

## Rollback
Remove only the route pointing to \`cryptic-showcase-router\` (or change it back to staging-only). Do not delete or modify \`dragonrideraios-webtvos\` or the api/bus worker custom domains.

## Source of truth
\`cloudflare/showcase-router.js\` contains the public-edge router. \`docs/ADAM-SHOWCASE-GATES.md\` contains promotion policy. GitHub PR review is required before treating the resulting deployment as production-verified.