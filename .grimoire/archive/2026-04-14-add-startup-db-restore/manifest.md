---
status: complete
branch: feat/add-startup-db-restore
---

# Change: Restore DB from latest S3 backup on startup

## Why

When deploying to a new host (or after a wiped volume), the app should automatically recover state by using the most recent database backup stored in S3, if one exists.

## Assumptions

- The S3 bucket configured by `S3_BUCKET` contains DB backup objects under a stable prefix: **validated** (sync uploads under `backup/db/…`).
- Restoring the DB file is safe to do only when the server is starting and no local DB is open: **validated** (DB is now lazily opened; restore happens before server modules import DB).
- If a local DB already exists, keeping it (rather than overwriting) is the safest default: **validated** (startup restore skips when `dbPath` exists).

## Pre-Mortem

- A corrupt or partially-downloaded DB causes the app to crash-loop at startup: mitigated by `PRAGMA integrity_check` validation and fallback.
- The bucket contains many historical DBs and listing becomes slow/costly: mitigated by listing only the DB prefix.
- Credentials are misconfigured and startup restore adds noisy errors: mitigated by treating restore as best-effort and continuing startup.

## Feature Changes

- **ADDED** `backup/startup-db-restore.feature` — restore local DB from newest S3 backup at startup (best-effort)

## Scenarios Added

- `backup/startup-db-restore.feature`: "Startup restore uses latest S3 DB when local DB is missing"
- `backup/startup-db-restore.feature`: "Startup restore is skipped when S3 backup is not configured"
- `backup/startup-db-restore.feature`: "Startup restore continues when no DB backups exist"
- `backup/startup-db-restore.feature`: "Startup restore falls back when download fails or DB is invalid"

## Decisions

- None
