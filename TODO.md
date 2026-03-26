# Refactor & Accessibility TODOs

This file tracks the refactor/a11y work identified in review. Each item should be completed in a minimal, self-contained change set and committed with a clear message.

## Server

- [x] **s3-streaming-downloads**: Refactor S3 restore/sync downloads to stream-to-disk (replace `streamToBuffer` + `writeFile`) in `server/src/s3/sync.ts` for `runSync()` downloads and `tryRestore*FromBackup()` paths; add basic integrity/error handling and keep progress reporting.
- [x] **server-request-validation**: Standardize request validation + error responses: add Zod schemas for params/query/body, create a small validate helper (or middleware) that throws `ZodError`/`HttpError`, and refactor `server/src/routes/media.ts` (and other routes) to use it consistently.
- [x] **split-media-service-and-routes**: Split `server/src/services/media-service.ts` into focused modules (read/preview/thumbnail, write/delete/patch, faces/tagging) and split `server/src/routes/media.ts` into sub-routers; keep dependency direction routes→services→db/infra.
- [x] **explicit-db-migrations**: Replace import-time schema creation/ALTERs in `server/src/db/media.ts` with explicit migrations (schema version table + sequential migration functions), called from startup.
- [x] **unify-mime-type-helpers**: De-duplicate MIME/type helpers: consolidate `TEXT_MIMES` and `isText`/image/video checks into shared utilities (server and UI as appropriate) to prevent drift.
- [x] **server-logging-consistency**: Eliminate `console.*` in server runtime paths; route all logs through `pino` (`req.log`/`logger`) with consistent event names/metadata (indexing, faces, S3 sync, deletes).
- [x] **standardize-service-result-shapes**: Standardize service return types across server services: prefer discriminated unions with `ok` + `reason` and keep throwing for truly unexpected errors; simplify route status mapping.
- [x] **faces-tfjs-io-optimization**: (PR) Improve `server/src/faces.ts` robustness with minimal behavioral change: replace `console.error` with `logger`, add simple size/format guardrails for obviously-bad inputs, and keep the existing single-flight detect queue intact.
- [x] **backup-route-logging**: (PR) Replace background `console.error` in `server/src/routes/backup.ts` (post `/run` async execute catch) with structured `logger` and relevant metadata; no other refactors.
- [x] **auth-route-validation-logging**: (PR) Refactor `server/src/routes/auth.ts` minimally: replace `console.error` with `logger` and use a shared validation helper for `/magic-link` input + `/me/people` body parsing; keep endpoints and responses stable.

## Shared

- [x] **shared-api-types-source-of-truth**: Resolve `shared/src/api.ts` vs `shared/src/api.d.ts` duplication: make one the source of truth (generate the other if required) and add a check to prevent drift.

## UI

- [x] **ui-upload-refactor**: Remove duplicated upload/progress logic between `ui/src/features/media/components/file-upload.tsx` and `upload-modal.tsx`: extract a reusable uploader hook/util, unify progress model and error handling, and keep UI components thin.
- [x] **ui-api-client-adoption**: (PR) Replace raw `fetch('/api/...')` in one focused area at a time with `apiJson/apiFetch` from `ui/src/api/client.ts` (includes credentials + consistent error parsing). Start with media viewer/content + upload name-check endpoints only.
- [x] **ui-viewer-dialog-semantics**: (PR) Make `MediaViewer` a real modal dialog: refactor `ui/src/features/media/components/media-viewer.tsx` (+ `media-viewer-content.tsx` as needed) to use `ModalRoot`/`ModalPanel`, add `aria-modal`, and ensure a label via `aria-labelledby`/`aria-label`; keep click-backdrop-to-close and Escape behavior while preserving focus trap + focus restore.
- [x] **ui-people-image-viewer-dialog-semantics**: (PR) Make `PeopleImageViewer` an accessible modal dialog: refactor `ui/src/features/people/components/people-image-viewer.tsx` to use `ModalRoot`/`ModalPanel`, add proper dialog labelling, and fix the 'Reassign to' label/select association (add `id`+`htmlFor` or wrap select).
- [x] **ui-login-form-labels**: (PR) Fix login form semantics in `ui/src/features/auth/components/login-page.tsx`: add an explicit `<label>` (or `aria-label`) for the email input (don’t rely on placeholder), ensure error text is connected via `aria-describedby`, and keep visuals unchanged.
- [x] **ui-image-alt-audit**: (PR) Audit all `<img>`/preview components for correct `alt` usage: ensure non-decorative images have meaningful `alt`; decorative images use `alt=""` and/or `aria-hidden`. Focus on `people-detail.tsx`, `people-image-viewer.tsx`, `upload-modal-confirm.tsx`, `people-match-faces-wizard.tsx`, `media-viewer-content.tsx`, and `media-item-cell.tsx`.
- [x] **ui-checkbox-interaction-semantics**: (PR) Fix checkbox semantics in `ui/src/features/media/components/media-viewer/media-item-cell.tsx`: replace no-op `onChange={() => {}}` + `onClick` with a proper `onChange` handler, keep selection-mode behavior, and ensure keyboard/screen-reader interaction matches visuals.
- [x] **ui-base-button-adoption-media-viewer**: (PR) Replace raw `<button>` + inline styles in `ui/src/features/media/components/media-viewer/media-viewer-content.tsx` with the shared `Button` component (and minimal class/style tweaks) so button semantics/disabled states are consistent.
- [x] **indexing-manual-vs-auto-tags**: Clarify and (if needed) refactor indexing so bulk re-index doesn’t overwrite manual tags: track tag source (auto/manual) via separate table or column; update indexing/people flows accordingly.

## Agent Readability Refactors

- [x] **split-use-people-page-hook**: Split `ui/src/features/people/components/use-people-page.ts` into focused hooks/modules (`use-people-list`, `use-people-preview`, `use-people-mutations`, `use-people-ui-state`) so each file has one concern and lower side-effect coupling.
- [ ] **split-use-home-page-hook**: Split `ui/src/features/media/hooks/use-home-page.ts` into focused hooks/modules (`use-media-list-query`, `use-media-selection`, `use-media-search`, `use-media-bulk-actions`) to reduce cross-concern state and simplify edits.
- [ ] **feature-api-clients**: Replace remaining raw `fetch` calls in UI feature hooks/components with typed feature API modules (e.g. `features/people/api.ts`, `features/media/api.ts`, `features/backup/api.ts`) that centralize request/response/error handling.
- [ ] **split-ui-components-css**: Break `ui/src/styles/components.css` into feature-scoped style files (media, people, admin, shared-ui) and keep selectors colocated with owning feature for easier agent navigation.

