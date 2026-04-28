# Tasks: audit-baseline-documentation

> **Change**: Capture audited home gallery, people/faces, indexing & backup, and admin behavior as additive Gherkin baseline under `features/`, with Vitest trace anchors (no new product behavior).
> **Features**: `features/media/home-gallery.feature`, `features/people/people-and-faces.feature`, `features/indexing/indexing-and-backup.feature`, `features/admin/admin-tools.feature` (sources under this change directory until promoted).
> **Decisions**: none
> **Test command**: `npx vitest run` (full suite); narrow: `npx vitest run ui/src/features/media/home-gallery-grimoire-trace.test.ts` (adjust per task)
> **Status**: 14/14 tasks complete
> **Agents**: `.grimoire/config.yaml` sets `llm.thinking.command` and `llm.coding.command` to `custom` — apply stage may use default Cursor agents unless you override.
> **BDD**: No `tools.bdd_test` entry in `.grimoire/config.yaml`. Per manifest assumption, Vitest acts as the executable trace layer; `it.todo` marks scenarios awaiting deeper tests **over time** (does not fail CI).

## Reuse (do not reimplement)

- URL parsing / query key: `ui/src/features/media/lib/media-viewer-url.ts` (`MEDIA_URL_QUERY_KEY`, `parseMediaIdFromSearchString`), tests in `ui/src/features/media/lib/media-viewer-url.test.ts`
- Viewer URL sync: `ui/src/features/media/hooks/use-media-viewer-url-sync.ts`
- Image rotation (server): `server/src/services/media-rotate-service.ts`, `server/src/services/media-rotate-service.test.ts`
- People merge: `server/src/services/people-service.ts`, `server/src/services/people-service.test.ts`
- DB restore / backup keys: `server/src/s3/startup-db-restore.test.ts`
- Admin thumbnails: `server/src/routes/admin/thumbnails-routes.test.ts`
- Admin duplicates: `server/src/routes/admin/duplicates-routes.test.ts`, `ui/src/features/admin/lib/duplicates.test.ts`
- Indexing busy signal shape: `server/src/lib/api-error.test.ts` (`index_in_progress`)

## 0. Specification trace and assumptions

<!-- context:
  - .grimoire/changes/audit-baseline-documentation/manifest.md
  - ui/src/features/media/lib/media-viewer-url.ts
  - ui/src/features/media/hooks/use-media-viewer-url-sync.ts
-->

- [x] **0.1** In `ui/src/features/media/lib/media-viewer-url.test.ts`, add one `it` (or nested `describe`) titled to reference Gherkin scenario **"Deep link opens the viewer"** from `features/media/home-gallery.feature` after promotion: assert `MEDIA_URL_QUERY_KEY` is `"media"` and `parseMediaIdFromSearchString("?media=test-id")` is `"test-id"`. In a comment, point to `use-media-viewer-url-sync.ts` for dismiss/remove behavior so the manifest assumption (URL rules align with `MEDIA_URL_QUERY_KEY`) is evidenced in code review.
<!-- SESSION: Section 0 done. Deep-link describe added to media-viewer-url.test.ts. -->

## 1. Home media gallery and viewer

<!-- context:
  - .grimoire/changes/audit-baseline-documentation/features/media/home-gallery.feature
  - ui/src/features/media/lib/media-viewer-url.test.ts
  - ui/src/features/media/hooks/use-media-viewer-url-sync.ts
  - ui/src/features/media/components/home-page.tsx
  - ui/src/features/media/components/media-list.tsx
  - ui/src/features/media/components/TimelineScrubber.tsx
  - server/src/services/media-rotate-service.test.ts
-->

- [x] **1.1** **Vitest (stand-in for step defs)** — Create `ui/src/features/media/home-gallery-grimoire-trace.test.ts`. For each scenario in `home-gallery.feature`, add a `describe` or `it` whose title includes the exact scenario name:
  - **Media appears in the gallery** / **Open a media item from the grid** / **Bulk selection for actions** / **Timeline navigation on wide layout**: use `it.todo` with a one-line pointer to the responsible component file under `ui/src/features/media/components/` (from manifest prior art).
  - **Deep link opens the viewer** / **Close the viewer clears the deep link**: call `parseMediaIdFromSearchString` with representative query strings; assert non-null id when `?media=` present and that other params are preserved (reuse expectations style from `media-viewer-url.test.ts` — extend that file instead if you prefer a single file, but keep scenario titles visible).
  - **Rotate a still image**: import and invoke a **pure** function already under test (`rotateFaceBox90Clockwise` from `server/src/services/media-rotate-service` is server-only; if UI cannot import it, use `it.todo` pointing to `media-rotate-service.test.ts` and `media-viewer-content` instead — do not add new rotation API).
- [x] **1.2** **Baseline artifact** — Copy `.grimoire/changes/audit-baseline-documentation/features/media/home-gallery.feature` to **`features/media/home-gallery.feature`** (create `features/media/` if missing). Byte-identical to the approved draft unless you are fixing a typo agreed with the reviewer.

