#!/usr/bin/env bash
# Checkpoint A1: local Postgres is up and both app databases exist.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
cd "$ROOT"
# shellcheck source=load-pg-env.sh
source "$SCRIPT_DIR/load-pg-env.sh"
require_postgres_creds

USER="$POSTGRES_USER"
PASS="$POSTGRES_PASSWORD"
HOST="$POSTGRES_HOST"
PORT="$POSTGRES_PORT"
export PGPASSWORD="$PASS"

run_psql() {
  local db="$1"
  shift
  if command -v psql >/dev/null 2>&1; then
    psql -h "$HOST" -p "$PORT" -U "$USER" -d "$db" "$@"
  else
    bash scripts/docker-compose.sh exec -T -e PGPASSWORD="$PASS" postgres \
      psql -U "$USER" -d "$db" "$@"
  fi
}

run_ready() {
  if command -v pg_isready >/dev/null 2>&1; then
    pg_isready -h "$HOST" -p "$PORT" -U "$USER"
  else
    bash scripts/docker-compose.sh exec -T postgres \
      pg_isready -U "$USER" -d postgres
  fi
}

echo "==> pg_isready"
run_ready

echo "==> SELECT version()"
run_psql postgres -c "SELECT version();"

echo "==> databases"
run_psql postgres -Atc \
  "SELECT datname FROM pg_database WHERE datname IN ('lissner','media') ORDER BY 1;"

for db in lissner media; do
  found="$(run_psql postgres -Atc \
    "SELECT 1 FROM pg_database WHERE datname = '$db'")"
  if [[ "$found" != "1" ]]; then
    echo "FAIL: database '$db' missing" >&2
    exit 1
  fi
done

echo "OK: checkpoint A1 passed (lissner + media present)"
