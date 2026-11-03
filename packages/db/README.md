# Database (`@lissner/db`)

Local **Postgres 16** for the monorepo. One Compose instance, **databases**:

| Database (default name) | Purpose                           | Consumers                                                  |
| ----------------------- | --------------------------------- | ---------------------------------------------------------- |
| `lissner`               | PostGraphile / GraphQL app schema | `@lissner/graphql` (`GRAPHQL_DATABASE_NAME`)               |
| `media`                 | Family media + API auth           | `@lissner/server` (`MEDIA_DATABASE_NAME`)                  |
| `media_test`            | Isolated Vitest media DB          | `@lissner/server` tests (`MEDIA_DATABASE_NAME=media_test`) |

Connection config (gitignored env):

```text
POSTGRES_SERVER_URL=postgres://USER:PASSWORD@127.0.0.1:5433?sslmode=disable
GRAPHQL_DATABASE_NAME=lissner
MEDIA_DATABASE_NAME=media
```

`POSTGRES_SERVER_URL` must **not** include a database path. Apps build full URLs with `buildDatabaseUrl` from `@lissner/shared`.

Docker services: host `postgres`, port `5432`, same names.

## Credentials (no defaults)

`POSTGRES_USER` and `POSTGRES_PASSWORD` are **required** for Compose init/scripts. They are never defaulted.

Set them (and `POSTGRES_SERVER_URL`) in gitignored `config/.env.local` and/or `config/.env.prod`. Db scripts load those files; if a value is still missing and stdin is a TTY, they prompt.

## Quick start (checkpoint A1)

```bash
npm run db:up
npm run db:checkpoint
```

## Phase A — localize GraphQL DB

1. **`npm run db:up`**
2. **`npm run db:dump-remote`** — `REMOTE_DATABASE_URL` (full URL including remote DB name; `sslmode=require` for libpq)
3. **`npm run db:restore-local`** — roles + dump into local GraphQL DB name
4. Set `POSTGRES_SERVER_URL` + `GRAPHQL_DATABASE_NAME`
5. Smoke GraphQL

## Media DB

1. ADR 0007
2. **`npm run db:migrate:media`** (also for `MEDIA_DATABASE_NAME=media_test` before Vitest)
3. Set `POSTGRES_SERVER_URL` + `MEDIA_DATABASE_NAME` (required in all environments)

## Scripts

| npm script         | What it does                         |
| ------------------ | ------------------------------------ |
| `db:up`            | `docker compose up -d postgres`      |
| `db:down`          | Stop Postgres container              |
| `db:checkpoint`    | A1: version + list databases         |
| `db:dump-remote`   | `pg_dump` + roles → `data/db-dumps/` |
| `db:restore-local` | Roles + dump → local GraphQL DB      |
| `db:migrate:media` | Apply `migrations/media/*.sql`       |

## Init note

`docker/init-databases.sh` creates `lissner`, `media`, and `media_test` on a fresh volume. To re-init:

```bash
bash scripts/docker-compose.sh down
docker volume rm lissnerio_postgres-data
npm run db:up
```

## Backups

S3 sync uploads `media_*.dump` via `pg_dump`. Admin restore uses `pg_restore` on those dumps only.
