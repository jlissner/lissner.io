# Tasks: add-rich-search-tags-people

> **Change**: Rich search with custom media tags, `@person` handles, and boolean `#tag` queries (see manifest)
> **Features**: `.grimoire/changes/add-rich-search-tags-people/features/search/rich-search.feature`
> **Decisions**: `.grimoire/changes/add-rich-search-tags-people/decisions/0001-search-query-language.md`
> **Test command (project)**: `npm test`
> **Lint**: `npm run lint`
> **Agents**: `.grimoire/config.yaml` uses `custom` for both thinking and coding—no special split.
> **Status**: complete tasks complete

## Reuse (do not reimplement)

- **Embeddings**: `server/src/embeddings.js` — `getEmbedding`, `cosineSimilarity`
- **Search orchestration shape**: `server/src/services/search-service.ts` — replace inner matching logic; keep `mapSearchItems` / error envelope patterns
- **People → media**: `server/src/db/media-people.ts` — `getPersonNames`, `getMediaForPerson`, `getImagePeople` (or equivalents) for `@handle` resolution
- **Validation**: `server/src/validation/parse.ts` — `parseWithSchema`; add Zod schemas beside existing `server/src/validation/search-schemas.ts` / `media-schemas.ts`
- **UI search**: `ui/src/features/media/hooks/use-media-search.ts` — still calls `search?q=`; widen if error responses need handling
- **Tests style**: Vitest, co-located `*.test.ts` (no Cucumber in this repo)—**each scenario maps to Vitest tests** describing the same Given/When/Then assertions

---

## 1. Schema and DB — user tags

<!-- context:
  - .grimoire/changes/add-rich-search-tags-people/decisions/0001-search-query-language.md
  - server/src/db/media-migrations.ts
  - server/src/db/media-write.ts
  - server/src/db/media.ts
-->

- [x] **1.1 Red —** Add `server/src/db/media-tags.test.ts` (or extend an existing db test file if you prefer one file per domain) that **fails** until migration exists: open an in-memory DB, run `runMediaMigrations`, assert table `media_tags` exists with columns `media_id`, `tag` and uniqueness suitable for “one row per tag per media” - **Scenario trace**: groundwork for “User adds and removes tags”
- [x] **1.2** In `server/src/db/media-migrations.ts`, add migration version **12**: create `media_tags` with `media_id TEXT NOT NULL REFERENCES media(id) ON DELETE CASCADE`, `tag TEXT NOT NULL` (store **normalized** tag, e.g. lowercased per ADR), `PRIMARY KEY (media_id, tag)`, and index `idx_media_tags_tag` on `tag` for listing/filter
- [x] **1.3** Add `server/src/db/media-tags.ts` (or `media-tags-read.ts` / `media-tags-write.ts` if you split read/write like other domains) exporting: - `listTagsForMedia(mediaId: string): string[]` - `setTagsForMedia(mediaId: string, tags: string[]): void` — replace all tags for that media in a transaction (normalize inputs) - `addTag(mediaId, tag)` / `removeTag(mediaId, tag)` **or** only `setTagsForMedia` if UI sends full list (pick one; minimal surface) - `listDistinctTags(): string[]` sorted for stable API - `getMediaIdsForTag(normalizedTag: string): string[]` (or a prepared query) for search
- [x] **1.4** Export new helpers from `server/src/db/media.ts` (barrel) if that is the project pattern
- [x] **1.5 Green —** `1.1` tests pass; add a test that insert media row + tags round-trips `listTagsForMedia` / `listDistinctTags`

---

## 2. Tag management — service + routes

<!-- context:
  - .grimoire/changes/add-rich-search-tags-people/features/search/rich-search.feature
  - server/src/services/media-read-service.ts
  - server/src/routes/media/write-routes.ts
  - server/src/routes/media/read-routes.ts
  - server/src/validation/media-schemas.ts
  - shared/src/api.ts
