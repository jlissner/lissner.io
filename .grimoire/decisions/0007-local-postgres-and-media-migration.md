---
status: accepted
date: 2026-10-26
decision-makers: [joe]
---

# Local Postgres first, then SQLite media onto Postgres

## Context and Problem Statement

GraphQL already uses remote Postgres (RDS). The media API uses local SQLite. We want local Postgres hosting and a single engine for media. Doing both at once mixes ops risk with a large schema/API rewrite.

## Decision Drivers

- Prove local Postgres with a workload that already speaks Postgres (GraphQL)
- Keep media cutover reversible (retain SQLite until verified)
- Isolate GraphQL data from media reloads (two databases on one instance)

## Considered Options

1. Migrate SQLite to Postgres first, keep GraphQL on RDS
2. Localize GraphQL Postgres first, then migrate media SQLite → local Postgres
3. Big-bang: local Postgres + media rewrite + GraphQL cutover in one change

## Decision Outcome

Chosen option: **2**, because local Postgres is validated by GraphQL dump/restore before the harder media migration.

Defaults:

- One Compose `postgres:16` instance
- Databases: `lissner` (PostGraphile) and `media` (API auth + photos)
- Embeddings stored as `TEXT` (JSON vector string, same as SQLite) for the first cut; revisit `pgvector` later
- Migrations live in `packages/db/migrations/media/` as numbered SQL
- API continues on SQLite until ETL verification passes and a dedicated cutover lands (`MEDIA_DATABASE_URL`)

### Consequences

- Good: checkpointed path; GraphQL rollback is URL flip; media DB can be truncated without touching GraphQL
- Bad: two databases to back up; temporary dual-store period

### Cost of Ownership

- **Maintenance burden**: Compose volume, dump/restore scripts, SQL migrations in `@lissner/db`
- **Ongoing benefits**: one engine locally; path to retire SQLite and RDS for GraphQL
- **Sunset criteria**: after API uses only `media` Postgres and GraphQL uses local/prod Postgres as intended, remove SQLite + RDS-only docs

## Confirmation

- A1: `npm run db:up` + `npm run db:checkpoint`
- A2–A3: dump/restore + GraphQL `DATABASE_URL` local
- B2–B3: `db:migrate:media`, `db:etl`, `db:verify-etl`
