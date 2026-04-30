# Tasks: improve-face-matching-accuracy

> **Change**: Improve face detection quality signals, dismissible low-confidence regions, always-confirm placeholder merges, and admin-only library re-index with defined outcomes.
> **Features**: `features/people/face-matching-quality.feature`, `features/admin/admin-library-reindex.feature` (promoted from this change directory)
> **Decisions**: `.grimoire/changes/improve-face-matching-accuracy/decisions/0005-face-matching-quality-strategy.md`
> **Test command**: `npm run test:bdd` (full suite: `features/**/*.feature`)
> **Status**: 36/36 tasks complete

**Note:** `.grimoire/docs/` has no area markdown files yet; each section’s `<!-- context: -->` lists concrete source files to load.

## Reuse

- `server/src/db/media-people.ts` — `setImagePeople`, `deleteAutoTagsForMedia`, `getTaggedFacesInMedia`, `confidence` + `source` columns on `image_people`
- `server/src/indexing/media.ts` — `indexMediaItems` bulk path already clears auto tags then `setImagePeople`; preserves manual rows via `setImagePeople` implementation
- `server/src/services/media-read-service.ts` — `getFacesPayloadForMedia` for `GET /api/media/:id/faces`
- `server/src/services/search-service.ts` — `startBulkIndexingJob`, `getIndexStatusBody`
- `server/src/auth/middleware.ts` — `requireAdmin`
- `server/src/services/person-face-match.ts` — `runFaceMatchBatch` (remove silent merge block)
- `features/step-definitions/admin-tools.steps.ts` — `signAdminCookie`, `requestJson`, server boot pattern
- `features/support/test-env.ts` — BDD temp `DATA_DIR`, env defaults
- Cucumber: `features/step-definitions/**/*.ts`, `@cucumber/cucumber`

## 0. Promote specs and fixtures

<!-- context:
  - .grimoire/changes/improve-face-matching-accuracy/features/people/face-matching-quality.feature
  - .grimoire/changes/improve-face-matching-accuracy/features/admin/admin-library-reindex.feature
-->

- [x] **0.1** Copy `face-matching-quality.feature` into `features/people/face-matching-quality.feature` (same contents as the grimoire change version) so `npm run test:bdd` picks it up.
- [x] **0.2** Copy `admin-library-reindex.feature` into `features/admin/admin-library-reindex.feature`.
- [x] **0.3** Add `features/fixtures/people/single-clear-face.jpg` (or `.png`): one clearly visible front-facing face, small file size, safe license (project-generated or permissive asset).
- [x] **0.4** Add `features/fixtures/people/no-human-face.jpg`: scene with **no** human faces (texture/object/landscape) suitable for asserting low-confidence / dismiss behavior when the detector still fires.

## 1. Spike: detector confidence signal

<!-- context:
  - server/src/faces.ts
  - node_modules/@vladmandic/human (types or README — read only what’s needed)
-->

- [x] **1.1** Spike (short doc comment in `tasks.md` or inline finding in a `server/src/faces.test.ts` / one-off vitest): inspect `Human.detect` face result fields for a score/confidence/quality value usable for “low confidence” labeling. Record in a **single** `server/src/faces.ts` block comment (why threshold) or in `person-face-match.ts` adjacent module **only if** needed—prefer minimal comment.
- [x] **1.2** Extend `FaceInImage` in `server/src/faces.ts` with optional numeric `detectorScore` (or reuse Human’s field name) populated when available; default to `null` when not exposed.

## 2. Indexing: persist meaningful confidence for auto tags

<!-- context:
  - server/src/faces.ts
  - server/src/indexing/media.ts
  - server/src/db/media-people.ts
-->

- [x] **2.1** When writing auto `image_people` rows from clustering (`ImagePersonEntry`), ensure `confidence` stored in DB reflects **detector-backed** strength where available (e.g. map Human score into `0..1`, or combine with cluster `confidence` already computed). Goal: false positives on `no-human-face` fixture get **low** numeric confidence; `single-clear-face` gets **high** confidence.
- [x] **2.2** Align bulk `indexMediaItems` path so per-face confidence semantics match single-item `indexMediaItem` (no silent divergence between code paths).

## 3. API + types: expose confidence and source on tagged faces

<!-- context:
  - server/src/services/media-read-service.ts
  - server/src/routes/media/read-routes.ts
  - shared/src/api.ts (or wherever media face DTOs live)
  - ui/src/features/media/api.ts
  - ui/src/features/media/components/media-viewer/media-viewer-types.ts