-->

- [x] **2.1 Red —** Add `server/src/services/media-tags-service.test.ts` with Vitest mocks on `db` **or** lightweight integration: assert `setMediaTags` / `getMediaTags` behavior (success + unknown media → `not_found` union)
- [x] **2.2** Implement `server/src/services/media-tags-service.ts`: - Input/output as discriminated unions (`ok: true` / `ok: false, reason: ...`) - Functions: get tags for media, replace tags (normalize), list all distinct tags
- [x] **2.3** Wire routes: - `PUT` or `PATCH` `server/src/routes/media/write-routes.ts`: `/:id/tags` with body `{ tags: string[] }` (Zod in `media-schemas.ts`) — **register route before** `/:id` patterns if Express ordering requires it (check existing order) - `GET` `server/src/routes/media/read-routes.ts`: `/:id/tags` **or** include `tags: string[]` in `GET /:id/details` via `getMediaDetailsEnriched` — **pick one** place so the UI can show tags without N+1; ADR does not mandate, prefer **details payload** if home view already loads details sparingly - `GET` `server/src/routes/search.ts`: `/tags` listing distinct tags **or** under `media` router `GET /tags` — choose one URL and document in shared types; recommend `GET /api/media/tags` to keep “media concerns” together
- [x] **2.4** Update `shared/src/api.ts` with request/response types for tag list and patch
- [x] **2.5 Green —** Extend `2.1` tests; add `server/src/routes/`-level test only if project has route test helpers—otherwise service tests + manual curl are enough **if** manifest assumptions accept it (prefer adding a small `media-tags-service.test.ts` integration using temp DB if feasible)

---

## 3. Query parser — normalization + AST

<!-- context:
  - .grimoire/changes/add-rich-search-tags-people/decisions/0001-search-query-language.md
  - .grimoire/changes/add-rich-search-tags-people/features/search/rich-search.feature
-->

- [x] **3.1 Red —** Add `server/src/lib/search-query-parser.test.ts`: - **Normalize**: tag `#Summer2025` → same canonical form as storage - **Person handle**: `normalizePersonHandle("Joe Lissner")` === `joelissner` and matches `@joelissner` - **Parse**: `(#summer2025 OR #summer2024) AND @joelissner AND water` produces an AST with `OR` of two tag leaves, `AND`-chained with person leaf and free-text `water` - **Precedence**: `a AND b OR c` parses as `(a AND b) OR c` (document in test name) - **Invalid**: `(#broken` throws or returns `ParseError` union—match what `search-service` will turn into 400 + stable `code`
- [x] **3.2** Implement `server/src/lib/search-query-normalize.ts` (or single `search-query-parser.ts`) exporting: - `normalizeTagToken`, `normalizePersonHandle` - `parseSearchQuery(q: string): ParseResult` where `ParseResult` is discriminated union `{ ok: true, ast } | { ok: false, message }` - Tokenizer treats `#`, `@`, `(`, `)`, words, recognizes `AND`/`OR` case-insensitively; free-text joins word tokens between operators (per ADR)
- [x] **3.3 Green —** all `3.1` tests pass

---

## 4. Search evaluation — combine sets + embeddings

<!-- context:
  - server/src/services/search-service.ts
  - server/src/db/media-tags.ts (new)
  - server/src/db/media-people.ts
  - server/src/db/media-read.ts
  - server/src/lib/search-query-parser.ts
-->

