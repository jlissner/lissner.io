#!/usr/bin/env bash
# Shared env loader for db scripts. Source this file; do not execute it.
# Loads gitignored config env files without overriding the shell, then
# ensures required credentials exist (prompt if TTY, else fail).
#
# Usage:
#   ROOT=... source packages/db/scripts/load-pg-env.sh
#   require_postgres_creds   # POSTGRES_USER + POSTGRES_PASSWORD
#   require_remote_url       # REMOTE_DATABASE_URL or DATABASE_URL

_db_load_env_file() {
  local file="$1"
  [[ -f "$file" ]] || return 0
  local line key val
  while IFS= read -r line || [[ -n "$line" ]]; do
    line="${line#"${line%%[![:space:]]*}"}"
    [[ -z "$line" || "$line" == \#* ]] && continue
    [[ "$line" == export\ * ]] && line="${line#export }"
    key="${line%%=*}"
    val="${line#*=}"
    [[ "$key" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]] || continue
    # Strip optional surrounding quotes
    if [[ "$val" =~ ^\".*\"$ ]]; then
      val="${val:1:${#val}-2}"
    elif [[ "$val" =~ ^\'.*\'$ ]]; then
      val="${val:1:${#val}-2}"
    fi
    # Do not override vars already set in the shell
    if [[ -z "${!key+x}" ]]; then
      printf -v "$key" '%s' "$val"
      export "$key"
    fi
  done <"$file"
}

_db_load_config_env() {
  local root="${ROOT:-}"
  if [[ -z "$root" ]]; then
    echo "load-pg-env: ROOT must be set before sourcing" >&2
    return 1
  fi
  _db_load_env_file "$root/config/.env"
  if [[ "${NODE_ENV:-}" == "production" ]]; then
    _db_load_env_file "$root/config/.env.prod"
  else
    _db_load_env_file "$root/config/.env.local"
    # Compose / host scripts often only have .env.prod for secrets
    _db_load_env_file "$root/config/.env.prod"
  fi
}

_db_prompt() {
  local var_name="$1"
  local prompt="$2"
  local secret="${3:-0}"
  local value=""
  if [[ ! -t 0 ]]; then
    return 1
  fi
  if [[ "$secret" == "1" ]]; then
    read -r -s -p "$prompt" value
    echo >&2
  else
    read -r -p "$prompt" value
  fi
  export "$var_name=$value"
}

require_postgres_creds() {
  _db_load_config_env

  if [[ -z "${POSTGRES_USER:-}" ]]; then
    _db_prompt POSTGRES_USER "Postgres user: " || true
  fi
  if [[ -z "${POSTGRES_PASSWORD:-}" ]]; then
    _db_prompt POSTGRES_PASSWORD "Postgres password: " 1 || true
  fi

  if [[ -z "${POSTGRES_USER:-}" || -z "${POSTGRES_PASSWORD:-}" ]]; then
    echo "POSTGRES_USER and POSTGRES_PASSWORD are required." >&2
    echo "Set them in config/.env.local or config/.env.prod (gitignored), or enter when prompted." >&2
    return 1
  fi

  export POSTGRES_HOST="${POSTGRES_HOST:-127.0.0.1}"
  export POSTGRES_PORT="${POSTGRES_PORT:-5433}"
}

require_remote_url() {
  _db_load_config_env

  if [[ -z "${REMOTE_DATABASE_URL:-}" && -z "${DATABASE_URL:-}" ]]; then
    _db_prompt REMOTE_DATABASE_URL \
      "Remote DATABASE_URL (use sslmode=require for pg_dump, not no-verify): " || true
  fi

  if [[ -z "${REMOTE_DATABASE_URL:-}" && -z "${DATABASE_URL:-}" ]]; then
    echo "REMOTE_DATABASE_URL (or DATABASE_URL) is required for dump-remote." >&2
    echo "Set it in a gitignored env file, export it, or enter when prompted." >&2
    echo "Note: libpq/pg_dump rejects sslmode=no-verify — use sslmode=require." >&2
    return 1
  fi
}
