#!/usr/bin/env bash
# Checkpoint A1: local (dev) Postgres is up and app databases exist.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
cd "$ROOT"
# shellcheck source=load-pg-env.sh
source "$SCRIPT_DIR/load-pg-env.sh"
require_postgres_creds

USER="$POSTGRES_USER"
PASS="$POSTGRES_PASSWORD"
HOST="$INTERNAL_POSTGRES_HOST"
PORT="$INTERNAL_POSTGRES_PORT"
GQL_DB="${GRAPHQL_DATABASE_NAME:-lissner}"
MEDIA_DB="${MEDIA_DATABASE_NAME:-media}"
export PGPASSWORD="$PASS"

run_psql() {
  local db="$1"
  shift
  if command -v psql >/dev/null 2>&1; then
    psql -h "$HOST" -p "$PORT" -U "$USER" -d "$db" "$@"
  else
    bash scripts/docker-compose-dev.sh exec -T -e PGPASSWORD="$PASS" postgres \
      psql -U "$USER" -d "$db" "$@"
  fi
}

run_ready() {
  if command -v pg_isready >/dev/null 2>&1; then
    pg_isready -h "$HOST" -p "$PORT" -U "$USER"
  else
    bash scripts/docker-compose-dev.sh exec -T postgres \
      pg_isready -U "$USER" -d postgres
  fi
}

echo "==> pg_isready (${HOST}:${PORT})"
run_ready

echo "==> SELECT version()"
run_psql postgres -c "SELECT version();"

echo "==> databases"
run_psql postgres -Atc \
  "SELECT datname FROM pg_database WHERE datname IN ('${GQL_DB}','${MEDIA_DB}') ORDER BY 1;"

for db in "$GQL_DB" "$MEDIA_DB"; do
  found="$(run_psql postgres -Atc \
    "SELECT 1 FROM pg_database WHERE datname = '$db'")"
  if [[ "$found" != "1" ]]; then
    echo "FAIL: database '$db' missing" >&2
    exit 1
  fi
done

echo "OK: checkpoint A1 passed (${GQL_DB} + ${MEDIA_DB} present)"