- [x] **4.1 Red —** Add `server/src/services/search-service.test.ts`: - Mock `getEmbedding` to return a fixed vector; mock `db.getEmbeddings` with 1–2 rows; **mock** tag + person DB calls - Assert: for a parsed query that is **only** `(#a OR #b)`, result IDs are union; with `AND @h`, intersection with person’s media set; with trailing free text, result ⊆ embedding top-N **after** set logic (per ADR) - Assert: legacy behavior preserved when query has **no** `#`/`@`/`AND`/`OR`/`(` — single embedding search like today (so existing users are not broken)
- [x] **4.2** Refactor `searchMediaByQuery` in `server/src/services/search-service.ts`: - If `parseSearchQuery` fails → return `{ ok: false, reason: 'invalid_query', message }` or reuse `missing_query` / new code; route maps to **400** with `code` e.g. `search_query_invalid` (** satisfy “Invalid query” scenario**) - If AST has only legacy free-text (optional fast path): keep existing cosine path - Else: evaluate AST to ordered `string[]` of `media_id` (respect gallery hide filter at end as now) - Implement **person leaf**: map `@token` → `person_id` by comparing `normalizePersonHandle(name)` to `normalizePersonHandle(token)`; if multiple IDs match, deterministic lowest `person_id` (document in code comment—pre-mortem acceptance) - Implement **tag leaf**: use `getMediaIdsForTag` - **Free-text leaf**: call `getEmbedding` on **free-text span only**; score/cutoff like current top 20
- [x] **4.3** Remove or narrow old behavior that merges **substring** person name match into every query (replace with `@`-driven matching only) **or** keep substring match **only** when query has no structured tokens—flag as product choice in implementation comment; **minimal change**: drop substring hack when parser detects structured query; plain text query keeps old substring + embedding behavior for backward compatibility
- [x] **4.4 Green —** `4.1` passes; run `npm test`

---

## 5. HTTP layer + shared errors

<!-- context:
  - server/src/routes/search.ts
  - server/src/lib/api-error.ts
  - server/src/validation/search-schemas.ts
-->

- [x] **5.1** Extend `searchListQuerySchema` if needed (still `q` string)
- [x] **5.2** In `server/src/routes/search.ts`, map parse failures to `sendApiError` **400** with human-readable message + stable `code`
- [x] **5.3** Add `search_query_invalid` (or chosen name) to `server/src/lib/api-error.ts` union if those errors are typed there
- [x] **5.4 Red/Green —** Add test in `server/src/validation/search-schemas.test.ts` only for schema; parser tests already cover language—optional supertest not required if unavailable

---

## 6. UI — manage tags + search unchanged string

<!-- context:
  - ui/src/features/media/hooks/use-media-search.ts
  - ui/src/features/media/components/home-page-toolbar.tsx
  - ui/src/features/media/api.ts
  - Find media detail / viewer component that loads `details` for a single item
-->

- [x] **6.1** Add API client helpers in `ui/src/features/media/api.ts` for tag list + update (match `shared/src/api.ts`)
- [x] **6.2** Where media details are shown (e.g. viewer sidebar or detail modal—locate in `ui/src/features/media/`), show **editable tag list** (chips + input; reuse existing form/button styles from `ui/src/components/`). On save, call PUT/PATCH tags endpoint; show errors from API
- [x] **6.3** Optionally show **distinct tags** autocomplete when typing `#` in search box—**flag as optional** in manifest if time-boxed; core deliverable is manual `#` + `@` + words in the search box **without** breaking existing search button flow
- [x] **6.4** No automated UI test required unless project already uses RTL/vitest for components—if not, manual verification step in section 7

---

## 7. Verification

<!-- context:
  - .grimoire/changes/add-rich-search-tags-people/features/search/rich-search.feature
  - package.json scripts
-->

- [x] **7.1** `npm run lint`
- [x] **7.2** `npm test` — full suite green
- [x] **7.3** `npm run build` — tsc + vite
- [x] **7.4** Manual walkthrough of Gherkin scenarios (or add one thin end-to-end script under `scripts/` **only if** repo pattern exists—otherwise skip)
- [x] **7.5** Confirm ADR **Confirmation** items: parser tests + integrated search test from `4.1` done

---

## Design review (optional)

After you approve this file, run **grimoire-review** for PM/architecture/security pass, or proceed to **grimoire-apply** if you want to implement immediately.
