#!/usr/bin/env bash
# Phase A2: dump remote GraphQL Postgres (data + cluster roles) into data/db-dumps/.
# Requires: REMOTE_DATABASE_URL (or DATABASE_URL pointing at RDS).
# Roles are cluster-level (e.g. PostGraphile `unauthorized`) and are not in pg_dump alone.
# RDS often denies pg_dumpall (pg_authid); we fall back to pg_roles (no passwords).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
cd "$ROOT"
# shellcheck source=load-pg-env.sh
source "$SCRIPT_DIR/load-pg-env.sh"
require_remote_url

URL="${REMOTE_DATABASE_URL:-$DATABASE_URL}"

mkdir -p data/db-dumps
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT_BASENAME="lissner-remote-${STAMP}.dump"
ROLES_BASENAME="lissner-remote-${STAMP}-roles.sql"
OUT="data/db-dumps/${OUT_BASENAME}"
ROLES_OUT="data/db-dumps/${ROLES_BASENAME}"
LATEST="data/db-dumps/lissner-remote.dump"
LATEST_ROLES="data/db-dumps/lissner-remote-roles.sql"

postgres_image() {
  bash scripts/docker-compose.sh config --images | grep postgres | head -1
}

run_pg_dump() {
  # Keep ACLs (GRANT/REVOKE) — PostGraphile roles need USAGE on schema `app`, etc.
  # Still --no-owner so local POSTGRES_USER owns objects after restore.
  if command -v pg_dump >/dev/null 2>&1; then
    pg_dump --format=custom --no-owner --dbname="$URL" --file="$OUT"
  else
    docker run --rm \
      --network host \
      -v "$ROOT/data/db-dumps:/dumps" \
      "$(postgres_image)" \
      pg_dump --format=custom --no-owner --dbname="$URL" \
      --file="/dumps/${OUT_BASENAME}"
  fi
}

run_psql_remote() {
  if command -v psql >/dev/null 2>&1; then
    psql --dbname="$URL" "$@"
  else
    docker run --rm --network host "$(postgres_image)" \
      psql --dbname="$URL" "$@"
  fi
}

# Emit CREATE ROLE / GRANT from pg_roles (readable on RDS). No passwords.
dump_roles_from_catalog() {
  local tmp
  tmp="$(mktemp)"
  {
    echo "-- Generated from pg_roles / pg_auth_members (RDS-safe; no passwords)."
    echo "-- Safe to re-apply: duplicate_object is ignored."
    echo
    run_psql_remote -v ON_ERROR_STOP=1 -Atq <<'SQL'
SELECT format(
  $fmt$DO $do$
BEGIN
  CREATE ROLE %I WITH NOSUPERUSER INHERIT NOCREATEROLE NOCREATEDB %s NOREPLICATION;
EXCEPTION WHEN duplicate_object THEN NULL;
END
$do$;$fmt$,
  rolname,
  CASE WHEN rolcanlogin THEN 'LOGIN' ELSE 'NOLOGIN' END
)
FROM pg_roles
WHERE rolname NOT LIKE 'pg\_%' ESCAPE '\'
  AND rolname NOT LIKE 'rds%'
  AND rolname <> 'postgres'
ORDER BY rolname;
SQL
    echo
    run_psql_remote -v ON_ERROR_STOP=1 -Atq <<'SQL'
SELECT format(
  $fmt$DO $do$
BEGIN
  GRANT %I TO %I;
EXCEPTION WHEN OTHERS THEN NULL;
END
$do$;$fmt$,
  r.rolname,
  m.rolname
)
FROM pg_auth_members am
JOIN pg_roles r ON r.oid = am.roleid
JOIN pg_roles m ON m.oid = am.member
WHERE r.rolname NOT LIKE 'pg\_%' ESCAPE '\'
  AND m.rolname NOT LIKE 'pg\_%' ESCAPE '\'
  AND r.rolname NOT LIKE 'rds%'
  AND m.rolname NOT LIKE 'rds%'
  AND r.rolname <> 'postgres'
  AND m.rolname <> 'postgres'
ORDER BY r.rolname, m.rolname;
SQL
  } >"$tmp"
  mv "$tmp" "$ROLES_OUT"
}

run_roles_dump() {
  if command -v pg_dumpall >/dev/null 2>&1; then
    if pg_dumpall --roles-only --dbname="$URL" --file="$ROLES_OUT" 2>/tmp/pg_dumpall_roles.err; then
      return 0
    fi
    echo "WARN: pg_dumpall failed (common on RDS: permission denied for pg_authid)." >&2
    echo "WARN: falling back to pg_roles catalog dump (no passwords)." >&2
  else
    if docker run --rm \
      --network host \
      -v "$ROOT/data/db-dumps:/dumps" \
      "$(postgres_image)" \
      pg_dumpall --roles-only --dbname="$URL" \
      --file="/dumps/${ROLES_BASENAME}" 2>/tmp/pg_dumpall_roles.err; then
      return 0
    fi
    echo "WARN: pg_dumpall failed (common on RDS: permission denied for pg_authid)." >&2
    echo "WARN: falling back to pg_roles catalog dump (no passwords)." >&2
  fi
  dump_roles_from_catalog
}

echo "==> pg_dump → $OUT"
run_pg_dump
ln -sfn "$OUT_BASENAME" "$LATEST"

echo "==> roles → $ROLES_OUT"
run_roles_dump
ln -sfn "$ROLES_BASENAME" "$LATEST_ROLES"

if ! grep -q "unauthorized" "$ROLES_OUT" 2>/dev/null; then
  echo "WARN: role \"unauthorized\" not found in roles dump — authenticate may fail until it exists." >&2
fi

echo "OK: wrote $OUT and $ROLES_OUT"
echo "Next: npm run db:restore-local"
