#!/usr/bin/env bash
# Cryptic SSH identity helper. Private keys remain local; only public keys and fingerprints are exported.
set -Eeuo pipefail
umask 077
usage() {
  cat <<'USAGE'
Cryptic SSH Identity v1
  bash scripts/cryptic-identity.sh init [label] [key-path]
  bash scripts/cryptic-identity.sh fingerprint [key-path]
  bash scripts/cryptic-identity.sh sign <file> [key-path]
  bash scripts/cryptic-identity.sh verify <file> <signature-file> <public-key-file> <identity-label>

init never overwrites existing keys. Signatures use the OpenSSH namespace "cryptic-axs".
Private keys, raw prompts, and key fragments are never printed by this script.
USAGE
}
need() { command -v "$1" >/dev/null 2>&1 || { printf 'ERROR: required command not found: %s\n' "$1" >&2; exit 127; }; }
cmd="${1:-help}"
shift || true
case "$cmd" in
  init)
    need ssh-keygen
    label="${1:-cryptic-node}"
    key_path="${2:-${CRYPTIC_SSH_KEY:-$HOME/.ssh/cryptic_ed25519}}"
    ssh_dir="$(dirname -- "$key_path")"
    mkdir -p -- "$ssh_dir"
    chmod 700 -- "$ssh_dir"
    if [[ -e "$key_path" || -e "$key_path.pub" ]]; then
      printf 'ERROR: refusing to overwrite an existing key or public key: %s
' "$key_path" >&2
      printf 'Choose a new path, or run fingerprint to inspect the existing identity.
' >&2
      exit 3
    fi
    printf 'Creating a new Ed25519 SSH identity at %s
' "$key_path"
    printf 'Use a strong passphrase when prompted. The private key stays on this device.
'
    ssh-keygen -t ed25519 -a 100 -C "$label" -f "$key_path"
    chmod 600 -- "$key_path"
    chmod 644 -- "$key_path.pub"
    fingerprint="$(ssh-keygen -lf "$key_path.pub" -E sha256 | awk '{print $2}')"
    printf '
IDENTITY CREATED
label=%s
fingerprint=%s
public_key_file=%s.pub
' "$label" "$fingerprint" "$key_path"
    printf 'Never upload %s or copy its contents into a public page.
' "$key_path"
    ;;
  fingerprint)
    need ssh-keygen
    key_path="${1:-${CRYPTIC_SSH_KEY:-$HOME/.ssh/cryptic_ed25519}}"
    pub_path="$key_path"
    [[ "$pub_path" == *.pub ]] || pub_path="$key_path.pub"
    [[ -r "$pub_path" ]] || { printf 'ERROR: public key not readable: %s
' "$pub_path" >&2; exit 4; }
    ssh-keygen -lf "$pub_path" -E sha256
    ;;
  sign)
    need ssh-keygen
    file="${1:-}"
    key_path="${2:-${CRYPTIC_SSH_KEY:-$HOME/.ssh/cryptic_ed25519}}"
    [[ -n "$file" && -f "$file" ]] || { usage >&2; exit 2; }
    [[ -r "$key_path" ]] || { printf 'ERROR: private key not readable: %s
' "$key_path" >&2; exit 4; }
    ssh-keygen -Y sign -f "$key_path" -n cryptic-axs "$file"
    printf 'Signature created beside the payload as %s.sig
' "$file"
    printf 'A signature proves control of the signing key only; receiver policy still decides authorization.
'
    ;;
  verify)
    need ssh-keygen
    file="${1:-}"; sig="${2:-}"; pub="${3:-}"; identity="${4:-}"
    [[ -f "$file" && -f "$sig" && -r "$pub" && -n "$identity" ]] || { usage >&2; exit 2; }
    tmpdir="$(mktemp -d)"
    trap 'rm -rf -- "$tmpdir"' EXIT
    printf '%s ' "$identity" > "$tmpdir/allowed_signers"
    cat -- "$pub" >> "$tmpdir/allowed_signers"
    ssh-keygen -Y verify -f "$tmpdir/allowed_signers" -I "$identity" -n cryptic-axs -s "$sig" < "$file"
    ;;
  help|-h|--help) usage ;;
  *) usage >&2; exit 2 ;;
esac