## 2. People and face assignment

<!-- context:
  - .grimoire/changes/audit-baseline-documentation/features/people/people-and-faces.feature
  - server/src/services/people-service.ts
  - server/src/services/people-service.test.ts
  - ui/src/features/people/components/people-page.tsx
  - ui/src/features/people/components/people-merge-modal.tsx
-->

- [x] **2.1** **Vitest (stand-in for step defs)** — Add `server/src/services/people-grimoire-trace.test.ts` (or extend `people-service.test.ts` if you want fewer files) with `describe` titles matching scenarios in `people-and-faces.feature`:
  - **Merge two people**: add `it` that references scenario title and re-asserts an existing success path from `people-service.test.ts` (e.g. `mergePeople(1, 2)` → `{ ok: true, ... }`) so the Gherkin trace stays grep-friendly.
  - **List people**, **Create a person**, **Rename a person**, **Preview photos for a person**, **Assign a face on media from the viewer**, **Remove or reassign a face link**: `it.todo` each with pointers to `people-page.tsx`, modals under `ui/src/features/people/components/`, and any existing route tests if you find them (search `server/src/routes/people.ts` callers).
- [x] **2.2** **Baseline artifact** — Copy `.grimoire/changes/audit-baseline-documentation/features/people/people-and-faces.feature` to **`features/people/people-and-faces.feature`**.

## 3. Search indexing, activity, and manual backup

<!-- context:
  - .grimoire/changes/audit-baseline-documentation/features/indexing/indexing-and-backup.feature
  - server/src/s3/startup-db-restore.test.ts
  - server/src/lib/api-error.test.ts
  - server/src/routes/backup.ts
  - server/src/routes/activity.ts
-->

- [x] **3.1** **Vitest (stand-in for step defs)** — Add `server/src/indexing-and-backup-grimoire-trace.test.ts` with scenario-titled blocks:
  - **Trigger indexing for new or changed media** / **See indexing progress** / **Cancel indexing when supported**: `it.todo` pointing to `server/src/routes/activity.ts` and any job/index entrypoints (search `index` in `server/src/routes`); do not add new routes.
  - **Manual backup run** / **Backup status is readable**: reference `server/src/routes/backup.ts` and existing assertions in `startup-db-restore.test.ts` / `api-error.test.ts` where they relate to backup or `index_in_progress`; use `it.todo` if no direct test exists yet.
- [x] **3.2** **Baseline artifact** — Copy `.grimoire/changes/audit-baseline-documentation/features/indexing/indexing-and-backup.feature` to **`features/indexing/indexing-and-backup.feature`**.

## 4. Admin tools beyond duplicate detection

<!-- context:
  - .grimoire/changes/audit-baseline-documentation/features/admin/admin-tools.feature
  - server/src/routes/admin/thumbnails-routes.test.ts
  - server/src/services/admin-service-flags.test.ts
  - server/src/routes/admin/duplicates-routes.test.ts
-->

- [x] **4.1** **Vitest (stand-in for step defs)** — Add `server/src/admin-tools-grimoire-trace.test.ts` with scenario-titled blocks:
  - **Repair thumbnails**: reference existing cases in `thumbnails-routes.test.ts` (import or duplicate minimal assertion only if it keeps the file self-contained; otherwise `it.todo` pointing to that test file).
  - **View and edit email whitelist** / **SQL explorer when enabled** / **List database backups** / **Restore database from a backup** / **Data explorer browse tables**: `it.todo` each with pointers under `server/src/routes/admin/` and `server/src/routes/admin/db-backup-routes.ts` (from manifest prior art).
- [x] **4.2** **Baseline artifact** — Copy `.grimoire/changes/audit-baseline-documentation/features/admin/admin-tools.feature` to **`features/admin/admin-tools.feature`** (additive alongside `features/admin/duplicates.feature`).

## 5. Manifest hygiene

<!-- context:
  - .grimoire/changes/audit-baseline-documentation/manifest.md
-->

- [x] **5.1** Update **Assumptions** in `.grimoire/changes/audit-baseline-documentation/manifest.md`: mark the URL/query-key assumption checkbox **checked** once task 0.1 is done, or add a short note under the assumption if anything diverged during implementation.

## 6. Verification

- [x] **6.1** Run `npx vitest run` — all tests green; `it.todo` entries do not fail.
- [x] **6.2** Run `npm run lint` — new trace files pass ESLint.
- [x] **6.3** Confirm four files exist at repo root: `features/media/home-gallery.feature`, `features/people/people-and-faces.feature`, `features/indexing/indexing-and-backup.feature`, `features/admin/admin-tools.feature`, and match the change-directory drafts.
- [x] **6.4** Optional: `npm run build` if your team gates documentation-only PRs on build (manifest non-goals: no runtime behavior change expected).
