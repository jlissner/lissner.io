#!/usr/bin/env bash
# Dev Postgres Compose (project lissnerio-dev). Does not touch the prod host stack.
# Prefer: npm run db:up / db:down
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

COMPOSE_FILE="$ROOT/config/docker-compose.dev.yml"
EXTRA=(
  -f "$COMPOSE_FILE"
  --project-name lissnerio-dev
  --project-directory "$ROOT"
)

if [[ -f "$ROOT/config/.env" ]]; then
  EXTRA+=(--env-file "$ROOT/config/.env")
fi
if [[ -f "$ROOT/config/.env.local" ]]; then
  EXTRA+=(--env-file "$ROOT/config/.env.local")
fi

exec docker compose "${EXTRA[@]}" "$@"
