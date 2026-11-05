# Tasks: add-mass-delete-face-tags

> **Change**: Mass delete face tags from person details
> **Features**: features/people/people-and-faces.feature
> **Decisions**: none
> **Test command**: `npm test -- packages/server/src/services/people-grimoire-trace.test.ts`
> **Status**: 4/4 tasks complete

## Reuse

- `removeTagFromMedia` in `packages/pics/src/features/people/api.ts`
- `handleRemoveFromPhoto` in `use-people-mutations.ts` — extend with bulk
- `useMediaSelection` pattern from `packages/pics/src/features/media/hooks/use-media-selection.ts`
- Gallery confirm: `confirm(\`Delete ${ids.length} file(s)?\`)`in`use-media-bulk-actions.ts`

## 1. Bulk remove mutation

<!-- context:
  - packages/pics/src/features/people/components/use-people-mutations.ts
  - packages/pics/src/features/people/components/use-people-page.ts
-->

- [x] 1.1 Add `handleBulkRemoveFromPhotos(mediaIds: string[])` next to `handleRemoveFromPhoto`: confirm with `Remove tag from N photo(s)?`; if cancelled return; call `removeTagFromMedia` for each id via `Promise.allSettled`; filter removed ids from `previewMedia`; clear `viewingMedia` if it was removed; `fetchPeople` + `onUpdate`; toast on failure; return boolean
- [x] 1.2 Export handler from `use-people-page` and wire into `PeoplePage` → `PeopleDetail`

## 2. Person detail selection UI

<!-- context:
  - packages/pics/src/features/people/components/people-detail.tsx
  - packages/pics/src/styles/components.css (.detail__*)
-->

- [x] 2.1 Add selection state in `PeopleDetail` (Set of media ids); clear when `selectedId` changes; selection mode when size > 0
- [x] 2.2 Checkboxes on thumbs; in selection mode click toggles select, otherwise opens viewer; Select all visible + Cancel + Remove tags toolbar when selecting
- [x] 2.3 Styles for selected thumb / checkbox on detail grid (mirror media-cell checkbox placement)

## 3. Characterize / smoke

- [x] 3.1 Ensure lint passes for touched files; no `let`; functional style; BDD step stubs for new scenarios