-->

- [x] **3.1** Extend `getFacesPayloadForMedia` `body.tagged[]` entries to include `confidence` (nullable) and `source` (`"auto"` | `"manual"`) so the UI can render low-confidence and gate dismiss.
- [x] **3.2** Update shared/UI types for `listMediaFaces` response accordingly; keep backward compatibility for clients that ignore new fields.

## 4. UI: low-confidence indication and dismiss every auto region

<!-- context:
  - ui/src/features/media/components/media-viewer/media-viewer-face-overlay.tsx
  - ui/src/features/media/components/media-viewer/resizable-face-box.tsx
  - ui/src/features/media/components/media-viewer/use-media-viewer-faces.ts
  - ui/src/features/media/api.ts
-->

- [x] **4.1** For **tagged** faces with `source === "auto"` and confidence below an agreed threshold (constant next to face code or shared), show a visible **low confidence** treatment (badge, border, or `aria-label` + tooltip text—pick one consistent pattern).
- [x] **4.2** Provide **Dismiss** on each **auto** tagged face (calls existing `removePersonFromMedia` / API used elsewhere for untagging) so every such region is dismissible without assigning.
- [x] **4.3** Ensure **manual** and **confirmed** tags are not shown as low-confidence dismiss-only ghost tags (respect `source` / confirm semantics from `confirmFaceTag` flow).

## 5. Batch face match: remove silent auto-merge

<!-- context:
  - server/src/services/person-face-match.ts
  - shared/src/activity.ts or shared types for `FaceMatchRunResponse` (grep `FaceMatchRunResponse`)
  - ui/src/features/people/components/people-match-faces-wizard.tsx
-->

- [x] **5.1** Remove the `AUTO_MERGE_MATCH_SCORE` loop from `runFaceMatchBatch`: **never** call `mergePeople` inside this function. Always return placeholders in `reviewQueue` (and optionally keep `autoMerged` as an **empty array** for API stability, or remove after updating UI—prefer **empty array** + deprecate in TS JSDoc if needed).
- [x] **5.2** Update `people-match-faces-wizard.tsx` (and any caller) to assume **all** resolutions go through explicit user merge/confirm; remove UX that relied on silent auto-merge notifications.
- [x] **5.3** Vitest: `server/src/services/person-face-match.test.ts` (create if missing) — seed two people + placeholder descriptors via DB helpers or minimal mocks; assert `runFaceMatchBatch` returns `autoMerged.length === 0` and review entries still list strong matches.

## 6. Admin-only re-index API

<!-- context:
  - server/src/routes/search.ts
  - server/src/bootstrap/server.ts
  - server/src/auth/middleware.ts
  - server/src/services/search-service.ts
-->

<!-- Apply note: POST `/index` uses `requireAdminForFullLibraryForceIndex` — admin required for full-library `force=true` without `mediaIds`; non-admin may still POST `force=true` with a non-empty `mediaIds` body. Cancel and clear use `requireAdmin`. -->

- [x] **6.1** Require `requireAdmin` for `POST /api/search/index`, `POST /api/search/index/cancel`, and `POST /api/search/index/clear` (destructive/clear aligns with admin-only maintenance). Non-admin → **403** with existing API error style (`sendApiError` / stable code string).
- [x] **6.2** Keep `GET /api/search/index/status` authenticated as today (any signed-in user can observe progress **or** restrict to admin only if the UI only needs admin—pick **admin-only** if status leaks job metadata you want hidden; default **allow signed-in read** unless product says otherwise).
- [x] **6.3** Vitest or route test: non-admin JWT `POST /api/search/index?force=true` → 403; admin → 200/`started: true` (stub `startBulkIndexingJob` if needed to avoid long-running index in unit test).

## 7. Admin UI: start full library re-index

<!-- context:
  - ui/src/features/admin/ (grep `search/index`, `reindex`, `index`)
  - shared activity types for index job
-->

- [x] **7.1** Wire admin UI control “Re-index library” (or existing control) to `POST /api/search/index?force=true` with admin session; show progress using `GET /api/search/index/status` pattern already used elsewhere on home/admin.
- [x] **7.2** Ensure non-admin UI does not surface the control (defense in depth; API still 403).

## 8. Recall: clear primary face fixture

<!-- context:
  - server/src/faces.ts
  - server/src/indexing/media.ts
