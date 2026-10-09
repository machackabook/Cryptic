# [SS][TDOC-CRYPTIC-VAULT-BRIDGE-V1.1]

## Site versus storage

- Public source: `machackabook/Cryptic` → GitHub Pages `/vault/` static frontend.
- Private operations: `machackabook/Project-NexusCryptic` → device routing and TDOC receipts; not copied to public site.
- Canonical Google Drive: `CRYPTIC NEXUS`; exact folder ID is stored ONLY in the private Drive namespace registry.
- Approved publication staging: `02_PRODUCTION_VERIFIED/PUBLIC_RELEASE_CANDIDATES`.
- Receipt write-back: `02_PRODUCTION_VERIFIED/PUBLIC_RELEASE_RECEIPTS`.
- Web Pages does not mount, proxy, or authenticate rclone. Actual rclone runs on an authorized computer or build runner, not in the browser.
- Directory sharing is **not publication consent**. Every file must be individually reviewed, redacted, hashed, and approved.

## Device adapter: Chromebook, Samsung, home server

1. Install rclone from trusted package repository if available, perform `rclone config` manually with OAuth. Select Google Drive remote and configure its root folder ID as `<CANONICAL_ROOT_FOLDER_ID_FROM_PRIVATE_DRIVE_REGISTRY>`. **Do not upload the resulting token/config file to GitHub/Drive.**
2. Use remote label `crypticdrive` or set `CRYPTIC_RCLONE_REMOTE` to the actual name.
3. Run `bash scripts/cryptic_vault_sync_v1_1.sh doctor`; confirms expected folder naming only, not Drive ACL or device security.
4. Run `bash scripts/cryptic_vault_sync_v1_1.sh stage` to download candidates into private `$HOME/Æ/cryptic/vault-quarantine`. On ChromeOS Android Termux, do not assume FUSE/Penguin available; use rclone copy instead.
5. Review each file carefully. Do not approve files directly from arbitrary Drive edits. Require TDOC evidence, SHA-256, redaction and explicit public classification.
6. Produce a local **untracked** approval spec (example below) under private working storage.
7. Run `python3 scripts/vault_publish.py --approvals ~/private/approved-public.json --staging "$HOME/Æ/cryptic/vault-quarantine" --site vault` from an authorized clean checkout. It will fail closed on mismatched hashes and unsafe paths.
8. Review `git diff`, execute `python3 -m unittest discover -s scripts -p 'test_*.py' -v`, then make a public PR; require deliberate review before merge into Pages branch.
9. Write deployment SHA, approver receipt, timestamp, and public URLs into TDOC lineage and the Drive receipts directory **after** successful publication.

## Approval spec (private input, example only)

```json
{
  "schema": "cryptic.public-vault.approval.v1",
  "releases": [
    {"file":"approved-document.pdf","title":"Approved Document","tdoc_id":"tdoc-001","approval_id":"approval-001","sha256":"<ACTUAL_SHA256>","classification":"public","publication":"approved_public"}
  ]
}
```

Do not place approval specs in public repository; the public catalog includes only release fingerprints/IDs and the approved files themselves. Approval identifiers alone are not cryptographic signatures. For stronger release authority, use separate signed TDOC manifests and verified approver identity. For sensitive data even a SHA can reveal linkage; omit sensitive metadata entirely from public releases.

## Safety and known blockers

- Public GitHub Pages cannot provide a private authenticated vault. Use an authenticated backend for private browsing.
- Avoid `rclone sync` from shared Drive to public files: it can overwrite/delete and automatically publish untrusted material. This adapter uses manual `copy` to private quarantine only.
- Never expose Google refresh tokens, GitHub PATs, SSH keys, Enclave decryption secrets, or unpublished documents in the public site or Pages build artifacts.
- The package does not create an automatic GitHub Pages workflow, enable remote shell, pair Tailscale, or authorize public publication.
- Existing GitHub Actions failures on Project-NexusCryptic may also affect automated builds. A branch-based Pages release remains gated by user review.

## Lineage convention

`TDOC_ID → Source Drive revision → sanitized artifact SHA256 → explicit public approval receipt → Git commit SHA → Pages URL → deployment verification receipt`.

Published content is a public *copy*, not a live mount into Google Drive or the encrypted sparsebundle. Private Drive folder IDs must remain out of the public website source.