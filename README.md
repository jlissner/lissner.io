# Family Media Manager

An image and media management solution for family use.

## Tech Stack

- **TypeScript** (throughout)
- **Express v5** (server)
- **Vite + React** (UI)

## Prerequisites

- Ubuntu 24 (or run `./setup.sh` to install Node.js 24, [Ollama](https://ollama.ai), and models: `nomic-embed-text`, `llava` for image search)

## Project State

Scaffolding complete. All core features implemented: upload, list, download, view in browser, AI indexing, and AI search.

---

## Implementation Guide (for AI agents)

### 1. Scaffolding (do first)

Create the directory structure and base config:

- [x] Create `Shared/`, `server/`, `ui/`, `data/`, `data/media/`, `data/index/`, `data/db/`
- [x] Root `tsconfig.json` with project references to `Shared`, `server`, `ui`
- [x] `Shared/tsconfig.json` (base config for shared code)
- [x] `server/tsconfig.json` (extends Shared, compiles to `server/dist/` or similar)
- [x] `ui/` — Vite + React + TypeScript (use `npm create vite@latest` as reference, then integrate)
- [x] Add `data/` to `.gitignore`
- [x] Root `package.json` scripts: `dev` (concurrently run server + ui), `build`, `start`

### 2. Core features (in order)

1. **Upload/download** — API routes for multipart upload and file download; store in `data/media/` ✅
2. **View in browser** — UI to browse and display images, videos, text; server to serve media ✅
3. **AI indexing** — Index media with embeddings; store in `data/index/` ✅
4. **AI search** — Search endpoint and UI using the index ✅

### 3. Key implementation details

- **Server entry**: `server/src/index.ts` (or `server/index.ts`) — start Express, mount routes
- **API base**: `/api` — e.g. `POST /api/upload`, `GET /api/media/:id`, `GET /api/search?q=...`
- **UI dev**: Vite dev server with proxy to Express (e.g. `/api` → `http://localhost:3000`)
- **Database**: SQLite in `data/db/` is sufficient for metadata (file paths, IDs, indexing status)

---

## Features

- [x] Upload & List documents and media
- [x] Download documents and media
- [x] Delete documents and media
- [x] View documents and media in browser
  - [x] Images
  - [x] Videos
  - [x] Text
- [x] Index documents and media with AI
- [x] AI documents and media search
- [x] Face recognition: detect and group people across photos
- [x] Move upload to top nav bar
- [x] Bug fixes
  - [x] Size of top nav changes when entering/leaving selection mode
  - [x] When sorting by date uploaded, the section date is still date taken
- [ ] Additional family features
  - [ ] Family tree
  - [ ] Contact information
  - [ ] Family cookbook
  - [ ] Event planning
  - [ ] Blog
- [x] AWS S3 sync (upload new files, download missing, merge from other devices)
- [x] Magic link authentication (whitelist-only)
- [x] Admin: whitelist management, user–People linking
- [ ] Recipies feature
- [ ] Import photos from google

---

## Getting Started

**First-time setup (Ubuntu 24):**

```sh
./setup.sh
```

**Run the app:**

```sh
npm run dev
```

`npm run dev` starts Ollama (for AI search), the server, and the UI concurrently, all with hot reload.

Use **`npm run dev:web`** if you don’t need Ollama locally (server + Vite only).

### Lint & format

- **`npm run lint`** — ESLint (TypeScript + React + recommended rules; exits 0 with warnings only).
- **`npm run lint:fix`** — ESLint with `--fix` where possible.
- **`npm run format`** — Prettier, write all supported files.
- **`npm run format:check`** — Prettier check only (e.g. CI).

Config: root `eslint.config.js`, `prettier.config.js`, `.prettierignore`. VS Code/Cursor: install the **Prettier** and **ESLint** extensions; repo `.vscode/settings.json` enables format on save and ESLint fixes on save.

### Vite shows `ECONNREFUSED 127.0.0.1:3000` for `/api/...`

The UI proxies `/api` to **port 3000**. That error means the **Express API is not listening** (not running, exited on startup, or port conflict)—it is **not** caused by `npm run nuke` by itself.

1. **Full stack:** Run `npm run dev` and wait until you see **`Server running at http://localhost:3000`** in the **`[server]`** log. If you only started the UI (`npm run dev:ui` / Vite alone), start the API in another terminal: `npm run dev:server` (or use `npm run dev` / `npm run dev:web`).
2. **Port in use:** If something else holds port 3000, stop it or change the port in `server/src/index.ts` and the `proxy` target in `ui/vite.config.ts`.
3. **Crash on startup:** Read **`[server]`** output for stack traces (e.g. DB locked—stop all server processes before `npm run nuke`).

---

## Environment Variables

| Variable                | Default                  | Description                                                                                                                                   |
| ----------------------- | ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `OLLAMA_HOST`           | `http://localhost:11434` | Base URL for the Ollama API (embeddings and vision)                                                                                           |
| `OLLAMA_EMBED_MODEL`    | `nomic-embed-text`       | Ollama model used for text/image embeddings (AI search)                                                                                       |
| `OLLAMA_VISION_MODEL`   | `llava`                  | Ollama model used for face detection and image analysis                                                                                       |
| `AWS_ACCESS_KEY_ID`     | —                        | AWS access key for S3 backup                                                                                                                  |
| `AWS_SECRET_ACCESS_KEY` | —                        | AWS secret key for S3 backup                                                                                                                  |
| `AWS_REGION`            | —                        | AWS region (e.g. `us-east-1`) for S3 backup                                                                                                   |
| `S3_BUCKET`             | —                        | S3 bucket name for media sync                                                                                                                 |
| `AUTH_ENABLED`          | —                        | Set to `true` to require magic link login                                                                                                     |
| `FIRST_ADMIN_EMAIL`     | —                        | Bootstrap admin email (whitelisted, receives magic links). Required when `AUTH_ENABLED=false` — all uploads are owned by this user.           |
| `SESSION_SECRET`        | (dev default)            | Secret for session cookies                                                                                                                    |
| `MAGIC_LINK_BASE_URL`   | (from request)           | Base URL for magic links (e.g. `http://localhost:5173` in dev)                                                                                |
| `SQL_EXPLORER_ENABLED`  | —                        | Set to `true` to enable SQL explorer for admins. **Only works when NODE_ENV ≠ production** (local dev only).                                  |
| `DATA_EXPLORER_ENABLED` | —                        | Set to `true` to enable Data Explorer (CRUD UI for all tables). **Only works when NODE_ENV ≠ production**. Auto-discovers tables and columns. |
| `SES_FROM_EMAIL`        | —                        | Verified sender email for magic links (must be verified in AWS SES). If unset with AWS configured, link is logged to console.                 |

If S3 variables are missing, the server logs a warning on startup and the UI shows an alert banner. All four S3 variables must be set to enable sync.

**S3 sync behavior:** Only uploads files not already in S3. Downloads files that exist in S3 but are missing locally. Merges media from the latest DB backup in S3 (e.g. from another device) into the local database. After each **upload**, a full sync is **scheduled automatically** (debounced ~3.5s so bursts of files don’t start many syncs); you can still run **Sync** manually from the UI.

**Backfill:** Run `npm run backfill` to assign any media with null `owner_id` to the `FIRST_ADMIN_EMAIL` user. Requires `FIRST_ADMIN_EMAIL` in `.env` or `.env.local`.

**Activity (index + S3 sync):** The server exposes a unified snapshot at **`GET /api/activity`** and pushes the same JSON over **`WebSocket /ws/activity`** whenever indexing or sync state changes (no client polling). The UI uses `ActivityProvider` + `useActivity()`. `shared/src/activity.ts` documents the payload shape (duplicated under `server/src/activity/types.ts` and `ui/src/activity/types.ts` for TypeScript project boundaries).

**Nuclear reset:** `npm run nuke` permanently removes local media and thumbnails (`data/media/`, `data/thumbnails/`), deletes all rows in the SQLite database (schema kept), clears the S3 `backup/` prefix when AWS env vars are set, and removes `data/.sync_temp_db.db` if present. It prints counts/sizes first and requires typing a **random 6-digit code** to confirm. **Stop the server** before running so the database is not locked.

**Auth (magic link):** Set `AUTH_ENABLED=true` to enable. Add `FIRST_ADMIN_EMAIL=you@example.com` to bootstrap. Only whitelisted emails can receive magic links. Admins manage the whitelist and can link users to People (face recognition). Magic links are sent via AWS SES (uses same `AWS_*` credentials as S3). Set `SES_FROM_EMAIL` to a verified SES sender; otherwise the link is logged to the server console.

The server loads environment variables from `.env` and `.env.local` (the latter overrides the former). Create `.env.local` for local development; it is gitignored.

**Planned** (for future features):

| Variable   | Description                                     |
| ---------- | ----------------------------------------------- |
| `PORT`     | Server port (currently hardcoded to 3000)       |
| `DATA_DIR` | Override for data directory (default: `./data`) |

---

## Production & multi-user hosting (~100 people)

The codebase today assumes a **trusted, single-machine** setup (local disk, optional local Ollama, SQLite, in-memory sessions). Running it as a **hosted** app for on the order of **100 users** is feasible, but several areas are **must-fix** for safety and operability; others are **strongly recommended**.

### MUST change (before or at launch)

| Area | Why |
| ---- | --- |
| **TLS (HTTPS)** | Session cookies use `secure` when `NODE_ENV=production`; users must reach the app over HTTPS. Terminate TLS at a reverse proxy or load balancer with valid certificates. |
| **`NODE_ENV=production`** | Required for secure cookies and to keep dev-only features (SQL/Data explorer) disabled. |
| **`AUTH_ENABLED=true`** | Do not run a shared host with auth off (`FIRST_ADMIN_EMAIL` impersonation). Everyone would share one logical user. |
| **`SESSION_SECRET`** | Must be a long, random secret in production. The dev default in `server/src/auth/middleware.ts` is not acceptable for a public or shared deployment. |
| **`MAGIC_LINK_BASE_URL`** | Set to the **canonical public origin** of the web app (scheme + host + port if non-default). Magic-link redirects and email links must not point at `localhost` or the wrong host. |
| **Reverse proxy: `trust proxy`** | Behind nginx, Caddy, ALB, etc., Express must trust `X-Forwarded-*` so `req.protocol` and client IP are correct (magic links, logging). **Not implemented** in `server/src/index.ts` today — add `app.set("trust proxy", …)` appropriately. |
| **CORS** | `cors({ origin: true })` reflects any `Origin` with credentials — unsafe for a hosted app. Restrict to your real UI origin(s). |
| **Session store** | Sessions use the default **in-memory** store (`express-session`). Restarts log everyone out; **multiple Node processes** (horizontal scaling) do not share sessions. Use a shared store (e.g. Redis) or a single instance with sticky sessions and accepted downtime on deploy. |
| **Ollama / AI stack** | Embeddings (`server/src/embeddings.ts`) and vision (`server/src/vision.ts`) call **`OLLAMA_HOST` (default localhost)**. A typical PaaS container **does not** run Ollama beside the app. You need a **reachable** embedding/vision service (dedicated Ollama host, or swap to a hosted API) and capacity planning for ~100 users’ indexing/search load. |
| **AWS SES** | Magic links need a **verified** sender (`SES_FROM_EMAIL`). New SES accounts are in **sandbox** — request production access (or equivalent) so you can mail all intended users. |
| **Upload limits** | `multer` in `server/src/routes/media.ts` has **no explicit file size cap**. Add limits to avoid disk exhaustion and DoS. |
| **Secrets & IAM** | Use short-lived or scoped credentials where possible; never commit `.env`. S3 sync uses the same AWS credentials as SES in practice — scope IAM to least privilege (S3 prefix, SES send). |

### SHOULD change (reliability, abuse, scale)

| Area | Why |
| ---- | --- |
| **`PORT` / `DATA_DIR`** | Port and data paths are **hardcoded** (`PORT = 3000` in `server/src/index.ts`, paths in `server/src/config/paths.ts`). Environment-driven values simplify PaaS and mounted volumes. |
| **Rate limiting** | Protect `POST /api/auth/magic-link`, uploads, and expensive routes from abuse and accidents. |
| **Security headers** | Add something like **Helmet** (CSP, HSTS, etc.) in front of or on Express. |
| **WebSocket `/ws/activity`** | Upgrades in `server/src/activity/broadcast.ts` are **not authenticated** — anyone who can reach the host can subscribe to activity snapshots. Tie upgrades to the session cookie or a token. |
| **SQLite concurrency** | **better-sqlite3** is synchronous; heavy concurrent writes can block. For ~100 active users, monitor lock contention; **PostgreSQL** (or another server DB) may be warranted if write volume grows. |
| **Indexing & ML load** | Face pipeline uses **TensorFlow.js on Node** (`server/src/faces.ts`) — CPU/RAM heavy. Consider background workers, queues, or larger instances so uploads don’t stall the API. |
| **Observability** | Structured logging, error tracking, uptime checks, alerts, and log aggregation for production. |
| **Backups & DR** | Define RPO/RTO; automate DB + object storage backups; test restore. S3 sync is not a substitute for a full backup strategy. |
| **Privacy / compliance** | Photos and email addresses are sensitive; document who can access data, retention, and (if needed) consent for your group. |
| **Tests & CI** | `npm test` is a placeholder; add smoke tests and a CI pipeline before you rely on deploys at scale. |

### Checklist: publishing (getting live)

Use this as a practical gate before pointing ~100 people at a URL.

1. **Build** — `npm run build`; run `npm run start` (or your process manager) with `server/dist` + `ui/dist` as documented.
2. **Environment** — Set `NODE_ENV=production`, `AUTH_ENABLED=true`, `SESSION_SECRET`, `MAGIC_LINK_BASE_URL`, `FIRST_ADMIN_EMAIL`, Ollama (or replacement) URLs/models, AWS vars for S3 and SES, `SES_FROM_EMAIL`.
3. **DNS & TLS** — Domain points to your host; HTTPS certificates installed and auto-renewed.
4. **Proxy** — Configure reverse proxy to the Node port; enable **`trust proxy`** in Express when appropriate.
5. **CORS** — Allowlist your real UI origin; remove wide-open origin behavior.
6. **Sessions** — Deploy a **shared session store** if you have more than one app instance or need login to survive restarts.
7. **SES** — Verified domain/email; **out of sandbox** if you need to mail arbitrary addresses.
8. **Capacity** — Confirm Ollama (or replacement) and Node have enough CPU/RAM for indexing; plan for peak upload/search.
9. **Limits** — Request size, upload size, and rate limits in place.
10. **Operational** — Health check, logs, backups, and an incident runbook (who can reset accounts, rotate secrets).
11. **Hardening** — WebSocket auth, security headers, dependency audit (`npm audit`) on a schedule.

---

## Architecture

Desired directory structure:

- `./`
  - The root is sparse. It only contains what needs to be at the global level.
- `./Shared/`
  - TypeScript
  - Anything shared between the server and UI lives here. Commonly shared things include: type definitions, common utils, configuration options, shared tsconfig/eslint/prettier rules.
- `./server/`
  - TypeScript
  - Express v5.
  - **`src/index.ts`** — HTTP entry (the only `index` at `src/` root).
  - **`src/config/`** — `paths.ts` (data dirs, DB path, UI dist).
  - **`src/db/`** — `media.ts` (main SQLite schema/API), `auth.ts` (auth tables).
  - **`src/indexing/`** — `media.ts` (embeddings + faces pipeline); `job.ts` (pure index-job state transitions); `job-store.ts` (singleton that applies those transitions for the running server).
  - **`src/activity/`** — `types.ts`, `snapshot.ts` (build unified index+sync snapshot), `broadcast.ts` (WebSocket + broadcast on change).
  - **`src/s3/`** — `sync.ts` (backup / two-way sync; notifies activity listeners on progress).
  - **`src/auth/`** — `middleware.ts` (session, `requireAuth`, etc.).
  - **`src/routes/`** — `index.ts` re-exports routers; individual route modules (`media.ts`, …).
- `./ui/`
  - TypeScript
  - Vite
  - React
- `./data/`
  - Runtime data (gitignored).
  - `./data/media/` — uploaded documents and media files.
  - `./data/index/` — AI index and embeddings for search.
  - `./data/db/` — database files (e.g. SQLite).

---

## Conventions

- **File naming**: kebab-case for files, PascalCase for React components.
- **New code**: API routes in `server/routes/`, new components in `ui/components/`.
- **React**: Functional components only.
- **Async**: Use async/await over raw promises.
