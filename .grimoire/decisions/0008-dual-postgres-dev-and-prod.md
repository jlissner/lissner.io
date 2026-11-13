---
status: accepted
date: 2026-11-06
decision-makers: [joe]
---

# Dual Postgres instances for dev and on-machine prod

## Context and Problem Statement

This machine runs both local development (`npm run dev`) and an on-machine Compose “prod” stack (`npm run host`). Both previously shared one Compose project and one `postgres-data` volume, so wiping or recreating “local” Postgres could destroy on-machine prod data. Env alone (ports / DB names) does not isolate two servers.

## Decision Drivers

- Safe local resets without touching on-machine prod data
- Clear lifecycle ownership: `dev` / `db:*` vs `host`
- Keep existing prod volume (`lissnerio_postgres-data`) intact

## Considered Options

1. Keep one Postgres; isolate only by database names (`dev-media` vs `media`)
2. Two Compose projects / volumes / host ports (dev + prod)
3. Use system/snap Postgres for dev and Compose only for prod

## Decision Outcome

Chosen option: **2**, because volume isolation is the only reliable guarantee on a shared host.

| Lifecycle              | Compose                         | Project         | `INTERNAL_POSTGRES_PORT` | `EXPOSED_POSTGRES_*` | Volume                        |
| ---------------------- | ------------------------------- | --------------- | ------------------------ | -------------------- | ----------------------------- |
| `npm run dev` / `db:*` | `config/docker-compose.dev.yml` | `lissnerio-dev` | 5432                     | `127.0.0.1:5432`     | `lissnerio-dev_postgres-data` |
| `npm run host`         | `config/docker-compose.yml`     | `lissnerio`     | 5433                     | `postgres:5432`      | `lissnerio_postgres-data`     |

Apps connect with `EXPOSED_POSTGRES_HOST` / `EXPOSED_POSTGRES_PORT` + user/password + DB name via `buildDatabaseUrl`. Host tools and Compose `ports:` use `INTERNAL_POSTGRES_*`.

Clarifies ADR 0007: “one Compose instance” applied to the **local-first migration path**, not to single-machine dual lifecycle forever.

### Consequences

- Good: `docker volume rm lissnerio-dev_postgres-data` is a local-only reset; prod volume stays
- Good: `npm run db:up` cannot stop or recreate prod Postgres
- Bad: two containers to monitor; port 5432 must not be taken by snap/system Postgres

### Cost of Ownership

- **Maintenance burden**: second compose file + `scripts/docker-compose-dev.sh`
- **Ongoing benefits**: safe local rebuilds; clearer mental model
- **Sunset criteria**: revisit if prod moves fully off this machine

### Confirmation

- `npm run db:up` creates/uses project `lissnerio-dev` only
- `npm run host:status` shows prod `postgres` on project `lissnerio`
- Host binds: dev `:5432`, prod `:5433`
- Prod containers connect via `EXPOSED_POSTGRES_HOST=postgres` (not `127.0.0.1`)
