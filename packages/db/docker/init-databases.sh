#!/usr/bin/env bash
# Runs once on empty Postgres data volume (docker-entrypoint-initdb.d).
# Creates app databases from env (defaults: lissner, media, media_test).
set -euo pipefail

graphql_db="${GRAPHQL_DATABASE_NAME:-lissner}"
media_db="${MEDIA_DATABASE_NAME:-media}"
media_test_db="${MEDIA_TEST_DATABASE_NAME:-media_test}"

valid_name='^[A-Za-z_][A-Za-z0-9_-]*$'
for name in "$graphql_db" "$media_db" "$media_test_db"; do
  if [[ ! "$name" =~ $valid_name ]]; then
    echo "init-databases: invalid database name: $name" >&2
    exit 1
  fi
done

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
  -v gql="$graphql_db" -v media="$media_db" -v media_test="$media_test_db" <<-EOSQL
	SELECT format('CREATE DATABASE %I', :'gql') \gexec
	SELECT format('CREATE DATABASE %I', :'media') \gexec
	SELECT format('CREATE DATABASE %I', :'media_test') \gexec
EOSQL

echo "init-databases: created databases ${graphql_db}, ${media_db}, and ${media_test_db}"
