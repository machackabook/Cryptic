# CRYPTIC Pages Vault bridge v1.1 — additive source package

Target PUBLIC repository: `machackabook/Cryptic`, branch review then `main` when approved.
Static frontend: `/vault/`.
Private root: `CRYPTIC NEXUS`, ID kept in the private docs/host config only.
All outputs default to public catalog with **zero documents**. No direct Google Drive mount, credentials, or published private files.

See `docs/VAULT_BRIDGE.md` for the rclone → private staging → explicit approval → TDOC → public PR sequence.

Public source files: `vault/{index.html,vault.css,vault.js,catalog.json}`.
Host-only helpers: `scripts/vault_publish.py`, `scripts/cryptic_vault_sync_v1_1.sh`.
Gate tests: `python3 -m unittest discover -s scripts -p 'test_*.py' -v`.

Historical Cryptic/GAIA continuity remains additive: existing ledger and dashboard files must not be rewritten or silently promoted.