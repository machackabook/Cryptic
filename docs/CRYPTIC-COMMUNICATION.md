# Cryptic Communication Protocol — Public/Private Split

Version: 0.6.0

Cryptic communication is designed so the **public command surface never contains a reusable authority secret**.

## Request flow

```text
Cryptic GitHub Page
    |
    | POST /v1/token { node, scope }
    v
api.crypticnews.org
Cloudflare Worker
    |
    | HMAC-signed 5-minute capability token
    v
Browser request / encrypted envelope / local bridge
```

Every requested operation receives a unique signed token with:

- issuer: `crypticnews.org`
- audience: `cryptic-runtime`
- unique `jti`
- issue and expiry timestamps
- target node ID
- exact requested scope

The signing key exists only as the Cloudflare Worker secret `CRYPTIC_SIGNING_KEY`.

## Encrypted envelopes

`comms pair <node> <base64url-public-jwk>` imports only a node's **P-256 public key**.

`comms seal <node> <message>` then:

1. Generates an ephemeral ECDH P-256 key pair.
2. Derives an AES-256-GCM key with the node's public key.
3. Encrypts the message in-browser.
4. Sends only the opaque encrypted envelope through the gateway.
5. Records the receipt, not the plaintext, in the local ledger.

The gateway does not possess the recipient's private key and does not decrypt or persist the payload.

## Private node routing

Private endpoints are not committed to GitHub. The Worker has a separate secret binding named `CRYPTIC_PRIVATE_NODE_MAP`. Its current safe bootstrap value is an empty map. Private node endpoints can be provisioned there later without publishing them in source.

The public `/v1/nodes` endpoint may report configured node IDs but never returns their private endpoints.

## Change authority

`change <node> <proposal>` creates a signed, hashed **proposal receipt**. It does not apply the change.

Native changes currently require the optional localhost bridge. Its allowlist is deliberately small:

- `runtime.info`
- `git.status`
- `git.fetch`
- `git.pull-ff`

Each bridge action requires **both**:

1. the local `CRYPTIC_BRIDGE_TOKEN`, and
2. a fresh edge-signed token whose exact scope is `bridge.action.<action>`.

No arbitrary shell endpoint exists in v0.6.0.
