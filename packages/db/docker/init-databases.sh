#!/usr/bin/env bash
# Runs once on empty Postgres data volume (docker-entrypoint-initdb.d).
# Creates app databases: GraphQL (`lissner`), media API (`media`), Vitest (`media_test`).
set -euo pipefail

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
	CREATE DATABASE lissner;
	CREATE DATABASE media;
	CREATE DATABASE media_test;
EOSQL

echo "init-databases: created databases lissner, media, and media_test"
