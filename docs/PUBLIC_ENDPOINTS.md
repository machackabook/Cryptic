# Cryptic public endpoint map

All endpoints below are configured in the Cloudflare zone for `crypticnews.org`.

| Host / path | Worker | Access boundary |
|---|---|---|
| `https://crypticnews.org/` | `cryptic-polyglot-public` | Public landing; private APIs remain protected |
| `https://www.crypticnews.org/` | `cryptic-welcome-frontdoor` | Public redirect to the Welcome-Sentience page |
| `https://crypticnews.org/nexus/*` | `cryptic-showcase-router` | Public terminal shell; privileged operations remain gated |
| `https://crypticnews.org/uniomni*` | `uniomni-public-search` | Curated public index; private memory is not returned |
| `https://uniomni.crypticnews.org/` | `uniomni-public-search` | Curated public index |
| `https://ideal-enigma.crypticnews.org/` | `cryptic-uniomni-browser` | Search of public ideal-enigma repository metadata only |
| `https://sos.crypticnews.org/` | `cryptic-sos-public` | Public read-only S.O.S landing |
| `https://crypticnews.org/api/cryptic-mesh/*` | `cryptic-sos-portal` | Cloudflare Access protected |
| `https://api.crypticnews.org/*` | `cryptic-capability-gateway` | Signed short-lived capability tokens |
| `https://bus.crypticnews.org/*` | `cryptic-message-bus` | Signed short-lived message-bus tokens |
| `https://crypticnews.org/api/forge*` | `cryptic-golden-forge-private` | Protected private service |

## Privacy and authority

- Public browser pages index public GitHub files and metadata only.
- The GAIA Memory Bridge is linked as a separate owner-authenticated service. Public pages do not proxy, copy, or expose private memory records, cookies, or OAuth tokens.
- S.O.S mesh and Golden Forge routes remain behind their existing Cloudflare Access and worker authorization checks.
- The public S.O.S page does not expose local device shell, agent secrets, or job execution controls.
- The local S.O.S agent is a separate activation step; it is not represented as paired until a real host produces an authenticated receipt.

## Verification

Run `node --test tests/sos-public-page.test.mjs tests/uniomni-browser.test.mjs` and `node tests/public-smoke.mjs`. The smoke script retries transient failures and checks public pages, API status endpoints, and the expected anonymous Access boundary.
