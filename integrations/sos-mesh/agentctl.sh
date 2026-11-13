#!/usr/bin/env bash
# Cryptic ↔ NEXUS agent controller. Secrets stay in a mode-600 file and are never printed.
set +e
umask 077

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="${AE_ROOT:-$HOME/Æ}"
STATE_DIR="$HOME/.local/state/cryptic-mesh"
CONFIG_DIR="$HOME/.config/cryptic-mesh"
ENV_FILE="$CONFIG_DIR/agent.env"
PID_FILE="$STATE_DIR/agent.pid"
LOG_FILE="$ROOT/logs/cryptic-mesh-agent.log"
LEDGER_FILE="$ROOT/docs/LEDGER.txt"
MESH_URL="https://cryptic-sos-mesh.saytyarnornglorei.workers.dev"
AGENT_ID="nexus-local-01"
POLL_MS="5000"

mkdir -p "$ROOT/bin" "$ROOT/logs" "$ROOT/docs" "$STATE_DIR" "$CONFIG_DIR" || exit 1
chmod 700 "$CONFIG_DIR" "$STATE_DIR" 2>/dev/null

ledger() {
  printf '[%s] CRYPTIC_MESH_AGENT %s\n' "$(date -Iseconds 2>/dev/null || date)" "$*" >> "$LEDGER_FILE"
}

need_tools() {
  for tool in git node npm openssl; do
    command -v "$tool" >/dev/null 2>&1 || {
      printf 'Missing required command: %s\n' "$tool"
      printf 'Install Git, Node.js/npm, and OpenSSL, then rerun.\n'
      return 1
    }
  done
  return 0
}

install_dependencies() {
  cd "$SCRIPT_DIR" || return 1
  npm install --no-audit --no-fund || return 1
  node --check "$SCRIPT_DIR/agent.mjs" || return 1
  node --check "$SCRIPT_DIR/worker.mjs" || return 1
  return 0
}

ensure_wrangler_auth() {
  cd "$SCRIPT_DIR" || return 1
  if npx wrangler whoami >/dev/null 2>&1; then return 0; fi
  printf 'Wrangler is not authenticated. Starting the Cloudflare login flow…\n'
  npx wrangler login
  return $?
}

read_secret() {
  [ -s "$ENV_FILE" ] || return 1
  sed -n 's/^CRYPTIC_MESH_AGENT_SECRET=//p' "$ENV_FILE" | head -n 1
}

write_env() {
  local secret="$1"
  [ "${#secret}" -ge 32 ] || return 1
  printf 'CRYPTIC_MESH_URL=%s\nCRYPTIC_MESH_AGENT_SECRET=%s\nCRYPTIC_MESH_AGENT_ID=%s\nCRYPTIC_MESH_POLL_MS=%s\n' \
    "$MESH_URL" "$secret" "$AGENT_ID" "$POLL_MS" > "$ENV_FILE" || return 1
  chmod 600 "$ENV_FILE"
}

upload_secret() {
  local secret="$1"
  cd "$SCRIPT_DIR" || return 1
  printf '%s' "$secret" | npx wrangler secret put AGENT_HMAC_SECRET --config "$SCRIPT_DIR/wrangler.jsonc"
  return $?
}

is_running() {
  [ -s "$PID_FILE" ] || return 1
  local pid command_line
  pid="$(cat "$PID_FILE" 2>/dev/null)"
  [ -n "$pid" ] || return 1
  kill -0 "$pid" 2>/dev/null || return 1
  command_line="$(ps -p "$pid" -o args= 2>/dev/null)"
  case "$command_line" in
    *"$SCRIPT_DIR/agent.mjs"*) return 0 ;;
    *) return 1 ;;
  esac
}

