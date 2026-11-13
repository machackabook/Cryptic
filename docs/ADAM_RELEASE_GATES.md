# ADAM CLOUD RELEASE GATES — TDOC 12010
- Gate 0 DISCOVER: inventory source; verify provenance & selected canonical repo; identify release artifacts and licensed assets.
- Gate 1 OBSERVE: baseline real HTTP and browser behavior, record links/button outcomes. No synthetic telemetry represented as live.
- Gate 2 SECURITY: secret scanning of Git history, dependency and static asset inspection, permission review, CSP/CORS, path traversal tests, OAuth/2FA provider policy.
- Gate 3 VERIFY: build, TypeScript, existing regression suites, public route API test, browser link/button checks, availability of remote providers from authorized clients; record SHA/evidence.
- Gate 4 BACKUP: encrypted backup with second independent copy; performed restore plus hash verification.
- Gate 5 RELEASE: review by two independent operators (Cain evidence, Abel verification); manual environment approval; release SHA and rollback plan; keep staging URL out of SEO indexes.
- Gate 6 REVERIFY: test actual deployed crypticnews.org URLs, canonical responses, sitemap, apps, APIs, UI, auth denial, logs and uptime.
State is BLOCKED until each gate has external evidence. PR merge is not production verification.
Cloudflare: crypticnews.org must be owned, activated as a Cloudflare DNS zone in the target account, and configured with a custom domain after preview verification. Until then wrangler workers.dev preview is noncanonical.
 GitHub Pages: retain existing publishing until Cloudflare build is tested; never spoof URL origins or use deceptive URL masking.
 External API keys and SSO: scoped service identity, hardware-backed MFA for operators; no 2FA on an API key itself.
 Discoverability: robots.txt, sitemap.xml, llms.txt and .well-known/ai-plugin.json invite authorized discovery; they don't grant agent credentials.
