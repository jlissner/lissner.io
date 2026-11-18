#!/usr/bin/env bash
# List running processes for this project's dev stack and listeners on common ports.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

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

echo "Family Image Manager – server-related processes"
echo "Project: $ROOT"
echo ""

echo "=== Matching command lines (PID and args) ==="
# Bracket trick avoids grep matching itself
if ps -eo pid=,args= 2>/dev/null | grep -E \
  '[n]ode .*scripts/dev-(watch|server|graphql)\.mjs|[t]sx.*(watch )?packages/(server|graphql)|[v]ite.*packages/(pics|admin)|[n]ode .*packages/(server|graphql)/dist|[c]oncurrently|[o]llama serve' \
  | sed 's/^/  /'; then
  :
else
  echo "  (none matched)"
fi

SERVER_PORT="$(env_get SERVER_PORT)"
VITE_PICS_UI_PORT="$(env_get VITE_PICS_UI_PORT)"
VITE_ADMIN_UI_PORT="$(env_get VITE_ADMIN_UI_PORT)"
VITE_GRAPHQL_PORT="$(env_get VITE_GRAPHQL_PORT)"

PORTS=()
LABEL_PARTS=()
add_port() {
  local port="$1" label="$2"
  [[ -n "$port" ]] || return 0
  PORTS+=("$port")
  LABEL_PARTS+=("${port} (${label})")
}

add_port "$SERVER_PORT" "API"
add_port "$VITE_PICS_UI_PORT" "pics Vite"
add_port "$VITE_ADMIN_UI_PORT" "admin Vite"
add_port "$VITE_GRAPHQL_PORT" "GraphQL"

echo ""
if [[ ${#PORTS[@]} -eq 0 ]]; then
  echo "=== TCP listeners ==="
  echo "  (no SERVER_PORT / VITE_* ports in config/.env.local or config/.env)"
else
  echo "=== TCP listeners on ${LABEL_PARTS[*]} ==="
  port_re="$(printf '|:%s' "${PORTS[@]}" | sed 's/^|//')"
  if command -v ss >/dev/null 2>&1; then
    ss -tlnp 2>/dev/null | grep -E "$port_re" || echo "  (no listeners on ${PORTS[*]})"
  elif command -v lsof >/dev/null 2>&1; then
    lsof_args=()
    for port in "${PORTS[@]}"; do
      lsof_args+=(-iTCP:"$port")
    done
    lsof "${lsof_args[@]}" -sTCP:LISTEN -n -P 2>/dev/null || echo "  (no listeners on ${PORTS[*]})"
  else
    echo "  (install ss or lsof to show port listeners)"
  fi
fi

echo ""
