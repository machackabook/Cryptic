# Cryptic SSH Identity + HULE/LACE Protocol v1

**Status:** implementation draft. Public-key normalization and HULE round trips are locally testable. This document is not a claim that device-pairing or live remote identity verification is deployed.

## Identity, not a disguised key

Each Cryptic node uses a locally generated OpenSSH Ed25519 identity. The private key stays on that node. A public key and its OpenSSH SHA-256 fingerprint identify the signing key, but neither the fingerprint nor a local receipt proves a fresh peer challenge. A receiver must verify a signature over a unique, expiring challenge and enforce its own allowlist/authorization policy.

Create an identity on the device that will use it:

\`\`\`bash
bash scripts/cryptic-identity.sh init samsung-a15
bash scripts/cryptic-identity.sh fingerprint
\`\`\`

The script refuses to overwrite an existing key. Keep \`~/.ssh/cryptic_ed25519\` private with a strong passphrase. Never upload the private-key file to GitHub, a web page, a log, a shared drive, or this chat. Use a separate key per device and rotate/revoke a key if the private key is exposed or lost.

## Bidirectional signed communication

A Cryptic peer message follows this envelope shape:

\`\`\`json
{
  "schema": "cryptic.comm.envelope.v1",
  "message_id": "random-unique-id",
  "created_at": "RFC3339 timestamp",
  "expires_at": "RFC3339 timestamp",
  "sender": { "node_id": "samsung-a15", "key_type": "ssh-ed25519", "fingerprint": "SHA256:…", "alias": "…" },
  "recipient": { "node_id": "chromebook" },
  "channel": "cryptic-axs",
  "payload": { "codec": "cryptic.hule.v1", "data": "…", "sha256": "…" },
  "signature": { "format": "OpenSSH detached signature", "namespace": "cryptic-axs" }
}
\`\`\`

Sign exact canonical envelope bytes, not a pretty-printed version that can change between systems. The receiver rejects expired timestamps, replayed message IDs/nonces, unknown fingerprints, malformed public keys, and signatures with the wrong namespace. A transport receipt (loopback/WebSocket/message-bus accepted) is distinct from verified identity and a remote application acknowledgement.

\`\`\`bash
bash scripts/cryptic-identity.sh sign ./message-envelope.json
\`\`\`

The receiving side must verify against an independently maintained allowed-signers policy and the \`cryptic-axs\` namespace. A detached signature without that policy is not self-authorizing.

## Public-key fragment normalization and recovery

\`scripts/cryptic-key-fragments.py\` accepts text containing **public-key material only**. It can join line-wrapped base64 fragments when every byte is present, validate the SSH wire-format structure/type/fingerprint, normalize the key line, and recover an exact key from an explicitly supplied known-good public-key inventory when the requested fingerprint matches exactly.

It does not invent missing bytes. A truncated key without a known-good match is reported as \`UNRECOVERABLE_TRUNCATED_OR_MALFORMED\`. A fingerprint identifies a candidate key; it cannot reconstruct its bytes. Private keys are never repair inputs. If a private key is lost or truncated, generate a new identity and update the receiver's trust policy.

\`\`\`bash
python3 scripts/cryptic-key-fragments.py \\
  --fragments ./key-fragments.txt \\
  --known-public-key "$HOME/.ssh/cryptic_ed25519.pub" \\
  --expected-fingerprint 'SHA256:REPLACE_WITH_VERIFIED_FINGERPRINT' \\
  --output ./recovered-public-key.pub
\`\`\`

Replace the fingerprint placeholder only with a value copied from a trusted source. The tool refuses to overwrite an existing output file.

## HULE/LACE: Hamiltonian Unicode Linguistic Encoding

HULE/LACE separates the canonical data plane from its visual alias plane:

1. **Canonical bytes:** original UTF-8 or binary bytes, protected by a SHA-256 digest.
2. **Compression envelope:** zlib-compressed bytes carried as base64url in a \`cryptic.hule.v1\` JSON envelope. Small payloads may grow due to compression overhead; use the reported sizes.
3. **Linguistic view:** optional NFC-normalized text presentation. The motif \`A → ª → Å\` is rendered as \`A + U+200D + ª + U+200D + Å\`, while original code points remain in the canonical payload.
4. **Clip-path fingerprint:** a deterministic SVG path derived from a digest of the compressed payload. It is a visual checksum cue, not the payload, encryption, or proof of identity.
5. **Signature:** a detached OpenSSH signature over selected canonical bytes authenticates the sender only when a receiver verifies it under its own policy.

\`\`\`bash
python3 scripts/cryptic-lace.py encode ./message.txt --label 'samsung-a15-to-chromebook' --output ./message.hule.json
python3 scripts/cryptic-lace.py verify ./message.hule.json
python3 scripts/cryptic-lace.py decode ./message.hule.json --output ./message.decoded.txt
cmp ./message.txt ./message.decoded.txt
\`\`\`

Zero-width joiners and homoglyphs are not encryption. They may be stripped, normalized, rendered differently, or rejected by a transport. **Never transform SSH key bytes, signatures, bearer tokens, or canonical signed payload bytes through the linguistic alias layer.**

## AXS loopback and session policy

The Rust backend binds only to \`127.0.0.1:<port>\` (default \`8767\`). The first WebSocket frame must authenticate with a random process token. The token must not be passed in the URL or persisted by the browser. Browser origins are checked before the session is accepted. The main PTY survives browser disconnects while the backend process remains alive; named PTY sessions are explicit and the protected \`main\` session cannot be killed by a session-terminate message.

A \`#prompt\` is an AI insertion request, not a shell command: until an authenticated model adapter is configured it returns \`NOT_CONFIGURED\`. Optional VNC/websockify uses loopback-only addresses. Do not expose AXS, VNC, or the token to a LAN/public tunnel.

Structured logs store timestamps, event codes, session IDs and byte counts, not raw terminal input, pasted secrets, or pairing tokens.
