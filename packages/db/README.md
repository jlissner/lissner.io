# Database (`@lissner/db`)

**Postgres 16** for the monorepo. On a machine that also runs `npm run host`, there are **two** Compose Postgres instances (ADR 0008):

| Lifecycle         | Command                         | Compose                         | Project         | Host bind (`INTERNAL_POSTGRES_PORT`) | Volume                        |
| ----------------- | ------------------------------- | ------------------------------- | --------------- | ------------------------------------ | ----------------------------- |
| Dev               | `npm run db:up` / `npm run dev` | `config/docker-compose.dev.yml` | `lissnerio-dev` | **5432**                             | `lissnerio-dev_postgres-data` |
| Prod (on-machine) | `npm run host`                  | `config/docker-compose.yml`     | `lissnerio`     | **5433**                             | `lissnerio_postgres-data`     |

Databases **inside** each instance (names from env; defaults shown):

| Database (default name) | Purpose                           | Consumers                                    |
| ----------------------- | --------------------------------- | -------------------------------------------- |
| `lissner`               | PostGraphile / GraphQL app schema | `@lissner/graphql` (`GRAPHQL_DATABASE_NAME`) |
| `media`                 | Family media + API auth           | `@lissner/server` (`MEDIA_DATABASE_NAME`)    |
| `media_test`            | Isolated Vitest media DB          | `@lissner/server` tests                      |

## Connection env (gitignored)

Apps (`@lissner/server`, `@lissner/graphql`) build URLs with `buildDatabaseUrl` from:

| Variable                                          | Role                                            |
| ------------------------------------------------- | ----------------------------------------------- |
| `POSTGRES_USER` / `POSTGRES_PASSWORD`             | Credentials (quote password if it contains `#`) |
| `EXPOSED_POSTGRES_HOST` / `EXPOSED_POSTGRES_PORT` | Host/port the **Node process** uses             |
| `GRAPHQL_DATABASE_NAME` / `MEDIA_DATABASE_NAME`   | Database name appended to the URL               |

Host-side tools (`db:checkpoint`, `db:restore-local`, Compose `ports:`) use:

| Variable                                            | Role                                                      |
| --------------------------------------------------- | --------------------------------------------------------- |
| `INTERNAL_POSTGRES_HOST` / `INTERNAL_POSTGRES_PORT` | Published bind on the laptop (`127.0.0.1:5432` / `:5433`) |

Dev example (`config/.env.local`):

```text
POSTGRES_USER=…
POSTGRES_PASSWORD="…"
INTERNAL_POSTGRES_HOST=127.0.0.1
INTERNAL_POSTGRES_PORT=5432
EXPOSED_POSTGRES_HOST=127.0.0.1
EXPOSED_POSTGRES_PORT=5432
GRAPHQL_DATABASE_NAME=dev_lissner
MEDIA_DATABASE_NAME=dev_media
```

Prod example (`config/.env.prod`): host tools use `:5433`; containers use Compose DNS:

```text
INTERNAL_POSTGRES_HOST=127.0.0.1
INTERNAL_POSTGRES_PORT=5433
EXPOSED_POSTGRES_HOST=postgres
EXPOSED_POSTGRES_PORT=5432
GRAPHQL_DATABASE_NAME=lissner
MEDIA_DATABASE_NAME=media
```

`POSTGRES_USER` and `POSTGRES_PASSWORD` are **required** for Compose init/scripts. They are never defaulted. Db scripts load gitignored env files; if a value is still missing and stdin is a TTY, they prompt.

## Quick start (dev)

```bash
npm run db:up
npm run db:checkpoint
npm run db:migrate:media
```

`npm run dev` runs `db:up` first. `npm run dev:stop` stops Node/Ollama only — use `npm run db:down` to stop the **dev** Postgres container.

## Phase A — localize GraphQL DB (dev)

1. **`npm run db:up`**
2. **`npm run db:dump-remote`** — `REMOTE_DATABASE_URL` (full URL including remote DB name; `sslmode=require` for libpq)
3. **`npm run db:restore-local`** — roles + dump into local `GRAPHQL_DATABASE_NAME`
4. Smoke GraphQL against `.env.local`

## Media DB

1. ADR 0007 / 0008
2. **`npm run db:migrate:media`** (also for `MEDIA_DATABASE_NAME=media_test` before Vitest)

## Scripts

| npm script         | What it does                                           |
| ------------------ | ------------------------------------------------------ |
| `db:up`            | Start **dev** Postgres (`lissnerio-dev`, wait healthy) |
| `db:down`          | Stop **dev** Postgres only                             |
| `db:checkpoint`    | A1: version + app DBs exist on dev                     |
| `db:dump-remote`   | `pg_dump` + roles → `data/db-dumps/`                   |
| `db:restore-local` | Roles + dump → local GraphQL DB name                   |
| `db:migrate:media` | Apply `migrations/media/*.sql`                         |

## Reset **dev** data only

```bash
npm run db:down
bash scripts/docker-compose-dev.sh rm -f postgres
docker volume rm lissnerio-dev_postgres-data
npm run db:up
npm run db:migrate:media
```

Do **not** remove `lissnerio_postgres-data` — that is on-machine **prod**.

## Backups

S3 sync uploads `media_*.dump` via `pg_dump`. Admin restore uses `pg_restore` on those dumps only.
