#!/usr/bin/env bash
# Phase A2: restore roles + custom-format dump into local `lissner` database.
# Applies lissner-remote-roles.sql first (PostGraphile needs roles like `unauthorized`).
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
GQL_DB="${VITE_GRAPHQL_DATABASE_NAME:-lissner}"
DUMP="${1:-data/db-dumps/lissner-remote.dump}"
ROLES="${2:-data/db-dumps/lissner-remote-roles.sql}"
export PGPASSWORD="$PASS"

if [[ ! -f "$DUMP" ]]; then
  echo "Dump not found: $DUMP (run npm run db:dump-remote first)" >&2
  exit 1
fi

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

run_psql_file() {
  local db="$1"
  local file="$2"
  if command -v psql >/dev/null 2>&1; then
    psql -h "$HOST" -p "$PORT" -U "$USER" -d "$db" -v ON_ERROR_STOP=0 -f "$file"
  else
    bash scripts/docker-compose-dev.sh exec -T -e PGPASSWORD="$PASS" postgres \
      psql -U "$USER" -d "$db" -v ON_ERROR_STOP=0 <"$file"
  fi
}

if [[ -f "$ROLES" ]]; then
  echo "==> apply roles from $ROLES (ignores already-exists / RDS-only noise)"
  run_psql_file postgres "$ROLES" || true
else
  echo "WARN: roles file missing ($ROLES). Re-run npm run db:dump-remote for roles." >&2
  echo "WARN: PostGraphile needs at least role \"unauthorized\"." >&2
fi

echo "==> drop/recreate local ${GQL_DB} (destructive for dev Postgres only)"
run_psql postgres -v ON_ERROR_STOP=1 -v db="$GQL_DB" -v owner="$USER" <<-EOSQL
	SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = :'db' AND pid <> pg_backend_pid();
	SELECT format('DROP DATABASE IF EXISTS %I', :'db') \gexec
	SELECT format('CREATE DATABASE %I OWNER %I', :'db', :'owner') \gexec
EOSQL

echo "==> pg_restore → ${GQL_DB} from $DUMP (preserves ACLs; --no-owner)"
if command -v pg_restore >/dev/null 2>&1; then
  pg_restore --no-owner \
    --dbname="postgres://${USER}:${PASS}@${HOST}:${PORT}/${GQL_DB}" "$DUMP" || true
else
  bash scripts/docker-compose-dev.sh exec -T -e PGPASSWORD="$PASS" postgres \
    pg_restore --no-owner -U "$USER" -d "$GQL_DB" <"$DUMP" || true
fi

echo "==> grant non-superuser roles to ${USER} (SET ROLE for PostGraphile)"
run_psql postgres -v ON_ERROR_STOP=1 <<-EOSQL
	DO \$\$
	DECLARE
	  r text;
	BEGIN
	  FOR r IN
	    SELECT rolname
	    FROM pg_roles
	    WHERE NOT rolsuper
	      AND rolname <> current_user
	      AND rolname NOT LIKE 'pg_%'
	      AND rolname NOT IN ('postgres')
	  LOOP
	    BEGIN
	      EXECUTE format('GRANT %I TO %I', r, current_user);
	    EXCEPTION
	      WHEN OTHERS THEN
	        RAISE NOTICE 'skip GRANT % to %: %', r, current_user, SQLERRM;
	    END;
	  END LOOP;
	END
	\$\$;
EOSQL

run_psql "$GQL_DB" -c \
  "SELECT COUNT(*) AS table_count FROM information_schema.tables WHERE table_schema = 'public';"
run_psql postgres -c \
  "SELECT 1 AS unauthorized_ok FROM pg_roles WHERE rolname = 'unauthorized';"

echo "OK: restore finished. Set EXPOSED_POSTGRES_* + VITE_GRAPHQL_DATABASE_NAME=${GQL_DB} and smoke GraphQL."
