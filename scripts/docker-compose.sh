#!/usr/bin/env bash
# Run docker compose from the repo root with config/compose + config env files.
# Compose also auto-loads `.env` from --project-directory when present for
# `${…}` substitution. When `config/.env.prod` exists, we pass
# `--env-file config/.env.prod` so those variables participate in the same
# substitution (${ACME_EMAIL}, ${TRAEFIK_RULE}, …).
# Runtime env for the Node app is separate; see `packages/server/src/config/env.ts`.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

COMPOSE_FILE="$ROOT/config/docker-compose.yml"
EXTRA=(-f "$COMPOSE_FILE" --project-directory "$ROOT")

if [[ -f "$ROOT/config/.env" ]]; then
  EXTRA+=(--env-file "$ROOT/config/.env")
fi
if [[ -f "$ROOT/config/.env.prod" ]]; then
  EXTRA+=(--env-file "$ROOT/config/.env.prod")
fi

exec docker compose "${EXTRA[@]}" "$@"
