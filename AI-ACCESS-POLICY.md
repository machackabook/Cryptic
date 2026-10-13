# Cryptic AI access / agent authorization policy

**Default stance: No automated scraping, bulk collection, dataset assembly, AI training or automated analysis without written owner authorization.**

Before any access to restricted content, an automated entity must use an authenticated gateway, present a short-lived signed capability bound to the approved GitHub repository and scope, and complete server-side identity checks. A GitHub username, connected ChatGPT account, agent identifier, user-agent or public device serial **alone** cannot satisfy this requirement. Machine identities also require cryptographic proof of key possession and replay protection.

A visitor without the required authorization should receive **HTTP 403** from a protected backend with this message:

> Thank you for your interest in Cryptic. Automated scraping, bulk collection, and AI data harvesting are not authorized for this identity or device. Please contact the repository owner to request access.

No client-only consent overlay, robots directive or AI prompt can compel malicious bots. Public GitHub Pages source is readable by anyone; do not publish secrets, protected receipts, device identifiers or private data. The "Cosmic Guardian" remains a visual consent interface, not access control.

The `robots.txt` in this project is a deployment template: standard crawlers consult only the origin-root `https://machackabook.github.io/robots.txt`, not `/Cryptic/robots.txt`. Do not advertise project-local directives as enforceable. Cloudflare's active `crypticnews.org` zone can serve a separate domain-root managed robots policy and manage known AI crawlers, but it does **not** control the independent `github.io` hostname.

**Permission process (future authenticated backend):** GitHub OAuth; verified subject; per-repository GitHub API collaborator / team permission; device enrollment challenge signature or Cloudflare Access device posture; machine-service token / mTLS; short-lived capability issued server-side; audience/scope/expiry/replay check; deny-by-default; log only metadata; return 403 without revealing which check failed. Do not grant blanket access to every connected GitHub account.

This policy is an instruction and architectural contract; it does not assert an authentication gateway has passed these checks.
