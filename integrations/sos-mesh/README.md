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

## Deploy without replacing the existing Cryptic API worker

This is a separate Worker named `cryptic-sos-mesh`, initially on its workers.dev hostname. Do not overwrite `cryptic-capability-gateway` or `cryptic-message-bus`.

From this directory, install the pinned project dependencies and authenticate Wrangler:

```bash
npm install
npx wrangler login
```

The dedicated D1 database `cryptic-sos-mesh` has already been created in the Cryptic Cloudflare account and its UUID is bound in `wrangler.jsonc`. Do not create a duplicate. The schema has already been applied and the five mesh tables were verified in D1. To re-apply the idempotent schema after a future schema update, run:

```bash
npx wrangler d1 execute cryptic-sos-mesh --remote --file=./schema.sql --config ./wrangler.jsonc
```

`MESH_SIGNING_SECRET` has already been generated and stored as a Cloudflare Worker secret. The Worker source is deployed as `cryptic-sos-mesh` and its workers.dev subdomain is enabled. The NEXUS agent secret is intentionally generated on the private NEXUS host and must be added separately before the agent starts:

```bash
npx wrangler secret put AGENT_HMAC_SECRET --config ./wrangler.jsonc
```

Do not redeploy over the production Cryptic gateway. Update only this isolated `cryptic-sos-mesh` Worker when the integration source changes.

Generate an independent agent secret locally with `openssl rand -base64 48`; enter it only at the interactive Wrangler prompt and provision the same value in the private agent's secret store. Never put secrets in Git, AI Studio prompts, HTML, or chat.

The existing Cryptic Cloudflare Access issuer, audience and JWKS URL are configured in `wrangler.jsonc`. Firebase Google identity is configured from the existing S.O.S Firebase app config; no separate OAuth client ID entry is needed. The portal identity is the Cloudflare Access JWT injected by the Access edge into the protected same-origin request. The browser must never read or forward the Access cookie/JWT itself. Do not substitute a portal session cookie or a self-asserted email.

Start the NEXUS agent on the private host:

```bash
export CRYPTIC_MESH_URL='https://YOUR-WORKER.workers.dev'
read -rsp 'NEXUS mesh HMAC secret: ' CRYPTIC_MESH_AGENT_SECRET; export CRYPTIC_MESH_AGENT_SECRET; echo
node agent.mjs
```

Keep the agent secret in the host secret store or a mode-600 environment file. The agent has no HTTP listener.

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

```bash
curl -fsS https://cryptic-sos-mesh.saytyarnornglorei.workers.dev/health
```

Then test in order: invalid Google token rejected; invalid portal token rejected; mismatched emails rejected; valid dual identity exchange; expired token rejected; old token rejected after rotation; duplicate agent nonce rejected; unknown action rejected; valid `nexus.health` queued, claimed and completed; audit rows present. The production portal route is deployed, but a live authenticated browser session and complete end-to-end message cycle have not yet been verified from the build environment.

## Provisioning and activation status

- Dedicated D1 database `cryptic-sos-mesh` is provisioned and its five tables/indexes were applied.
- Worker `cryptic-sos-mesh` is uploaded on the workers.dev hostname.
- `MESH_SIGNING_SECRET` is stored as a Cloudflare Worker secret.
- Firebase Secure Token issuer, project audience and JWKS are configured from the existing S.O.S Firebase project.
- The Cryptic Cloudflare Access issuer, audience and JWKS are configured.
- `AGENT_HMAC_SECRET` is **not yet configured**. Generate one independently on the private NEXUS host, then enter the same value into this Worker with `wrangler secret put AGENT_HMAC_SECRET`. Never commit or paste it into chat.
- The live workers.dev health request and end-to-end identity/rotation/replay/queue smoke tests have **not** been verified from the build environment.
- The S.O.S client and the dedicated `cryptic-sos-portal` Worker are committed on the companion S.O.S PR. The production route `crypticnews.org/api/cryptic-mesh/*` is protected by the existing Cloudflare Access application; the browser cannot read the injected assertion.
- The dedicated portal route is deployed, but the live authenticated browser exchange and end-to-end message cycle have not yet been confirmed. Existing DNS records and existing Worker routes remain unchanged.
