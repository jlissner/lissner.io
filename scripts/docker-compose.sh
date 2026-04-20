#!/usr/bin/env bash
# Run docker compose from the repo root. Compose also auto-loads `.env` (if present)
# for `${…}` substitution. When `.env.prod` exists, we pass `--env-file .env.prod` so
# those variables participate in the same substitution (${ACME_EMAIL}, ${TRAEFIK_RULE}, …).
# Runtime env for the Node app is separate; see `server/src/config/env.ts`.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

EXTRA=()
if [[ -f "$ROOT/.env.prod" ]]; then
  EXTRA+=(--env-file "$ROOT/.env.prod")
fi

exec docker compose "${EXTRA[@]}" "$@"
