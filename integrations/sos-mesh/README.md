# S.O.S × CRYPTIC circular mesh

This integration keeps **Cryptic as the edge gateway and message-bus authority**. S.O.S (Sovereign Operating System) remains the AI Studio/model-facing workspace and OS control plane. The NEXUS agent remains private and initiates outbound HTTPS polling; no inbound shell, PTY, SSH, or arbitrary command execution is exposed.

## Existing assets verified before integration

- S.O.S AI Studio workspace: https://aistudio.google.com/u/2/apps/6f015ad9-3029-45c2-b621-be21fae958a2
- Cryptic AI Studio workspace: https://aistudio.google.com/u/2/apps/ed825096-a487-4c95-ac84-9b1e8bb1c51d3
- S.O.S source: https://github.com/machackabook/Sovereign-Operating-System
- Cryptic public source: https://github.com/machackabook/Cryptic
- Existing Cryptic edge workers observed in the Cloudflare account: `cryptic-capability-gateway`, `cryptic-message-bus`, `cryptic-polyglot-public`, `cryptic-welcome-frontdoor` and related services.
- Existing zone: `crypticnews.org`, active. Existing `api.crypticnews.org` DNS is proxied. The existing API Worker is preserved; this integration does not replace it.

## Circular topology

```text
           ┌──────────────────────┐
           │  S.O.S / AI Studio   │
           │ model + UI client    │
           └──────────┬───────────┘
                      │ OIDC × OIDC
                      ▼
           ┌──────────────────────┐
           │  CRYPTIC MESH EDGE   │
           │ identity / policy    │
           │ token rotation       │
           │ D1 audit + queue     │
           └──────────┬───────────┘
                      │ Cryptic-signed envelope
                      ▼
           ┌──────────────────────┐
           │ CRYPTIC MESSAGE BUS  │
           │ route + correlation  │
           └──────────┬───────────┘
                      │ outbound poll
                      ▼
           ┌──────────────────────┐
           │ NEXUS LOCAL AGENT    │
           │ allowlisted actions  │
           └──────────┬───────────┘
                      │ signed result
                      └───────────────► Cryptic edge → S.O.S client
```

The loop is a **request/receipt/result cycle**, not an unrestricted peer-to-peer trust ring. Every hop carries a message ID, correlation ID, origin, destination, timestamp, expiry, nonce, payload digest and hop limit. The edge remains the policy enforcement point.

## Authentication contract

1. Google OIDC ID token is verified against Google's published RS256 JWKS; issuer, audience, signature, expiry, subject and verified email are checked.
2. The portal OIDC ID token is verified against the portal's configured JWKS URL; issuer, audience, signature, expiry and verified email are checked.
3. The two verified email addresses must match. The portal subject is the authorization principal.
4. Cryptic issues a 10-minute HS256 access JWT. Only its JTI hash is stored in D1.
5. Rotation revokes the previous JTI before issuing the next token. Reuse of the old token is rejected.
6. NEXUS uses a separate HMAC key and HMAC-signed timestamp/nonce/body requests. Nonces are stored once in D1 to reject replay.
7. The browser client holds bridge tokens in memory only. It does not write tokens to localStorage, URLs, console output or prompts.

## Deploy without replacing the existing Cryptic API worker

This is a separate Worker named `cryptic-sos-mesh`, initially on its workers.dev hostname. Do not overwrite `cryptic-capability-gateway` or `cryptic-message-bus`.

From this directory:

```bash
npm install --global wrangler
wrangler login
The dedicated D1 database `cryptic-sos-mesh` has already been created in the Cryptic Cloudflare account and its UUID is bound in `wrangler.jsonc`. Do not create a duplicate.
```

The schema has already been applied and the five mesh tables were verified in D1. To re-apply idempotently after a future schema update, run:

```bash
wrangler d1 execute cryptic-sos-mesh --remote --file=./schema.sql
wrangler secret put MESH_SIGNING_SECRET
wrangler secret put AGENT_HMAC_SECRET
wrangler deploy
```

For each secret, generate an independent value with `openssl rand -base64 48`; enter it only at the interactive prompt. Never put secrets in Git, AI Studio prompts, HTML, or this chat.

Configure `wrangler.jsonc` with the exact Google OAuth client ID and portal OIDC issuer, audience and JWKS URL. The portal must provide a standards-compliant OIDC ID token with a verified email claim. Do not substitute a portal session cookie or a self-asserted email.

Start the NEXUS agent on the private host:

```bash
export CRYPTIC_MESH_URL='https://YOUR-WORKER.workers.dev'
read -rsp 'NEXUS mesh HMAC secret: ' CRYPTIC_MESH_AGENT_SECRET; export CRYPTIC_MESH_AGENT_SECRET; echo
node agent.mjs
```

Keep the agent secret in the host secret store or a mode-600 environment file. The agent has no HTTP listener.

## AI Studio client wiring

Import `client.mjs` into the S.O.S application. Supply two functions that obtain fresh OIDC tokens from the real Google and portal sign-in flows:

```js
import { installCrypticMeshClient } from "./client.mjs";

const mesh = installCrypticMeshClient({
  baseUrl: "https://YOUR-WORKER.workers.dev",
  getGoogleIdToken: async () => googleIdentityAdapter.getIdToken(),
  getPortalIdToken: async () => portalIdentityAdapter.getIdToken()
});

await mesh.connect();
const receipt = await CrypticBus.send("nexus.health", {}, { route: ["mesh"] });
```

The adapter names above are integration points, not pre-existing globals. Implement them using the actual Google Identity Services client and the portal's supported OIDC client. Do not paste Gemini API keys into this client. AI Studio's model runtime and user identity are separate concerns.

To connect with Cryptic's existing bus, import `installCrypticMeshClient`, install the authenticated client as `window.CrypticMesh`, then use the native `CrypticBus.send(kind, payload, { route: ['mesh'] })` transport. The bus now reports `mesh: true` only when the client is installed. A gateway-accepted receipt means queued, not completed; read `mesh.jobs()` for the remote result.

## Production hostname and existing routes

The verified zone is active, and `api.crypticnews.org` already has a Cryptic API service. The zone's current Worker route list did not show a route for this new mesh. Keep the initial deployment on workers.dev. Before adding a production hostname, inspect the existing custom-domain/route configuration and use a dedicated `mesh.crypticnews.org` hostname or an explicitly approved non-overlapping path. Do not repoint `api`, `bus`, apex or `www`.

## Smoke checks

```bash
curl -fsS https://YOUR-WORKER.workers.dev/health
```

Then test in order: invalid Google token rejected; invalid portal token rejected; mismatched emails rejected; valid dual identity exchange; expired token rejected; old token rejected after rotation; duplicate agent nonce rejected; unknown action rejected; valid `nexus.health` queued, claimed and completed; audit rows present. No live portal operation is enabled by default.

## Not yet provisioned

The Cloudflare account has an active Cryptic zone and existing workers, but this integration still needs a new D1 database, new Worker deployment and two independent Worker secrets. The Google OAuth client ID and portal OIDC issuer/audience/JWKS URL are not present in the connected configuration. These are intentionally not guessed. Production route attachment remains a separate change after workers.dev smoke tests pass.
