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

1. The S.O.S Firebase ID token is verified against Firebase Secure Token RS256 JWKS; issuer, Firebase project audience, signature, expiry, subject, verified email and `firebase.sign_in_provider === google.com` are checked. This matches the existing S.O.S Firebase GoogleAuthProvider session; the browser does not need a second Google sign-in.
2. The Cryptic portal identity is verified against the existing Cloudflare Access application JWT, using its configured issuer, audience and JWKS endpoint. Cloudflare Access app tokens carry a signed email and subject claim; the verifier accepts `type: app` only for this explicitly configured Access issuer. Other portal OIDC providers must supply `email_verified: true`.
3. The two verified email addresses must match. The portal subject is the authorization principal.
4. Cryptic issues a 10-minute HS256 access JWT. Only its JTI hash is stored in D1.
5. Rotation revokes the previous JTI before issuing the next token. Reuse of the old token is rejected.
6. NEXUS uses a separate HMAC key and HMAC-signed timestamp/nonce/body requests. Nonces are stored once in D1 to reject replay.
7. The browser client holds bridge tokens in memory only. It does not write tokens to localStorage, URLs, console output or prompts.

## Deploy and activate without replacing existing Cryptic services

The mesh is a separate Worker named `cryptic-sos-mesh`, initially exposed on its own workers.dev hostname. Its Wrangler config is pinned to the Cloudflare account containing `crypticnews.org`. Never deploy this configuration over `cryptic-capability-gateway`, `cryptic-message-bus`, or the public site Worker.

Provisioning already completed:
- Dedicated D1 database `cryptic-sos-mesh` is created and the five-table schema is applied.
- D1 binding `DB` is set in `wrangler.jsonc`.
- `MESH_SIGNING_SECRET` is stored as a Worker secret.
- Firebase Secure Token and Cloudflare Access issuer/audience/JWKS configuration is present.
- The separate portal Worker route is deployed at `crypticnews.org/api/cryptic-mesh/*` and is protected by the existing Access application `crypticnews.org/api`.

For future source updates, run the checks first, then deploy only this isolated Worker from this directory:

```bash
npm install --no-audit --no-fund
npx wrangler deploy --config ./wrangler.jsonc
```

The D1 schema is already applied. Only after a deliberate schema change, re-apply the idempotent schema with:

```bash
npx wrangler d1 execute cryptic-sos-mesh --remote --file=./schema.sql --config ./wrangler.jsonc
```

### Private NEXUS agent secret and startup

Do not manually type, print, paste, or commit `AGENT_HMAC_SECRET`. Run this once on the private host that will run the agent:

```bash
bash agentctl.sh setup
```

The controller installs the local dependencies, checks the Node entrypoints, starts Wrangler authentication if needed, generates a random 48-byte secret locally, stores it in `~/.config/cryptic-mesh/agent.env` with restrictive permissions, uploads the same value to the pinned Worker account, and starts the agent in the background. It does not print the secret.

Lifecycle commands:

```bash
bash agentctl.sh status
bash agentctl.sh stop
bash agentctl.sh restart
bash agentctl.sh rotate-secret
```

The agent currently supports only the explicit health, echo, and mesh-status handlers. It has no inbound HTTP listener and does not expose arbitrary shell execution.

## AI Studio client wiring

The S.O.S repository exports one shared `crypticMeshService` from `src/services/crypticMeshService.ts`. It uses the existing verified Firebase Google session and sends the Firebase ID token to the same-origin `/api/cryptic-mesh/exchange` path. In production, the dedicated `cryptic-sos-portal` Cloudflare Worker receives the server-injected `Cf-Access-Jwt-Assertion`, forwards both signed identities to this mesh Worker, and returns only the short-lived bridge result. The browser never reads the Access assertion or stores bridge tokens outside the service's in-memory closure.

The S.O.S Express route in `server.ts` remains a fail-closed Node/development fallback. Production traffic is intercepted by the dedicated Cloudflare Worker route described below; do not assume the Express fallback is the production request path.

For a separate browser client with two independently verified OIDC providers, `client.mjs` retains `installCrypticMeshClient({ baseUrl, getFirebaseIdToken, getPortalIdToken })`. Never accept tokens or email addresses typed by a user. Do not paste Gemini API keys into this client. AI Studio's model runtime and user identity are separate concerns.

