---
status: proposed
date: 2026-06-05
decision-makers: []
---

# Standardize UI server-state on react-query

## Context and Problem Statement

The UI fetches server state two different ways. `@tanstack/react-query` is
already installed, configured (`ui/src/query-client.ts`, mounted in
`ui/src/main.tsx`), and used by core hooks (`use-media-list-query`,
`use-media-search`, `use-auth`, `home-page-toolbar`, `media-viewer-details`).
But a cluster of components — concentrated in `features/admin/` plus
`people-page` and `duplicate-reviewer` — still hand-roll the same job with
`useState` for `data`/`loading`/`error`, a `useEffect` that calls an
`api.ts` function, and a `try/catch` that sets error state.

This is debt-001 in `.grimoire/docs/debt-register.yml`. Two patterns for one
job means contributors must guess which to use, loading/error handling drifts
between components, and the manual path re-implements caching, request dedup,
and refetch-on-invalidate that react-query already provides for free.

## Decision Drivers

- One obvious way to fetch server state (the engineering principle: "use what exists")
- Remove repeated loading/error/try-catch boilerplate (~150-300 LOC)
- Consistent cache invalidation across mutations (e.g. after an admin edit)
- No new dependency — react-query is already adopted and configured
- Incremental, behavior-preserving migration (no user-visible change)

## Considered Options

1. **Status quo** — leave the two patterns side by side
2. **Standardize on react-query** — migrate manual fetch components to
   `useQuery`/`useMutation`, keeping the existing `apiJson`/`api.ts` functions
   as the `queryFn`/`mutationFn` bodies
3. **Build a small custom `useFetch` hook** — wrap the manual pattern in one
   shared hook instead of adopting react-query everywhere

## Decision Outcome

**Chosen option: Standardize on react-query (option 2).**

**Because:** the library is already the de-facto standard in the most-used parts
of the UI, it is already installed and configured, and it eliminates the
boilerplate without introducing a new concept. Option 3 would add a _third_
pattern and reinvent caching/dedup react-query already gives us — directly
against "don't abstract early" and "use what exists." Option 1 leaves the
ambiguity in place.

Scope: keep `api.ts` fetch functions as-is and call them from `queryFn`/
`mutationFn`. Migrate read-fetch components to `useQuery` and form submits to
`useMutation` with `queryClient.invalidateQueries` for cache updates. Reuse the
existing `queryClient` defaults (`staleTime: 30_000`, `retry: 1`). Migrate
incrementally, one feature module at a time, starting with `admin/`.

### Consequences

- **Good:** one fetching pattern; less boilerplate; free caching, dedup, and
  refetch-on-invalidate; consistent loading/error UX
- **Good:** no new dependency or concept — extends existing, proven setup
- **Bad:** churn across ~7-12 components; each must be verified to preserve
  current behavior (loading states, error messages, manual refresh triggers
  like the `home-refresh` window event)
- **Bad:** query-key conventions must be chosen and applied consistently or
  invalidation will silently miss

### Cost of Ownership

- **Maintenance burden:** contributors must know react-query patterns (already
  required to work in media/auth); query keys need a light convention
- **Ongoing benefits:** every future fetch is shorter and consistent; cache
  invalidation replaces ad-hoc manual refetch wiring
- **Sunset criteria:** revisit only if react-query is replaced wholesale by a
  framework-level data layer (e.g. a router loader pattern)

### Confirmation

- `npm run lint`, `npm run build`, and `npx vitest run` pass after each module
- No remaining manual `setLoading`/`setError` fetch blocks in migrated modules
  (verify with a follow-up `rg` scan)
- Manual smoke of the admin tabs and people page: data loads, errors render,
  edits/refreshes still update the view
