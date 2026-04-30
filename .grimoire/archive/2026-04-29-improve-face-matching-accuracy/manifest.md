---
status: complete
date: 2026-04-29
archived: 2026-04-29
complexity: 3
branch: feat/improve-face-matching-accuracy
---

# Improve face detection and auto-matching accuracy

## Why

Users report three related problems: obvious faces are often missed after indexing, non-faces are sometimes shown as faces, and automatic matching of placeholder people to existing named people is frequently wrong (including aggressive auto-merge). The behavioral baseline in `features/people/people-and-faces.feature` covers people CRUD and manual face assignment but not detection quality, confidence/dismiss UX, merge confirmation policy, or admin re-index.

## Non-goals

- Replacing `@vladmandic/human` with a different face stack (only revisit after tuning and fixtures miss targets; see ADR).
- Non-admin bulk re-index or background re-index on a schedule.
- Batch-confirm or bulk-dismiss UI optimizations (may be a follow-up change).

## What Changes

### Features Added

- `features/people/face-matching-quality.feature` — detection/dismiss/low-confidence, batch matching **never** merges without confirmation (including strong matches).
- `features/admin/admin-library-reindex.feature` — **admin-only** full library re-index; non-admin rejected; defines post re-index outcomes for embeddings, automatic face tags, and preserved manual/confirmed links.

### Decisions Added

- `.grimoire/decisions/0005-face-matching-quality-strategy.md` — strategy: tuning/hybrid stack, **no silent merges**, admin re-index policy.

### Features Unchanged (baseline)

- `features/people/people-and-faces.feature` — manual assign/reassign/remove flows remain the baseline for editor behavior unless scenarios are later deduplicated.

## Stakeholder decisions (2026-04-29)

| Topic           | Decision                                                                                                                                                    |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fixtures        | Yes — add small committed fixture images (e.g. under `features/fixtures/people/`) for BDD.                                                                  |
| False positives | Low-confidence regions are acceptable if **clearly indicated**; **every** face region must be **dismissible**.                                              |
| Auto-merge      | **Always** require explicit confirmation — **no** silent merge, even for very strong similarity.                                                            |
| Re-index        | **Admin-only**; spec defines outcomes when re-index completes (embeddings refreshed, automatic face tags recomputed, manual and confirmed links preserved). |

## Overlap

- `.grimoire/changes/update-face-tagging-name-input/` (implementing) — person naming in selectors; coordinate if dismiss/confidence UI shares those components.
- Current `POST /api/search/index` is authenticated but not admin-only in code — this change **requires** tightening to match `admin-library-reindex.feature`.

## Prior Art

**Current implementation**

- **Detection**: `server/src/faces.ts` — `@vladmandic/human` with `face.detector` (rotation, up to 20 faces), mesh and description enabled; embeddings drive clustering and similarity via `human.match.similarity`.
- **Clustering (upload / bulk)**: Greedy merge into clusters when similarity `> 0.5` (`FACE_SIMILARITY_THRESHOLD`); `indexMediaItems` clears auto tags per image then `setImagePeople` replaces **auto** tags while **preserving manual** rows (`server/src/db/media-people.ts`).
- **Batch “match faces”**: `server/src/services/person-face-match.ts` — today auto-merges placeholder into named person when top suggestion `score >= 0.995` (to be removed per stakeholder decision).
- **Suggestions**: `server/src/services/person-merge-suggestions.ts` — re-extracts faces per sample, `maxPairwiseSimilarity`, `MIN_SUGGESTION_SIMILARITY` `0.42`, capped suggestions.

**Build vs buy**

- **Hybrid**: Tune Human + clustering + suggestion UX first; prove with fixtures; optional stack replace later if needed.

## Assumptions

| Assumption                                                                                                                                    | Evidence                                                                       |
| --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Fixture images can live under `features/fixtures/people/` with ids referenced in Gherkin                                                      | Stakeholder confirmed                                                          |
| Detector or pipeline can supply or derive a usable “low confidence” signal for labeling, or we define confidence tiers another verifiable way | Unvalidated — plan stage inspects Human outputs                                |
| “Confirmed” face links align with existing confirm flow (`confirmFaceTag` / stored semantics)                                                 | Code has manual vs auto `source`; confirm elevates confidence — verify in plan |
| Admins are the same role as `@admin` scenarios elsewhere                                                                                      | Matches `features/admin/*.feature` pattern                                     |

## Pre-Mortem

1. **Review queue fatigue** — no silent merges increases manual volume; mitigation: strong ranking, batch confirm patterns later (separate change if needed).
2. **Re-index abuse or overload** — admins trigger heavy jobs; mitigation: progress UI, cancel, rate limits (plan stage).
3. **Confidence labeling wrong** — users trust dismiss less; mitigation: fixtures + copy review.
4. **Flaky ML tests** — mitigation: pinned models, tolerances, or hybrid unit tests around non-ML boundaries.
