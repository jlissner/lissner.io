#!/usr/bin/env bash
# Runs once on empty Postgres data volume (docker-entrypoint-initdb.d).
# Creates the two app databases: GraphQL/PostGraphile (`lissner`) and media/API (`media`).
set -euo pipefail

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
	CREATE DATABASE lissner;
	CREATE DATABASE media;
EOSQL

echo "init-databases: created databases lissner and media"
