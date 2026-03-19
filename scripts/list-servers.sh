#!/usr/bin/env bash
# List running processes for this project's dev stack and listeners on common ports.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
echo "Family Image Manager – server-related processes"
echo "Project: $ROOT"
echo ""

echo "=== Matching command lines (PID and args) ==="
# Bracket trick avoids grep matching itself
if ps -eo pid=,args= 2>/dev/null | grep -E '[t]sx watch server/src/index|[t]sx server/src/index|[v]ite.*ui/vite\.config|[n]ode .*server/dist/index|[o]llama serve|[c]oncurrently' | sed 's/^/  /'; then
  :
else
  echo "  (none matched)"
fi

echo ""
echo "=== TCP listeners on ports 3000 (API) and 5173 (Vite) ==="
if command -v ss >/dev/null 2>&1; then
  ss -tlnp 2>/dev/null | grep -E ':3000|:5173' || echo "  (no listeners on 3000/5173)"
elif command -v lsof >/dev/null 2>&1; then
  lsof -iTCP:3000 -iTCP:5173 -sTCP:LISTEN -n -P 2>/dev/null || echo "  (no listeners on 3000/5173)"
else
  echo "  (install ss or lsof to show port listeners)"
fi

echo ""
