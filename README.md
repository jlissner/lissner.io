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
