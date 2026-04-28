---
status: approved
branch: feat/audit-baseline-documentation
complexity: 4
---

# Change: Audit — baseline documentation for core product areas

## Why

A grimoire audit found substantial user-facing behavior (home gallery, people/faces, indexing & backup runtime, admin tools beyond duplicates) with no Gherkin coverage in `features/`. This change captures that behavior as approved baseline specs so future work can trace requirements and regressions.

## Prior art (code pointers)

- Home: `ui/src/features/media/components/home-page.tsx`, `media-list.tsx`, `media-viewer/*`, `TimelineScrubber.tsx`, `use-media-viewer-url-sync.ts`
- APIs: `server/src/routes/media/*`, `people.ts`, `search.ts`, `activity.ts`, `backup.ts`, `routes/admin/*`

## Non-goals

- Implementing new behavior — documentation only.
- Replacing existing feature files (`rich-search`, `duplicates`, etc.) — additive only.

## Assumptions

- [x] Scenarios describe externally observable behavior; step definitions will map to existing Vitest/API tests over time. (Addressed for this change: `*grimoire-trace.test.ts` files and `it.todo` pointers; full coverage is follow-up work.)
- [x] Deep-link and URL rules align with `MEDIA_URL_QUERY_KEY` and current auth-gated shell. (Evidenced in `ui/src/features/media/lib/media-viewer-url.test.ts` and `use-media-viewer-url-sync.ts`.)

## Feature changes

| Action    | Path                                            |
| --------- | ----------------------------------------------- |
| **ADDED** | `features/media/home-gallery.feature`           |
| **ADDED** | `features/people/people-and-faces.feature`      |
| **ADDED** | `features/indexing/indexing-and-backup.feature` |
| **ADDED** | `features/admin/admin-tools.feature`            |

## Decisions

- None in this change (audit follow-up can add ADRs for e.g. S3 sync model, face pipeline, if desired).

## Next steps

1. Review / approve manifest → `status: approved`
2. `grimoire-plan` (or manual `tasks.md`) for step-definition mapping
3. After implementation verification, copy `features/*` from this change into repo-root `features/` and archive
