#!/usr/bin/env bash
# [SS][TDOC-CRYPTIC-PAGES-VAULT-SYNC-v1.1]
# Safe manual rclone staging. Does not publish to GitHub or run remote commands.
set -Eeuo pipefail
umask 077
AE="${AE:-$HOME/Æ}"
REMOTE="${CRYPTIC_RCLONE_REMOTE:-crypticdrive}"
CANDIDATES="02_PRODUCTION_VERIFIED/PUBLIC_RELEASE_CANDIDATES"
STAGING="${CRYPTIC_VAULT_STAGING:-$AE/cryptic/vault-quarantine}"
readonly ROOT_HINT='Point your authenticated rclone remote at the canonical CRYPTIC NEXUS root folder ID from the private Drive namespace registry.'
usage(){ printf 'Usage: %s doctor | list | stage | mount-ro\n\n%s\n' "$0" "$ROOT_HINT"; }
need(){ command -v rclone >/dev/null || { echo 'Install rclone and authenticate the Drive remote locally first.' >&2; exit 1; }; rclone listremotes | grep -Fxq "${REMOTE}:" || { echo "rclone remote not configured: ${REMOTE}" >&2; exit 1; }; }
check_root(){
 # Avoid printing rclone config (would expose tokens). Only list the expected remote root folder names.
 local required='02_PRODUCTION_VERIFIED/'
 rclone lsf "${REMOTE}:" --dirs-only --max-depth 1 | grep -Fxq "$required" || {
   echo 'Remote does not appear rooted at the CRYPTIC NEXUS folder. Stop.' >&2; exit 1;
 }
}
case "${1:-}" in
  doctor) need; check_root; printf 'VALIDATED ROOT STRUCTURE (not an ACL audit): %s:\n' "$REMOTE";rclone lsf "${REMOTE}:" --dirs-only --max-depth 1;;
  list) need;check_root;rclone lsf "${REMOTE}:${CANDIDATES}" --files-only --max-depth 1;;
  stage) need;check_root;mkdir -p "$STAGING";chmod 700 "$STAGING";
    rclone copy "${REMOTE}:${CANDIDATES}" "$STAGING" --include '*.pdf' --include '*.md' --include '*.txt' --max-size 8M --immutable;
    echo "Files staged locally for inspection: $STAGING";
    echo 'NOT PUBLISHED. A separate approval manifest, SHA check, TDOC receipt, and reviewed public PR are mandatory.';;
  mount-ro) need;check_root;
    command -v fusermount >/dev/null || command -v mount_fusefs >/dev/null || {
      echo 'FUSE mount not available. Use stage instead; ChromeOS Android Termux does not imply FUSE support.' >&2; exit 1;
    };
    MOUNT="$AE/mounts/cryptic_verified"; mkdir -p "$MOUNT";
    rclone mount "${REMOTE}:02_PRODUCTION_VERIFIED" "$MOUNT" --read-only --vfs-cache-mode off;;
  *) usage; exit 2;;
esac