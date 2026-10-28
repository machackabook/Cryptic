# COMPUTƏ v6 — A Living System

**Status:** working reference module, not an autonomous intelligence or deployed service.

Computə is the verifiable computation and state-arbitration module for Cryptic. The special **ə** names the project's compute/evidence interface; the name is not a claim of mathematical invertibility.

## Architecture

```text
PROJECTS / REPOSITORIES / MODELS / DATASETS / APP STATE / OS CONFIG / PACKAGES / SERVICES / DOTFILES / MCP CONFIG / ROUTER CONFIG
       ↓ scoped, consented source adapters
SOURCE REGISTRY → CHOP SHA-256 MANIFEST → DUC cross-check → TDOC RECEIPT CHAIN
       ↓                                  ↓
PRIMARY ↔ REPLICA                  ARBITRATION (RED/YELLOW/GREEN)
CACHE / ARCHIVE / OFFLINE                 ↓
       └──────────────────→ ADAM verify gate → public-safe release review
                                  ↓
                       ZENITH / OMNIBROWSER UI
```

### Storage role semantics

* **primary:** authoritative writable state.
* **replica:** synchronized verifiable copy, not automatically authoritative.
* **cache:** disposable derived material.
* **archive:** retained historical snapshot.
* **offline:** locally accessible copy, may be stale.

The storage roles are manifest labels. Synchronization, replication, and hardware discovery require separately authenticated adapters.

### v6 contracts

1. **Arbitration** compares evidence and conflicting model proposals; never choose responses by length.
2. **Semantic control** converts intent into a proposed typed action. Only allowlisted actions can execute after local authorization.
3. **Ledger memory** stores canonical JSON records with SHA-256 parent hashes and manifest hashes. Hash chains detect changes against a *trusted external anchor* but do not guarantee immutability alone.
4. **Self-reference** points to a [ChatGPT shared design conversation](https://chatgpt.com/share/6ae27b7a-ec38-83ea-bc7c-93c5d0d07daa?ogimg=plain). Link and external provenance remain unverified until independently fetched, hashed and anchored.
5. **Public/private boundary** forbids pushing secrets, OS snapshots, dotfiles, credentials, personal data, or private datasets to this public repository.
6. **EU governance** is modeled as a policy jurisdiction tag; actual EU legal compliance requires tailored review. This system does not autonomously govern the EU.

The keyword `407links` is preserved as a *user-provided reference label*, not a claim that 407 independently verified links have been catalogued.

## Mathematics

For canonical bytes `B` and previous digest `h_prev`:

```text
h_artifact = SHA256(B)
h_next = SHA256("COMPUTƏ-v6\0" || bytes(h_prev) || B)
```

Computational time scaling `T=10^9` (nanoseconds/second) and Euler's constant `e` are independent from SHA-256. A reversible numerical transformation can use `exp` / `log` over appropriate domains, but no inverse exists for cryptographic SHA-256. Do not confuse Euler's number **e** with Euler's totient **φ(n)**.

## Local executable

```bash
python3 compute/compute.py init --root /path/to/an/approved/safe/directory
python3 compute/compute.py verify --root /path/to/an/approved/safe/directory
python3 compute/compute.py status --root /path/to/an/approved/safe/directory
python3 -m unittest discover -s compute/tests -v
```

Only manually selected paths are scanned, with no recursive symlink following. No GitHub writes, network access, AI inference, autonomous modification, or publication occur in this module.

## Planned integrations (not claimed as live)

* Gemini/OpenAI dual-core arbitration via server-held credentials.
* Hugging Face model/dataset inventory adapters.
* Wolfram mathematical verifier.
* GAIA memory bridge and TDOC lineage indexing.
* Canva/Adobe Zenith visual control plane.
* Cloudflare/Vercel staged preview with verified CI evidence.
* GitHub PR review and Codespaces/Codex Tasks.
* Verified WebMCP manifest and narrowly scoped capabilities.

**ADAM gates:** DISCOVER → OBSERVE → NORMALIZE → CLASSIFY → VERIFY → FINGERPRINT → LOOKUP_REMEDY → APPLY_REMEDY → REVERIFY → HUMAN-APPROVED PROMOTE.
