# Ⓖ TDOC-CRYPTIC-NETSEC-5200: Cryptic Network Trace / Public Gateway

© 2026 Cryptic News LLC / The Architect. All rights reserved.

Status: ORCHBENCH / review branch. Date: 2026-10-12. Version: 5.2.0.

## Origin and scope

- Public repository: `machackabook/Cryptic`. Preserve existing Gateway, Magic Window, Guardian and local bridge behaviors.
- Earlier project lineage referenced a "Mechanized Fishing Rod" with `ETHER_CAST` and `ether.catch` events routed via `UndergroundPass`. It has **not** been verified as the user's precise "fishing line o time" whisp or as a usable secret. No secret or guessed value was copied into this public commit.
- Nexus Security Monitor HTML was found in Drive, but used random threat/IP displays; the public port here does not copy fake event feeds.

## Access model

The requested public landing mnemonic `433855274` is a **visual/session unlock only**. Because it is present in the public code, it cannot authenticate the user or authorize protected operations. The underlying public HTML and JS remain retrievable. All network administration and private telemetry require authenticated server-side enforcement (for example the existing Cryptic Gateway or Cloudflare Access). Do not submit provider credentials to Pages.

## Network trace

The `security/` page issues GETs only to two declared public endpoints (`api.crypticnews.org/v1/status` and `bus.crypticnews.org/v1/status`). Browser CORS failures are reported as UNVERIFIED, not as downtime. A maximum of 100 public-action events is stored in the tab's sessionStorage. Nothing is uploaded by default, and exports contain event type, timestamp and public status result, not address/path/query/token information.

Navigation is an allowlisted set of static public links, not an HTTP reverse proxy, captive portal, VPN or network-level redirect.

## ADAM evidence gates

- DISCOVER: existing Cryptic root, Magic Window, public security policy and historic Drive security mock observed.
- VERIFY: static HTML and JS review, link/path assertions, and browser UI interactions are needed before deployment.
- REVERIFY: check published Pages URL and endpoint CORS once GitHub Pages has built the merged main branch.
- PRODUCTION_VERIFIED and ARCHBENCHSHOP: not claimed by this PR.

## Testing

Locally serve repository root with `python3 -m http.server 8080`; open `/security/`, check buttons (Check endpoints, Mark, Export, Copy, Clear) and Guardian gate. On GitHub Pages verify `https://machackabook.github.io/Cryptic/security/`.

#### Golden G provenance
Document ID TDOC-CRYPTIC-NETSEC-5200. Hash/signature receipt to be issued by separately configured signing authority; a static copyright notice is **not** a cryptographic signature.
