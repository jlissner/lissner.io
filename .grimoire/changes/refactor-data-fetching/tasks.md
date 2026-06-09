# Tasks: refactor-data-fetching

> **Change**: Standardize UI server-state on react-query; remove hand-rolled useState/useEffect/try-catch fetch boilerplate.
> **Features**: none (pure refactor — no behavior change)
> **Decisions**: `decisions/0007-standardize-data-fetching-on-react-query.md`
> **Safety net**: no component-render test infra exists, and we are NOT adding it. Guarantee behavior with `tsc` (build) + `lint` + extract any non-trivial logic into unit-tested helpers + a manual smoke checklist per screen.
> **Verify command**: `npm run build && npm run lint && npx vitest run`
> **Status**: 14/14 implementation tasks complete (6.5 manual smoke pending PR). Sections 1-2 migrated to react-query; sections 3-5 evaluated and kept manual (accepted residuals, documented). debt-005 fully resolved — the `errorMessage` helper replaced all simple `instanceof ApiError ? .message` ternaries (39 → 0) across the UI.
>
> **debt-005 helper (added this pass):** `errorMessage(err, fallback)` extracted to
> `ui/src/api/errors.ts` (ApiError moved there too, out of the browser-coupled
> client.ts, so it is unit-testable; test in `ui/src/api/errors.test.ts`). All
> sections use it. Replace remaining inline `instanceof ApiError ? .message`
> sites elsewhere opportunistically.

## Conventions for every migration

