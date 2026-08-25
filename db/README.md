# Database Overview

Postgres v16.13
Postgraphile v5 (see `graphql/`)

- hosted at https://query.lissner.io via Traefik

There are two databases:

- dev: test-db-test.lissner.io:5432
- prod: db.lissner.io:5432

Both require TLS. In `DATABASE_URL`, use `sslmode=no-verify` for local/dev clients (pg native), or `sslmode=verify-full` with the RDS CA bundle in production.

## Getting started

Ubuntu v24

`$ ./start.sh`

This will

1. install postgres if it isn't already installed
1. create a prod database
1. create a dev database