start_agent() {
  if is_running; then
    printf 'NEXUS agent already running (PID %s).\n' "$(cat "$PID_FILE")"
    return 0
  fi
  local secret
  secret="$(read_secret)"
  [ "${#secret}" -ge 32 ] || {
    printf 'Agent secret is not configured. Run: cryptic-mesh-agentctl setup\n'
    return 1
  }

  cd "$SCRIPT_DIR" || return 1
  nohup env \
    CRYPTIC_MESH_URL="$MESH_URL" \
    CRYPTIC_MESH_AGENT_SECRET="$secret" \
    CRYPTIC_MESH_AGENT_ID="$AGENT_ID" \
    CRYPTIC_MESH_POLL_MS="$POLL_MS" \
    node "$SCRIPT_DIR/agent.mjs" >> "$LOG_FILE" 2>&1 </dev/null &
  local pid=$!
  printf '%s\n' "$pid" > "$PID_FILE"
  sleep 1
  if kill -0 "$pid" 2>/dev/null; then
    printf 'NEXUS mesh agent running (PID %s).\n' "$pid"
    ledger "started pid=$pid"
    return 0
  fi
  rm -f "$PID_FILE"
  printf 'Agent failed to start. Recent log output:\n'
  tail -n 30 "$LOG_FILE" 2>/dev/null
  ledger "start_failed"
  return 1
}

stop_agent() {
  if ! is_running; then
    rm -f "$PID_FILE"
    printf 'NEXUS mesh agent is already stopped.\n'
    return 0
  fi
  local pid
  pid="$(cat "$PID_FILE")"
  kill "$pid" 2>/dev/null
  sleep 1
  if kill -0 "$pid" 2>/dev/null; then
    kill -TERM "$pid" 2>/dev/null
    sleep 1
  fi
  if kill -0 "$pid" 2>/dev/null; then
    printf 'Agent did not stop cleanly; PID %s remains active.\n' "$pid"
    return 1
  fi
  rm -f "$PID_FILE"
  ledger "stopped pid=$pid"
  printf 'NEXUS mesh agent stopped.\n'
}

status_agent() {
  if is_running; then
    printf 'RUNNING pid=%s\n' "$(cat "$PID_FILE")"
  else
    rm -f "$PID_FILE"
    printf 'STOPPED\n'
  fi
  printf 'Log: %s\n' "$LOG_FILE"
  tail -n 8 "$LOG_FILE" 2>/dev/null
}

setup_agent() {
  need_tools || return 1
  install_dependencies || return 1
  ensure_wrangler_auth || return 1

  local secret
  secret="$(read_secret)"
  if [ "${#secret}" -lt 32 ]; then
    secret="$(openssl rand -base64 48 | tr -d '\n')"
    [ "${#secret}" -ge 32 ] || return 1
    write_env "$secret" || return 1
    printf 'Created a new local agent secret in the protected config directory.\n'
  else
    write_env "$secret" || return 1
    printf 'Reusing the existing local agent secret.\n'
  fi

  upload_secret "$secret" || {
    printf 'Cloudflare secret upload failed; agent was not started.\n'
    return 1
  }
  printf 'Cloudflare Worker secret updated.\n'
  start_agent
}

rotate_secret() {
  need_tools || return 1
  install_dependencies || return 1
  ensure_wrangler_auth || return 1
  stop_agent
  local secret
  secret="$(openssl rand -base64 48 | tr -d '\n')"
  [ "${#secret}" -ge 32 ] || return 1
  write_env "$secret" || return 1
  upload_secret "$secret" || return 1
  ledger "secret_rotated"
  printf 'Agent secret rotated in the local protected file and Cloudflare Worker.\n'
  start_agent
}

install_launcher() {
  chmod +x "$SCRIPT_DIR/agentctl.sh"
  ln -sfn "$SCRIPT_DIR/agentctl.sh" "$ROOT/bin/cryptic-mesh-agentctl"
  mkdir -p "$HOME/.nexus/bin"
  ln -sfn "$SCRIPT_DIR/agentctl.sh" "$HOME/.nexus/bin/cryptic-mesh-agentctl"
}

install_launcher

case "${1:-status}" in
  setup) setup_agent ;;
  start) start_agent ;;
  stop) stop_agent ;;
  restart) stop_agent; start_agent ;;
  status) status_agent ;;
  rotate-secret) rotate_secret ;;
  *)
    printf 'Usage: cryptic-mesh-agentctl {setup|start|stop|restart|status|rotate-secret}\n'
    exit 2
    ;;
esac
