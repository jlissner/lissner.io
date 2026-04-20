# Server (Express + TypeScript)

## Layering

Dependencies flow **inward**: HTTP and middleware sit at the edge; they call **services**; services call **infrastructure** (`db/`, `s3/`, `email/`, `indexing/`, `faces/`, etc.). Infrastructure does **not** import route handlers.

| Layer              | Folder                                                                                                         | Role                                                                                                                                          |
| ------------------ | -------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| **HTTP**           | `src/routes/`                                                                                                  | Routers: parse `req`, map status codes, send `res`. Keep handlers **short** — validate inputs, call a service, return JSON/files/redirects.   |
| **Application**    | `src/services/`                                                                                                | Use-cases: orchestration, transaction-like sequences, mapping errors to outcomes. **No** `Request` / `Response` types here (pass plain data). |
| **Infrastructure** | `src/db/`, `src/s3/`, `src/email.ts`, `src/indexing/`, `src/faces.ts`, `src/embeddings.ts`, `src/vision.ts`, … | Persistence, external APIs, heavy I/O.                                                                                                        |
| **Cross-cutting**  | `src/auth/`, `src/activity/`, `src/config/`                                                                    | Sessions, WebSocket broadcast, path config.                                                                                                   |

### Services (current)

| Module                | Responsibility                                                                                 |
| --------------------- | ---------------------------------------------------------------------------------------------- |
| `activity-service.ts` | Build unified activity snapshot for HTTP + WS.                                                 |
| `admin-service.ts`    | Feature flags for SQL/Data explorer (dev-only).                                                |
| `auth-service.ts`     | URL helpers for magic links (e.g. `getMagicLinkBaseUrl`).                                      |
| `backup-service.ts`   | S3 sync status + `prepareSync()` (validate before background run).                             |
| `media-service.ts`    | Media CRUD, tagging, faces, thumbnails, text content — **core** domain logic for `/api/media`. |
| `people-service.ts`   | People list, merge, person media preview.                                                      |
| `search-service.ts`   | Bulk indexing job, index status, semantic search.                                              |

Add new modules under `src/services/` when a flow is reused or a route grows beyond ~30–40 lines of logic.

### Rules of thumb

1. **New route** — add handler in `routes/`; if logic is non-trivial, add or extend `services/*.ts`.
2. **New DB access** — put low-level SQL in `db/`; call **from services** (or from `indexing/` if it’s indexing-only).
3. **No barrel `index.ts`** for services — import concrete files (`../services/media-service.js`) so the dependency graph stays obvious.
4. **Express middleware** (multer, auth) stays **only** in routes or `auth/middleware.ts` — not inside services.

## Entry

- `src/index.ts` — Express app, `createServer`, static UI, wires routers.

## Build

- Output: `server/dist/` (see `server/tsconfig.json`).
- Root `npm run build` compiles the server project and `tsc -b` references.
