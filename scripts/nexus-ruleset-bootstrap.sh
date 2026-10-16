#!/usr/bin/env bash
# TDOC-12012. Fail-closed ruleset bootstrap, explicit owner action only.
set -Eeuo pipefail
mode="${1:-plan}"
case "$mode" in plan|--apply) ;; *) echo "Usage: bash scripts/nexus-ruleset-bootstrap.sh [plan|--apply]" >&2; exit 2;; esac
for x in gh jq mktemp; do command -v "$x" >/dev/null || { echo "Missing dependency: $x" >&2; exit 2; }; done
gh auth status >/dev/null
repo="$(gh repo view --json nameWithOwner --jq .nameWithOwner)"
case "$repo" in machackabook/Cryptic|machackabook/Cryptics-Hyper-Terminal-OS) ;; *) echo "Wrong repository: $repo" >&2; exit 2;; esac
app_id="${NEXUS_ATTESTOR_APP_ID:-}"
login="${NEXUS_ATTESTOR_LOGIN:-}"
if ! [[ "$app_id" =~ ^[0-9]+$ ]] || [[ "$app_id" == 0 ]] || [[ "$login" != *'[bot]' ]]; then
 echo "Set NEXUS_ATTESTOR_APP_ID (real GitHub App ID) and NEXUS_ATTESTOR_LOGIN (e.g. your-approved-app[bot]) first." >&2
 exit 3
fi
if [[ "$repo" == */Cryptic ]]; then check='nexus-backend-ci'; else check='nexus-react-ci'; fi
if gh api "repos/$repo/rulesets" --jq '.[].name' | grep -Fxq 'NEXUS Verified Sessions Main'; then
 echo "Existing NEXUS ruleset found; inspect before making changes." >&2; exit 4
fi
file="$(mktemp)"
trap 'rm -f "$file"' EXIT
jq -n --arg check "$check" --argjson app "$app_id" '{
  name: "NEXUS Verified Sessions Main",
  target:"branch",enforcement:"active",
  bypass_actors:[],
  conditions:{ref_name:{include:["~DEFAULT_BRANCH"],exclude:[]}},
  rules:[
    {type:"pull_request",parameters:{
      allowed_merge_methods:["squash"],dismiss_stale_reviews_on_push:true,
      require_code_owner_review:false,require_last_push_approval:true,
      required_approving_review_count:1,required_review_thread_resolution:true}},
    {type:"required_status_checks",parameters:{
      strict_required_status_checks_policy:true,
      required_status_checks:[
        {context:$check},
        {context:"nexus-session-attested"},
        {context:"nexus/session-authorized",integration_id:$app}]}},
    {type:"non_fast_forward"},
    {type:"deletion"}
  ]
}' > "$file"
echo "REPOSITORY: $repo; REQUIRE: $check + nexus-session-attested + signed GitHub App status + independent review"
echo "RULESET: No direct main pushes/force-push/delete, no bypass. Side branches are NOT protected by this main-only ruleset."
if [[ "$mode" != '--apply' ]]; then echo 'PLAN ONLY. Use --apply after the attestor App and reviewers are configured.'; exit 0; fi
echo "WARNING: This immediately blocks direct main updates and merges lacking an attestation."
read -r -p "Enter exact repository name to activate ruleset: " approval
[[ "$approval" == "$repo" ]] || { echo 'Not confirmed'; exit 5; }
gh api -X POST "repos/$repo/rulesets" --input "$file" --jq '{id,name,enforcement}'
echo "ENFORCEMENT REQUESTED. Verify effective rulesets, approvals and a rejected unauthorized push independently."
