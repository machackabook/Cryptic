# Cryptic Runtime Status

## v0.6.0 — Public command-center convergence

**Verified configuration**
- Repository `machackabook/Cryptic` is public.
- GitHub reports Pages enabled for Cryptic.
- Cloudflare reports `api.crypticnews.org` attached and enabled for Worker `cryptic-capability-gateway`.
- Cloudflare reports secrets `CRYPTIC_SIGNING_KEY` and `CRYPTIC_PRIVATE_NODE_MAP` bound to the Worker.
- The node registry contains only public URLs, public repository references, capability labels, and auth-mode metadata; no private node endpoint is committed.

**Implemented**
- Cosmic Guardian entry gate.
- Browser HyperTerminal command fabric.
- Local per-request runtime receipts plus edge-signed 5-minute capability tokens.
- Public node dock and command routing.
- Welcome-Sentience integrated as a same-origin usable interface.
- Cryptic News, Geocore Tone Engine, Nexus Core, GAIA/Nexus source repositories, Gemini integration repo, GAIASiris, and repo-sync represented as public nodes.
- ECDH P-256 + AES-256-GCM client-side Cryptic envelope sealing after a real recipient public key is paired.
- Gateway accepts ciphertext opaquely and does not decrypt/persist plaintext.
- Signed, hashed change-proposal receipts.
- Local bridge actions protected by both a local secret and exact-scope edge capability token.
- Native bridge action allowlist: `runtime.info`, `git.status`, `git.fetch`, `git.pull-ff`.
- PWA cache updated for node registry, runtime module, and integrated interface.

**Deliberately not claimed**
- The Cosmic Guardian page is not server-side authentication.
- Public runtime tokens are capabilities/receipts, not provider credentials.
- A change proposal is not an applied change.
- Private node routing is not active until real private endpoints are provisioned into the Worker secret map.
- No arbitrary shell execution endpoint exists.
- Other public machackabook repositories audited in this pass do not currently report GitHub Pages enabled; they are linked as source/capability nodes instead of being falsely labeled as live Pages sites.

**External render probe**
- A Cloudflare Browser Rendering verification request was attempted after deployment but Cloudflare returned rate-limit error 2001. Configuration/readback checks above succeeded; visual HTTP rendering should be rerun when the Browser Rendering quota is available.
