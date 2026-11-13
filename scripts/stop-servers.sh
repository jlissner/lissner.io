#!/usr/bin/env bash
# Stop local Family Image Manager processes started via npm run dev*.
# Does not touch Docker Compose services (use db:down / host:down for those)
# or system/root-owned ollama.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
UID_NOW="$(id -u)"

env_get() {
  local key="$1" file value=""
  for file in "$ROOT/config/.env.local" "$ROOT/config/.env"; do
    [[ -f "$file" ]] || continue
    value="$(grep -E "^${key}=" "$file" | tail -1 | cut -d= -f2- | tr -d '\r"' || true)"
    if [[ -n "$value" ]]; then
      printf '%s' "$value"
      return 0
    fi
  done
  printf ''
}

unique_pids() {
  printf '%s\n' "$@" | grep -E '^[0-9]+$' | sort -u
}

pids_matching() {
  local pattern="$1"
  ps -eo pid=,uid=,args= 2>/dev/null \
    | awk -v uid="$UID_NOW" -v re="$pattern" '
        $2 == uid {
          line = $0
          sub(/^[[:space:]]*[0-9]+[[:space:]]+[0-9]+[[:space:]]+/, "", line)
          if (line ~ re) print $1
        }
      ' \
    || true
}

pids_on_port() {
  local port="$1"
  [[ -n "$port" ]] || return 0
  if command -v ss >/dev/null 2>&1; then
    ss -tlnp 2>/dev/null \
      | grep -E ":${port}\\b" \
      | grep -oE 'pid=[0-9]+' \
      | cut -d= -f2 \
      || true
  elif command -v lsof >/dev/null 2>&1; then
    lsof -tiTCP:"${port}" -sTCP:LISTEN 2>/dev/null || true
  fi
}

owned_by_us() {
  local pid="$1" uid
  [[ -r "/proc/${pid}/status" ]] || return 1
  uid="$(awk '/^Uid:/{print $2}' "/proc/${pid}/status" 2>/dev/null || true)"
  [[ "$uid" == "$UID_NOW" ]]
}

signal_pids() {
  local signal="$1"
  shift
  local pid
  for pid in "$@"; do
    if kill -0 "$pid" 2>/dev/null; then
      kill "-${signal}" "$pid" 2>/dev/null || true
    fi
  done
}

# Repo-scoped command lines plus user-owned ollama serve from npm run dev.
PATTERN="${ROOT}/scripts/dev-(watch|server|graphql)\\.mjs|\\.\\./\\.\\./scripts/dev-(server|graphql)\\.mjs|${ROOT}/node_modules/\\.bin/(vite|concurrently)|${ROOT}/node_modules/tsx/dist/cli\\.mjs watch packages/(server|graphql)|node .*packages/(server|graphql)/dist|ollama serve"

mapfile -t MATCH_PIDS < <(unique_pids $(pids_matching "$PATTERN"))

PORTS=(
  "$(env_get SERVER_PORT)"
  "$(env_get VITE_PICS_UI_PORT)"
  "$(env_get VITE_ADMIN_UI_PORT)"
  "$(env_get VITE_GRAPHQL_PORT)"
)

PORT_PIDS=()
for port in "${PORTS[@]}"; do
  [[ -n "$port" ]] || continue
  mapfile -t found < <(pids_on_port "$port")
  PORT_PIDS+=("${found[@]}")
done

CANDIDATES=()
for pid in $(unique_pids "${MATCH_PIDS[@]}" "${PORT_PIDS[@]}"); do
  if owned_by_us "$pid"; then
    CANDIDATES+=("$pid")
  fi
done

mapfile -t ALL_PIDS < <(unique_pids "${CANDIDATES[@]}")

if [[ ${#ALL_PIDS[@]} -eq 0 ]]; then
  echo "No local Family Image Manager servers found."
  exit 0
fi

echo "Stopping ${#ALL_PIDS[@]} process(es): ${ALL_PIDS[*]}"
signal_pids TERM "${ALL_PIDS[@]}"

deadline=$((SECONDS + 3))
alive=()
while ((SECONDS < deadline)); do
  alive=()
  for pid in "${ALL_PIDS[@]}"; do
    if kill -0 "$pid" 2>/dev/null; then
      alive+=("$pid")
    fi
  done
  if [[ ${#alive[@]} -eq 0 ]]; then
    echo "Stopped."
    exit 0
  fi
  sleep 0.1
done

mapfile -t STILL < <(unique_pids "${alive[@]}")
if [[ ${#STILL[@]} -gt 0 ]]; then
  echo "Force-killing: ${STILL[*]}"
  signal_pids KILL "${STILL[@]}"
fi

echo "Stopped."
