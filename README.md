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

### Vite shows `ECONNREFUSED 127.0.0.1:3000` for `/api/...`

The UI proxies `/api` to **port 3000**. That error means the **Express API is not listening** (not running, exited on startup, or port conflict)—it is **not** caused by `npm run nuke` by itself.

1. **Full stack:** Run `npm run dev` and wait until you see **`Server running at http://localhost:3000`** in the **`[server]`** log. If you only started the UI (`npm run dev:ui` / Vite alone), start the API in another terminal: `npm run dev:server` (or use `npm run dev` / `npm run dev:web`).
2. **Port in use:** If something else holds port 3000, stop it or change the port in `server/src/index.ts` and the `proxy` target in `ui/vite.config.ts`.
3. **Crash on startup:** Read **`[server]`** output for stack traces (e.g. DB locked—stop all server processes before `npm run nuke`).

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `OLLAMA_HOST` | `http://localhost:11434` | Base URL for the Ollama API (embeddings and vision) |
| `OLLAMA_EMBED_MODEL` | `nomic-embed-text` | Ollama model used for text/image embeddings (AI search) |
| `OLLAMA_VISION_MODEL` | `llava` | Ollama model used for face detection and image analysis |
| `AWS_ACCESS_KEY_ID` | — | AWS access key for S3 backup |
| `AWS_SECRET_ACCESS_KEY` | — | AWS secret key for S3 backup |
| `AWS_REGION` | — | AWS region (e.g. `us-east-1`) for S3 backup |
| `S3_BUCKET` | — | S3 bucket name for media sync |
| `AUTH_ENABLED` | — | Set to `true` to require magic link login |
| `FIRST_ADMIN_EMAIL` | — | Bootstrap admin email (whitelisted, receives magic links). Required when `AUTH_ENABLED=false` — all uploads are owned by this user. |
| `SESSION_SECRET` | (dev default) | Secret for session cookies |
| `MAGIC_LINK_BASE_URL` | (from request) | Base URL for magic links (e.g. `http://localhost:5173` in dev) |
| `SQL_EXPLORER_ENABLED` | — | Set to `true` to enable SQL explorer for admins. **Only works when NODE_ENV ≠ production** (local dev only). |
| `DATA_EXPLORER_ENABLED` | — | Set to `true` to enable Data Explorer (CRUD UI for all tables). **Only works when NODE_ENV ≠ production**. Auto-discovers tables and columns. |
| `SES_FROM_EMAIL` | — | Verified sender email for magic links (must be verified in AWS SES). If unset with AWS configured, link is logged to console. |

If S3 variables are missing, the server logs a warning on startup and the UI shows an alert banner. All four S3 variables must be set to enable sync.

**S3 sync behavior:** Only uploads files not already in S3. Downloads files that exist in S3 but are missing locally. Merges media from the latest DB backup in S3 (e.g. from another device) into the local database. After each **upload**, a full sync is **scheduled automatically** (debounced ~3.5s so bursts of files don’t start many syncs); you can still run **Sync** manually from the UI.

**Backfill:** Run `npm run backfill` to assign any media with null `owner_id` to the `FIRST_ADMIN_EMAIL` user. Requires `FIRST_ADMIN_EMAIL` in `.env` or `.env.local`.

**Nuclear reset:** `npm run nuke` permanently removes local media and thumbnails (`data/media/`, `data/thumbnails/`), deletes all rows in the SQLite database (schema kept), clears the S3 `backup/` prefix when AWS env vars are set, and removes `data/.sync_temp_db.db` if present. It prints counts/sizes first and requires typing a **random 6-digit code** to confirm. **Stop the server** before running so the database is not locked.

**Auth (magic link):** Set `AUTH_ENABLED=true` to enable. Add `FIRST_ADMIN_EMAIL=you@example.com` to bootstrap. Only whitelisted emails can receive magic links. Admins manage the whitelist and can link users to People (face recognition). Magic links are sent via AWS SES (uses same `AWS_*` credentials as S3). Set `SES_FROM_EMAIL` to a verified SES sender; otherwise the link is logged to the server console.

The server loads environment variables from `.env` and `.env.local` (the latter overrides the former). Create `.env.local` for local development; it is gitignored.

**Planned** (for future features):

| Variable | Description |
|----------|-------------|
| `PORT` | Server port (currently hardcoded to 3000) |
| `DATA_DIR` | Override for data directory (default: `./data`) |

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
