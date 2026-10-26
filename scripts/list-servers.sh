#!/usr/bin/env bash
# List running processes for this project's dev stack and listeners on common ports.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
echo "Family Image Manager – server-related processes"
echo "Project: $ROOT"
echo ""

echo "=== Matching command lines (PID and args) ==="
# Bracket trick avoids grep matching itself
if ps -eo pid=,args= 2>/dev/null | grep -E '[t]sx watch packages/server/src/index|[t]sx watch packages/graphql/src/index|[t]sx packages/server/src/index|[v]ite.*pics\.lissner\.io/vite\.config|[n]ode .*packages/server/dist/index|[n]ode scripts/dev-graphql|[o]llama serve|[c]oncurrently' | sed 's/^/  /'; then
  :
else
  echo "  (none matched)"
fi

SERVER_PORT="${SERVER_PORT}"
UI_PORT="${UI_PORT}"
echo ""
echo "=== TCP listeners on ports ${SERVER_PORT} (API) and ${UI_PORT} (Vite) ==="
if command -v ss >/dev/null 2>&1; then
  ss -tlnp 2>/dev/null | grep -E ":${SERVER_PORT}|:${UI_PORT}" || echo "  (no listeners on ${SERVER_PORT}/${UI_PORT})"
elif command -v lsof >/dev/null 2>&1; then
  lsof -iTCP:"${SERVER_PORT}" -iTCP:"${UI_PORT}" -sTCP:LISTEN -n -P 2>/dev/null || echo "  (no listeners on ${SERVER_PORT}/${UI_PORT})"
else
  echo "  (install ss or lsof to show port listeners)"
fi

echo ""
