# Cryptic security review — 2026-10-13

Source reviewed: main at 05739f51af70deb6719388146fbe68c9bfcb4004.
Published address declared by the repository: https://machackabook.github.io/Cryptic/.
This review inspected the repository snapshot, not a verified live deployment or all Git history.

## Findings and changes

- High: terminal AI output and Genie log entries interpolated user text into HTML. Escape terminal text before formatting; construct Genie text nodes.
- High: the pop-out module query parameter was interpolated into an HTML error. Render the error as text. Dashboard boot errors no longer expose stack traces through HTML.
- High: BroadcastChannel receivers executed terminal commands from any page sharing the GitHub Pages origin. Reject command and bridge-action frames on incoming broadcast/service-worker routes, including the legacy bus.
- High: bridge credentials were echoed in command output and stored in origin-wide sessionStorage. Redact connection commands, validate loopback origins and minimum secret length, and keep the profile in page memory. Reject credential-bearing generated links and remove incoming bridge connection links from browser history.
- High: the service worker cached arbitrary GET responses, including external responses and URLs containing parameters. Cache only explicit public assets without credentials or query strings; migrate Cryptic caches without deleting unrelated applications' caches.
- High: the local static server exposed the project root, including runtime source and possible operational logs. Bind to loopback and restrict served paths to public asset directories/files.
- High: bridge capabilities lacked expiry and replay checks. Reject expired, overly long-lived, or reused capability IDs; timeout gateway verification and reject redirects. Replay protection is process-local: restarting the bridge clears it, so gateway verification must also enforce one-time use.
- Medium: bridge action lookup accepted inherited object properties. Require own properties. Disable git fetch/pull unless the operator explicitly sets CRYPTIC_BRIDGE_ENABLE_MUTATIONS=1.
- Medium: telemetry aggregation sent browser details to broadcast, localhost and an external relay by default. Default to loopback only; explicit callers may select other routes.
- Medium: browser receipts and intent text were retained in browser storage. Keep receipt tokens in memory and omit plaintext wishes/seeds/messages from terminal ledger entries. Operational bridge log frames retain metadata only.
- Medium: node pairing could accept a JWK containing private key material. Reject private JWKs. Restrict embedded frames to scripts/forms without same-origin privileges.
- Medium: no document CSP or referrer protection. Add script hash policies for inline interface scripts, restricted connection destinations, and no-referrer metadata. Local server adds no-store and nosniff headers.
- Privacy: remove the static device SSH identity from the demo login response and the public Gemini conversation sharing link from the node registry. Existing public copies/history are not erased by this patch.

## Validation

Run `npm run lint` and `npm run test:security`. The tests exercise hostile terminal rendering, receipt/intent retention, broadcast command rejection, local-only aggregation, cache bypass, bridge authentication/origin checks, inherited action rejection, disabled mutations, capability expiry and replay.
Tests use a bridge handler harness because this review workspace forbids local listening sockets. They do not verify gateway signatures or a live browser deployment.

## Requirements outside this patch

1. Review the api.crypticnews.org and bus.crypticnews.org backend source and configuration. The public client requests tokens without an authenticated identity; a signed token alone does not establish authorization. Gateway scope/audience/identity checks, cryptographic verification, rate limits and durable replay protection must be verified before enabling privileged operations.
2. Keep private data off GitHub Pages and public repositories. All sites under machackabook.github.io share an origin and browser storage. Use a dedicated origin and authenticated backend for private state. In-page scripts can still access the memory-only bridge profile; never treat the Guardian UI as authentication.
3. Audit repository history, deployment artifacts and provider secret inventories. The current-tree pattern scanner found no blocked credential patterns; that is not proof that no secret was exposed. Rotate any independently confirmed exposed credential before history cleanup.
4. GitHub Pages cannot supply custom security response headers. Configure CSP frame-ancestors, HSTS and other response headers on a capable host or reverse proxy when required. Smoke-test every surface after deployment, including sandboxed interfaces and explicit network routes.
5. Existing browser ledger/telemetry records are not automatically erased. Clear them on affected devices if they contain private data. Review the removed conversation share with its provider to revoke public access if needed.

Changes are prepared for review; deploying them and validating the live site are separate release steps. No claim is made that all parameters or data are secured.
