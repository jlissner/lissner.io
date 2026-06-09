---
change-id: refactor-data-fetching
status: implementing
complexity: 3
branch: refactor/data-fetching
debt-id: debt-001
---

# Refactor: standardize UI data fetching on react-query

## Why

debt-001 (`.grimoire/docs/debt-register.yml`): the UI has two competing
data-fetching patterns. react-query is already adopted and configured, but a
cluster of components — mostly in `features/admin/`, plus `people-page` and
`duplicate-reviewer` — still hand-roll `useState`/`useEffect`/`try-catch` fetch
logic. This refactor consolidates them onto react-query, removing repeated
boilerplate (~150-300 LOC) and the "which pattern do I use?" hazard, while
preserving behavior.

This is a pure refactor: **no user-visible behavior changes**, so no `.feature`
files. The architectural choice is captured in the decision record.

## Artifacts

- **Decision (new):** `decisions/0007-standardize-data-fetching-on-react-query.md`
  — standardize UI server-state on react-query; keep `api.ts` functions as
  `queryFn`/`mutationFn`; migrate incrementally.

## Scope

In scope — read-fetch → `useQuery`:

- `ui/src/features/admin/components/data-explorer.tsx`
- `ui/src/features/admin/components/tabs/directory-tab.tsx`
- `ui/src/features/admin/components/tabs/file-issues-tab.tsx`
- `ui/src/features/admin/components/tabs/whitelist-tab.tsx`
- `ui/src/features/admin/components/tabs/db-backup-tab.tsx`
- `ui/src/features/people/components/people-page.tsx`
- `ui/src/features/admin/components/duplicate-reviewer.tsx`

In scope — form submit → `useMutation` (lower priority, smaller savings):

- `ui/src/features/media/components/upload-modal.tsx`
- `ui/src/features/media/components/BulkDateModal.tsx`
- `ui/src/features/media/components/media-viewer/media-viewer-reassign-modal.tsx`
- `ui/src/features/media/components/media-viewer/inline-assign-bar.tsx`

Out of scope:

- `login-page.tsx` (auth flow already routes through `use-auth`; leave alone)
- Any change to `api.ts` function signatures or server routes
- The media-viewer hotspot split (debt-002 — separate change)

## Approach

- Order: `admin/` first (highest density), then `people-page`, then the
  mutation components.
- One module per commit; run `lint` + `build` + `vitest` after each.
- Keep `api.ts` functions; call them from `queryFn`/`mutationFn`.
- Establish a light query-key convention (e.g. `["admin","tables"]`,
  `["admin","table", name, params]`) and reuse `queryClient` defaults.
- Replace manual refresh wiring with `invalidateQueries`. Preserve existing
  refresh triggers (e.g. the `home-refresh` window event) where present.

## Assumptions

- The `apiJson`/`api.ts` functions throw on error in a shape the components
  already handle (`ApiError`) — react-query's `error` will carry it. _Evidence:_
  `data-explorer.tsx` and `use-media-list-query.ts` both rely on this today.
- Default `staleTime: 30_000` / `retry: 1` are acceptable for admin reads.
  _Unvalidated_ — admin data may want `staleTime: 0` for freshness; decide per
  query during apply.
- No component depends on a specific mount-time fetch ordering that
  query-key-driven fetching would break. _Unvalidated — verify per component._

## Pre-Mortem

Six months out, what could have gone wrong:

- **Silent stale data.** A migrated admin tab caches a read and an edit
  elsewhere doesn't invalidate it, so operators see stale rows. _Mitigation:_
  define query keys up front; invalidate on every mutation; smoke-test edits.
- **Lost manual-refresh behavior.** Components wired to custom refresh events
  or polling lose it in translation. _Mitigation:_ inventory each component's
  refresh triggers before migrating; preserve them via `invalidateQueries`.
- **Scope creep into behavior changes.** "While I'm here" tweaks turn a refactor
  into a feature change with no spec. _Mitigation:_ strictly behavior-preserving;
  anything user-visible stops and routes to `grimoire-draft`.
- **Half-migrated codebase.** Effort stalls after admin/, leaving three patterns
  instead of two. _Mitigation:_ small per-module commits; the register tracks
  remaining files so the work is resumable.

## Prior Art

react-query is the existing, proven pattern in this repo
(`use-media-list-query`, `use-media-search`, `use-auth`). This change borrows
those hooks' structure directly rather than inventing anything. Build-vs-buy
outcome: **adopt** the already-present library; do **not** build a custom
`useFetch` (rejected in ADR 0007 as a redundant third pattern).
