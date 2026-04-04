# AGENTS.md - Family Image Manager

## Overview

A TypeScript monorepo for family media management with AI indexing, face recognition, and S3 sync.

**Tech Stack:** Express v5 (server) + Vite + React (UI) + SQLite + Ollama (embeddings)

---

## Commands

### Build & Typecheck

```bash
npm run build              # Full build: tsc + vite
```

### Development

```bash
npm run dev               # Start all: ollama + server + ui
npm run dev:server        # Server only (tsx watch)
npm run dev:ui            # UI only (vite)
npm run dev:web           # Server + UI (no ollama)
npm run start             # Production server
```

### Quality

```bash
npm test                  # All tests (vitest run)
npm test -- src/path.test.ts    # Single test file
npm run lint              # ESLint check
npm run lint:fix          # ESLint auto-fix
npm run format            # Prettier format all files
npm run format:check      # Check formatting
```

### Utilities

```bash
npm run clear-index        # Clear search index via API
npm run servers            # List running servers
npm run nuke               # Delete all data (dangerous!)
```

---

## Project Structure

```
server/src/
  routes/           # Express Router only: parse/validate/respond
  services/         # Business logic: use-cases, orchestration
  db/              # SQLite queries, migrations
  activity/        # WebSocket broadcast, job state
  auth/            # Session, middleware
  s3/              # AWS sync
  faces/           # Face detection/clustering
  indexing/        # Media indexing jobs
  embeddings/      # Ollama integration
  vision/          # Image description
  lib/             # Utilities, types, errors

ui/src/
  app/             # Route composition, layout (no feature imports)
  features/        # Feature modules with components/, hooks/
  components/      # Shared UI (buttons, modals, etc.)
  config/          # Routing constants, nav (no feature imports)

shared/src/        # Types shared between server and UI
```

---

## Code Style

### Paradigm
- **Functional** - Prefer pure functions and avoid mutation

### Types & Imports

- **No `any`** — narrow `unknown` quickly at boundaries
- **Use `type` keyword** for type-only imports: `import type { Foo }`
- **Prefer inline type imports**: `import { type Foo } from "bar"`
- **Explicit return types** on public/exported functions
- **Discriminated unions** for expected failures: `{ ok: true, data: T } | { ok: false, reason: string }`

### Variables

- **No `let`** — always use `const`; derive new values instead of reassigning
- **No mutation** — prefer immutable patterns; `reduce` over mutable accumulators

### React (UI)

- **One responsibility per function** — keep components focused
- **Early returns** — guard clauses over deep nesting
- **Named helpers** for non-trivial conditions and parsing
- **No nested ternaries**
- **Use `@/`** path alias for all UI imports

### Error Handling

- **Zod schemas** for request validation — not `parseInt`/`typeof` in routes
- **Service failures** → discriminated unions
- **Unexpected failures** → throw (caught by error handler)
- **Structured logging** via `logger`/`req.log` with stable metadata keys

---

## Architecture Rules

### Server Layers (dependency direction)

```
routes/ → services/ → db/, s3/, indexing/, ...
```

- **Routes**: transport only (`Request`/`Response`); call services, set status
- **Services**: pure business logic; plain data in, results out; no `Request`/`Response`
- **DB/Infra**: no imports from routes/services

### UI Layers

```
components/, config/, hooks/ → features/ → app/
```

- **Features** must NOT import from `app/`
- **Shared components** must NOT import from features
- **Config** must NOT import feature code

---

## Validation

- Use shared **Zod schemas** from `validation/` directories
- Parse via `parseWithSchema()` helper
- Keep validation logic DRY — one schema per endpoint body

---

## Database

- **SQLite** via `better-sqlite3`
- **Migrations** in `db/*-migrations.ts` with version tracking
- Use **prepared statements** for queries (defined in `db/*.ts`)
- **Transactions** for multi-step writes

---

## Testing

- **Vitest** for all tests
- Tests co-located with source: `foo.ts` → `foo.test.ts`
- No `console.log` in test files

---

## Key Conventions

- **JSX**: use `react-jsx` transform (no `React` import needed)
- **File naming**: `camelCase.ts` for code, `PascalCase.tsx` for React components
- **Barrel files**: avoid `index.ts` re-exports (hurts tree-shaking)
- **Comments**: no comments unless explaining _why_, not _what_

---

## Pre-commit Hooks

ESLint warnings are treated as errors. Run `npm run lint` before committing.