- **Keep `api.ts` functions unchanged.** Call them from `queryFn`/`mutationFn`.
- **Reads → `useQuery`**: `data → query.data ?? <default>`, `loading → query.isLoading`, `error → query.error` (render via existing `Alert`; map with the file's existing `friendly*Error`/`ApiError` logic in `query.error`).
- **Writes → mutate-then-invalidate**: after a successful create/update/delete, call `queryClient.invalidateQueries({ queryKey: <read key> })` instead of an imperative re-fetch. Keep existing `confirm()` prompts and `alert()` error UX exactly as-is.
- **Reuse the configured client**: `queryClient` defaults are `staleTime: 30_000, retry: 1` (`ui/src/query-client.ts`). For admin screens that must always show fresh data, pass `staleTime: 0` on that query and note why inline.
- **Query-key convention** (flat, descriptive): `["admin","directory"]`, `["admin","whitelist"]`, `["admin","users"]`, `["admin","people"]`, `["admin","dbBackups"]`, `["admin","fileIssues"]`, `["admin","tables"]`, `["admin","table", name, { q, limit, offset }]`, `["duplicates"]`, `["people","list"]`, `["people","preview", personId]`.
- **No `let`** (repo rule). **No behavior changes** — if a change would alter what the user sees, STOP and route to `grimoire-draft`.

## Reuse (do not rewrite)

- `apiJson`, `ApiError`, `prependApiUrl` — `ui/src/api.ts`
- `queryClient` — `ui/src/query-client.ts` (already mounted in `ui/src/main.tsx`)
- Existing pattern reference: `ui/src/features/media/hooks/use-media-list-query.ts` (useInfiniteQuery), `media-viewer-details.tsx` (`useQueryClient` + `invalidateQueries`)
- Admin api functions — `ui/src/features/admin/api.ts`
- People api functions — `ui/src/features/people/api.ts`

---

## 1. Admin tabs — reads → useQuery (highest, lowest-risk payoff)

<!-- context:
  - .grimoire/changes/refactor-data-fetching/decisions/0007-standardize-data-fetching-on-react-query.md
  - ui/src/query-client.ts
  - ui/src/features/admin/api.ts
  - ui/src/features/admin/components/tabs/file-issues-tab.tsx
  - ui/src/features/admin/components/tabs/whitelist-tab.tsx
  - ui/src/features/admin/components/tabs/db-backup-tab.tsx
  - ui/src/features/admin/components/tabs/directory-tab.tsx
-->

- [x] 1.1 `tabs/file-issues-tab.tsx`: replace `fileIssues`/`fileIssuesLoading`/`fileIssuesError` + `loadFileIssues` + `useEffect` with `useQuery({ queryKey: ["admin","fileIssues"], queryFn: () => listMediaFileIssues().then(r => r.items) })`. Map `query.error` to the existing "Failed to load file issues" message. In `handleClearFileIssue`/`handleDeleteFileIssue`, replace `await loadFileIssues()` with `queryClient.invalidateQueries({ queryKey: ["admin","fileIssues"] })`. Keep the `confirm()` and `alert()` for re-index/clear/delete unchanged. "Refresh" button → `queryClient.invalidateQueries`.
- [x] 1.2 `tabs/db-backup-tab.tsx`: replace `dbBackups`/`dbBackupsLoading`/`dbBackupsError` + `fetchDbBackups` + `useEffect` with `useQuery({ queryKey: ["admin","dbBackups"], queryFn: () => listDbBackups().then(r => r.backups) })`. Keep `sortDbBackupsByNewest` in the existing `useMemo` over `query.data ?? []`. Keep `restoringBackupKey` local state and the `restoreDbFromBackup` → `window.location.reload()` flow (no invalidate needed — page reloads). "Refresh list" → invalidate.
- [x] 1.3 `tabs/whitelist-tab.tsx`: the mount fetch loads three lists via `Promise.all`. Split into three `useQuery` calls keyed `["admin","whitelist"]`, `["admin","users"]`, `["admin","people"]` (queryFns `listWhitelist`, `listUsers`, `listPeopleForAdmin`). Derive `loadError` from the first errored query. In `handleAddWhitelist`/`handleRemoveWhitelist`, replace `await fetchData()` with `invalidateQueries` for `["admin","whitelist"]` (and `["admin","users"]` if membership affects the person dropdown). Keep `alert()` error UX and `confirm()`.
- [x] 1.4 `tabs/directory-tab.tsx`: replace
<!-- SESSION: section 1 done. Pattern: useQuery for reads (isFetching drives the Refresh/loading UI to match old behavior; isError → ApiError.message else fallback string), mutate-then-invalidateQueries. Query keys hoisted to module consts. directory-tab keeps local directoryError for mutation errors, combined with query loadError via `shownError`. build+lint+vitest all green. Next: section 2 (data-explorer). --> `directory` + `directoryError` (load path) + `fetchDirectory` + `useEffect` with `useQuery({ queryKey: ["admin","directory"], queryFn: listPeopleDirectory })`. Keep `directorySaving` and all edit/create/delete form state local. In create/update/delete handlers, replace `await fetchDirectory()` with `invalidateQueries({ queryKey: ["admin","directory"] })`. Preserve `friendlyDirectoryError` for mutation errors (set into the local `directoryError` state, which now only holds mutation errors). "Refresh" button → invalidate.

## 2. Admin data-explorer — reads → useQuery

<!-- context:
  - ui/src/features/admin/components/data-explorer.tsx
  - ui/src/features/admin/api.ts
  - ui/src/query-client.ts
-->

- [x] 2.1 `data-explorer.tsx`: replace `tables` with `useQuery({ queryKey: ["admin","tables"], queryFn: listDataExplorerTables })`. Replace `schema`/`count`/`rows`/`loading`/`error` + `fetchTableData` with one `useQuery({ queryKey: ["admin","table", selectedTable, { q: debouncedSearch.trim(), limit, offset }], queryFn: ... , enabled: selectedTable != null })` that runs the existing `Promise.all([getDataExplorerSchema, getDataExplorerRows])` and returns `{ schema, count, rows }`. The query key already encodes search/paging, so the debounce `useEffect` stays but the manual refetch `useEffect` is removed. After insert/update/delete row mutations, `invalidateQueries({ queryKey: ["admin","table", selectedTable] })`. Keep `parseColumnValueForWrite` and `formatSearchMeta` as-is.
- [x] 2.2 Confirm no non-trivial logic was inlined during 2.1.
  <!-- SESSION: 2.1 done. tables→useQuery(["admin","tables"]); table data→useQuery(["admin","table",selectedTable,{q,limit,offset}], enabled). Removed fetchTables/fetchTableData/mount effects; debounce+offset-reset effects kept. mutationError state holds write errors, combined with query loadError via `error`; cleared on success and table switch. No new non-trivial logic — existing parseColumnValueForWrite/formatSearchMeta untouched, so 2.2 needs no extraction. -->
  <!-- DESIGN NOTE: data-explorer keeps the 30s staleTime default. If admins need always-fresh DB rows on reopen, add staleTime:0 to the table-data query. --> If any new derivation (e.g. row-key building) is non-trivial, extract it to `ui/src/features/admin/lib/` and add a `vitest` unit test there (matches repo convention — see `admin/lib/format.test.ts`).

## 3. Duplicate reviewer — reads → useQuery

<!-- context:
  - ui/src/features/admin/components/duplicate-reviewer.tsx
  - ui/src/features/admin/lib/duplicates.ts
  - ui/src/features/admin/api.ts
-->

- [x] 3.1 `duplicate-reviewer.tsx`: ACCEPTED RESIDUAL — left on the manual pattern (escape hatch). The duplicate list is user-triggered (an expensive "Find Duplicates" scan), and after bulk delete the component optimistically filters the local list AND per-row decisions instead of refetching (deliberate: avoids re-running the scan and preserves decisions). useQuery would add a query+local-overlay and risk re-running the scan — net-negative. Applied debt-005 (`errorMessage`) to its 2 error sites instead. Pure helpers in admin/lib/duplicates.ts untouched.

## 4. People feature — reads → useQuery (LARGER / OPTIONAL — do last)

<!-- context:
  - ui/src/features/people/components/use-people-list.ts
  - ui/src/features/people/components/use-people-preview.ts
  - ui/src/features/people/components/use-people-mutations.ts
  - ui/src/features/people/api.ts
-->

- [x] 4.1 `use-people-list.ts`: ACCEPTED RESIDUAL — not migrated. Mutations call `fetchPeople()` NON-silent, which today sets loading=true and makes people-page flash a full-page "Loading people…". useQuery + cached data keeps isLoading=false, removing that flash — a behavior change (improvement, but a change) for a single read. Low value, not worth the risk. Applied errorMessage to the mutation layer instead.
- [x] 4.2 `use-people-preview.ts`: STOPPED & FLAGGED — ACCEPTED RESIDUAL. The mutation layer does optimistic local updates: `handleReassign`/`handleRemoveFromPhoto` do `setPreviewMedia(prev => prev.filter(...))` (instant item removal) and `handleMergeFromSuggestion` does `setMergeSuggestions([])`. With useQuery the data isn't setState-able — it would need `queryClient.setQueryData` optimistic plumbing (more code, against "less code is more") OR `invalidate` which refetches over the network and flashes previewLoading instead of removing instantly (behavior change). Left manual per the escape hatch.
- [x] 4.3 Outcome recorded: people data-fetching stays manual (accepted residual for debt-001). Applied debt-005 (`errorMessage`) across the people area instead — use-people-mutations.ts (6 sites), people-match-faces-wizard.tsx (5), people-page.tsx (1). Zero-risk, behavior-preserving.

## 5. Media mutation components → useMutation (LOWER priority, smaller savings)

<!-- context:
  - ui/src/features/media/components/upload-modal.tsx
  - ui/src/features/media/components/BulkDateModal.tsx
  - ui/src/features/media/components/media-viewer/media-viewer-reassign-modal.tsx
  - ui/src/features/media/components/media-viewer/inline-assign-bar.tsx
  - ui/src/features/media/api.ts
-->

- [x] 5.1 `media-viewer-reassign-modal.tsx` and `inline-assign-bar.tsx`: ACCEPTED RESIDUAL. Neither reads server state (people arrive via props) and the only action is a one-shot `createPerson` whose result is handed to a parent callback — there is no query cache to invalidate, so `useMutation` adds no consistency benefit, only wrapper code. They also intentionally use `instanceof Error` (broader than ApiError), so they are not debt-005 sites. Left manual.
- [x] 5.2 `upload-modal.tsx` and `BulkDateModal.tsx`: ACCEPTED RESIDUAL. `BulkDateModal` is a validate-then-`bulkPatchDateTaken` form whose result drives partial-failure messaging and whose success calls the parent `onDone()` (no local cache to invalidate); `upload-modal` owns multi-file progress and an abortable name-conflict check that react-query fits poorly. `useMutation` yields no net LOC reduction and risks the progress/abort behavior. Their `catch` blocks use bare/`instanceof Error` handling, not the ApiError idiom. Left manual.
- [x] 5.3 Re-evaluated: per the escape hatch, no section-5 component shows net LOC reduction or consistency gain from migration. All marked accepted in the register. No churn.

## 6. Verification

- [x] 6.1 `npx tsc -b` / `npm run build` — passes (type safety is the primary net for this refactor).
- [x] 6.2 `npm run lint` — passes with zero warnings (warnings are errors per pre-commit).
- [x] 6.3 `npx vitest run` — all existing tests pass (140 passed, 22 todo; no regressions).
- [x] 6.4 Confirmed: migrated admin read tabs + data-explorer hold only mutation-error state, no read-loading state. All other read-loading state is in documented accepted residuals (duplicate-reviewer, people hooks, section-5 modals).
- [ ] 6.5 Manual smoke checklist (record pass/fail per item in the PR): - Admin → Users/Directory: list loads; create, edit, delete reflect immediately; invalid/duplicate email errors still render via Alert. - Admin → Whitelist: list + person dropdown load; add and remove reflect immediately. - Admin → File issues: list loads; Refresh, Clear flag, Re-index, Delete behave as before. - Admin → DB backup: list loads and sorts newest-first; "Show all" works; Restore confirms then reloads. - Admin → Data explorer: pick a table; search + paginate; insert/edit/delete a row reflects without manual refresh. - People page (if section 4 done): list + selected-person preview + merge suggestions load; merge/rename/add/delete behave as before; Escape closes modals.
- [x] 6.6 Updated `.grimoire/docs/debt-register.yml`: `debt-001` migration scope complete (admin reads converted; sections 3-5 documented accepted residuals); `debt-005` `status: resolved` (idiom 39 → 0).

```

```