The S.O.S service also installs a `window.CrypticMesh.dispatchFrame` adapter for the existing `CrypticBus` library. It forwards only `nexus.health`, `nexus.echo`, and `sos.mesh.status`; the Worker enforces the same action allowlist again. A gateway-accepted receipt means queued, not completed; read `crypticMeshService.jobs()` for the remote result.

## Production hostname and existing routes

The verified zone is active. A dedicated exact route is now attached: `crypticnews.org/api/cryptic-mesh/*` → `cryptic-sos-portal`. The existing Cloudflare Access application `crypticnews.org/api` protects this path and injects `Cf-Access-Jwt-Assertion`. The portal Worker forwards the signed assertion to `cryptic-sos-mesh` for verification. Existing DNS records and the existing `api`, `bus`, apex, `www`, Forge and public Worker routes are preserved; only this new non-overlapping path was added.

## Private NEXUS agent pairing

Run the following on the private host that will run the NEXUS agent (Termux/Linux with Node.js, npm, Git and OpenSSL):

```bash
bash agentctl.sh setup
```

The controller:
- Pins Wrangler to the Cloudflare account containing `crypticnews.org`.
- Generates a random 48-byte agent secret locally if one does not already exist.
- Stores the secret in `~/.config/cryptic-mesh/agent.env` with restrictive permissions and uploads the same value to the Worker as `AGENT_HMAC_SECRET`.
- Starts the Node agent in the background and writes logs under `~/Æ/logs` when `AE_ROOT` is unset/defaulted to `~/Æ`.
- Supports `bash agentctl.sh status`, `stop`, `restart`, and `rotate-secret`.

The secret is never printed, committed, or sent to chat. If Wrangler is not authenticated, the setup command starts the Cloudflare login flow. The current agent exposes only the explicit health, echo, and mesh-status handlers; it does not expose arbitrary shell execution.

## Smoke checks

The public edge health endpoint checks only the mesh Worker:

```bash
curl -fsS https://cryptic-sos-mesh.saytyarnornglorei.workers.dev/health
```

The Cloudflare Access assertion is checked only through the protected portal route. Open this URL in a browser already signed in through the configured Access application:

`https://crypticnews.org/api/cryptic-mesh/health`

A successful response must include `access_assertion_verified: true` and `gateway.ok: true`. An unauthenticated request should be challenged by Access. Do not copy or extract the Access cookie or JWT.

Then verify: invalid Firebase token rejected; invalid Access assertion rejected; mismatched identities rejected; valid exchange; expired bridge token rejected; previous token rejected after rotation; duplicate agent nonce rejected; unknown action rejected; valid `nexus.health` queued, claimed and completed; D1 audit rows present. The protected route is deployed, but a signed-in browser response and complete agent cycle have not yet been verified from this execution environment.

## Provisioning and activation status

- Dedicated D1 database `cryptic-sos-mesh` is provisioned and its five tables/indexes were applied.
- Worker `cryptic-sos-mesh` is uploaded on the workers.dev hostname.
- `MESH_SIGNING_SECRET` is stored as a Cloudflare Worker secret.
- Firebase Secure Token issuer, project audience and JWKS are configured from the existing S.O.S Firebase project.
- The Cryptic Cloudflare Access issuer, audience and JWKS are configured.
- `AGENT_HMAC_SECRET` is **not yet configured**. Run `bash agentctl.sh setup` on the private NEXUS host to generate it locally and upload the same value to this Worker without printing or committing it.
- The live workers.dev health request, authenticated portal health response, and end-to-end identity/rotation/replay/queue smoke tests have **not** been verified from this execution environment.
- The S.O.S client and the dedicated `cryptic-sos-portal` Worker are committed on the companion S.O.S PR. The production route `crypticnews.org/api/cryptic-mesh/*` is protected by the existing Cloudflare Access application; the browser cannot read the injected assertion.
- The dedicated portal route is deployed, but the live authenticated browser exchange and end-to-end message cycle have not yet been confirmed. Existing DNS records and existing Worker routes remain unchanged.