-->

- [x] **8.1** Tune Human `face.detector` options and/or clustering `FACE_SIMILARITY_THRESHOLD` only as needed so fixture `single-clear-face` reliably produces **≥1** auto tag after `indexMediaItem` in CI/BDD environment (may require allowing slight flakiness with retry **once** in step def—prefer fixing thresholds first).

## 9. Cucumber: shared / cross-feature steps

<!-- context:
  - features/step-definitions/auth.steps.ts
  - features/step-definitions/admin-tools.steps.ts
  - features/step-definitions/duplicates.steps.ts
-->

- [x] **9.1** Add `Given("I am signed in as a non-admin user", …)` if absent: JWT via `signAccessToken` with `isAdmin: false`, valid `sub`/`email`, set `world.cookie`.
- [x] **9.2** Add reusable steps for fixture upload + index: `Given fixture media {string} has been uploaded and fully indexed` — copy fixture bytes into `DATA_DIR` media storage using same mechanism as other upload BDD steps (see `duplicates.steps.ts` or media upload helpers); call internal indexer or HTTP upload + index API as existing tests do.
- [x] **9.3** Add `Given media exists that was previously indexed` — create minimal media row + embedding row + mark indexed id set consistent with app DB API.

## 10. Cucumber: `face-matching-quality.feature`

<!-- context:
  - features/people/face-matching-quality.feature
  - features/step-definitions/face-matching-quality.steps.ts (new file)
  - server/dist bootstrap for fetch
-->

- [x] **10.1** New file `features/step-definitions/face-matching-quality.steps.ts`. Implement **Given/When/Then** for: clear-face scenario — assert `GET /api/media/:id/faces` returns `tagged.length >= 1` OR `detected.length >= 1` per product choice (align with scenario wording “face region available for assignment”; prefer **tagged** after indexing to match user language).
- [x] **10.2** Low-confidence + dismiss: open viewer equivalent via API — assert each **auto** tagged face has `confidence` below threshold **or** explicit `lowConfidence: true` if you add a derived flag; assert `DELETE`/`remove` endpoint removes each tag when step simulates dismiss (loop until none).
- [x] **10.3** Batch match scenarios: `POST /api/people/match-faces` (confirm route in `server/src/routes/people.ts`) with cookies; assert **no** `mergePeople` side effect: e.g. placeholder person id still present in `GET /api/people` list after batch; for strong match scenario assert response JSON includes suggested merge target **and** placeholder still exists until `POST /api/people/:id/merge` is called (do **not** call merge in the Then).

## 11. Cucumber: `admin-library-reindex.feature`

<!-- context:
  - features/admin/admin-library-reindex.feature
  - features/step-definitions/admin-reindex.steps.ts (new file) or extend `admin-tools.steps.ts`
-->

- [x] **11.1** `When I start a full library re-index from the admin tools` → `POST /api/search/index?force=true` with admin cookie; `Then` poll `GET /api/search/index/status` until `inProgress` false or timeout with helpful assert message.
- [x] **11.2** Non-admin `POST /api/search/index?force=true` → assert status **403**.
- [x] **11.3** Embedding refresh scenario: note a media id, call re-index, then query search/list endpoint or read embedding via internal db helper from step def world to assert embedding vector or `indexed` flag changed per acceptable observable (cosine similarity to a fixed query vector **or** timestamp field if exposed—**prefer** asserting `GET /api/search/` result order shifts when fixture text embedding mocked—if too heavy, assert `lastResult.indexed > 0` on job + media still listable).
- [x] **11.4** Preserve manual/confirmed link: seed `image_people` with `source='manual'` (and optional confirm), run re-index including that media id, assert row still exists with same `person_id`.

## 12. Verification

- [x] **12.1** `npm run build:server` then `npm run test:bdd` — all scenarios green including `@admin` tags.
- [x] **12.2** `npm test` (Vitest) — no regressions.
- [x] **12.3** `npm run lint`
- [x] **12.4** Manual: admin runs re-index from UI; non-admin account sees 403 in network tab if tampering `POST /api/search/index`.

<!-- SESSION: apply complete 2026-04-29. Cucumber steps live in `features/step-definitions/improve-face-matching.steps.ts`. BDD defaults in `features/support/test-env.ts`: stub embeddings, vision, optional face-detect off, face-match stub. ADR 0005 accepted to `.grimoire/decisions/`. -->
