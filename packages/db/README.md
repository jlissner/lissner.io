# Database (`@lissner/db`)

Local **Postgres 16** for the monorepo. One Compose instance, **two databases**:

| Database  | Purpose                                    | Consumers                               |
| --------- | ------------------------------------------ | --------------------------------------- |
| `lissner` | PostGraphile / GraphQL app schema          | `@lissner/graphql` (`DATABASE_URL`)     |
| `media`   | Family media + API auth (replacing SQLite) | `@lissner/server` (cutover in progress) |

Remote RDS (`db.lissner.io` / `test.db.lissner.io`) remains the production GraphQL source until you dump/restore and flip `DATABASE_URL` (Phase A). SQLite under `DATA_DIR` remains the media API source until ETL + API cutover (Phase B).

## Credentials (no defaults)

`POSTGRES_USER` and `POSTGRES_PASSWORD` are **required**. They are never defaulted in Compose or scripts.

Set them in gitignored `config/.env.local` and/or `config/.env.prod` (see `config/.env.example`). Db scripts also load those files; if a value is still missing and stdin is a TTY, they prompt. Non-interactive runs fail instead of guessing.

## Quick start (checkpoint A1)

```bash
# Ensure POSTGRES_USER / POSTGRES_PASSWORD are in config/.env.prod (or .env.local)
npm run db:up
npm run db:checkpoint
```

Local URL shape (substitute your user/password):

```text
postgres://USER:PASSWORD@127.0.0.1:5433/lissner?sslmode=disable
postgres://USER:PASSWORD@127.0.0.1:5433/media?sslmode=disable
```

Host port defaults to **5433** so a system Postgres on 5432 is left alone. Override with `POSTGRES_PORT`.

Inside Compose, other services reach Postgres at host `postgres` on container port **5432**:

```text
postgres://USER:PASSWORD@postgres:5432/lissner?sslmode=disable
```

## Phase A — localize GraphQL DB

1. **`npm run db:up`** — empty local Postgres with `lissner` + `media` DBs.
2. **`npm run db:dump-remote`** — needs `REMOTE_DATABASE_URL` (or prompts). Use `sslmode=require` for libpq tools (not Node’s `no-verify`). Writes `lissner-remote.dump` plus `lissner-remote-roles.sql`. On RDS, `pg_dumpall` often lacks `pg_authid` rights — the script falls back to a `pg_roles` catalog dump (no passwords; enough for PostGraphile `SET ROLE`).
3. **`npm run db:restore-local`** — applies roles, restores into local `lissner` **with ACLs** (schema/function grants PostGraphile needs), then `GRANT`s those roles to `POSTGRES_USER` so `SET ROLE` works. Re-dump after changing dump flags; old dumps taken with `--no-acl` will still miss grants.
4. Point GraphQL at local: set `DATABASE_URL` in `config/.env.local` (or Compose env) to your local `lissner` URL (`sslmode=disable` on the host).

   Docker `graphql` service: host `postgres`, port `5432`.

5. **`npm run dev:graphql`** or Docker `graphql` — smoke a known query. Keep the remote URL as rollback.

Rollback A: set `DATABASE_URL` back to the remote RDS URL.

## Phase B — SQLite → `media` DB

1. ADR: [`.grimoire/decisions/0007-local-postgres-and-media-migration.md`](../../.grimoire/decisions/0007-local-postgres-and-media-migration.md)
2. **`npm run db:migrate:media`** — apply SQL under `migrations/media/`.
3. **`npm run db:etl`** — copy SQLite → Postgres `media` (stop the API first).
4. **`npm run db:verify-etl`** — row-count checkpoint.
5. API cutover uses `MEDIA_DATABASE_URL` (see server env); SQLite stays until that lands.

## Scripts

| npm script         | What it does                          |
| ------------------ | ------------------------------------- |
| `db:up`            | `docker compose up -d postgres`       |
| `db:down`          | Stop Postgres container               |
| `db:checkpoint`    | A1: version + list databases          |
| `db:dump-remote`   | `pg_dump` + `pg_dumpall --roles-only` |
| `db:restore-local` | Roles + dump → local `lissner`        |
| `db:migrate:media` | Apply `migrations/media/*.sql`        |
| `db:etl`           | SQLite → Postgres `media` copy        |
| `db:verify-etl`    | Compare SQLite vs Postgres row counts |

## Init note

`docker/init-databases.sh` runs **only** on a fresh `postgres-data` volume. To re-init after changing the Postgres role password:

```bash
bash scripts/docker-compose.sh down
docker volume rm lissnerio_postgres-data
npm run db:up
```

## Retire SQLite (B5 checklist)

After B4 cutover is proven in production:

1. Remove `better-sqlite3` from `@lissner/server` and delete `packages/server/src/db/*-migrations.ts` SQLite runners.
2. Make `MEDIA_DATABASE_URL` required in server env (same pattern as other secrets).
3. Stop shipping `DATA_DIR/db/*.db` as the primary backup; use `pg_dump` of `media` (+ `lissner`) instead.
4. Update `HOST.md` / S3 backup docs that assumed a SQLite file.
5. Keep the last SQLite file offline for a retention window, then delete.

Until then, leave SQLite in place; `MEDIA_DATABASE_URL` empty means the API still uses SQLite.
