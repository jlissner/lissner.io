---
status: implementing
date: 2026-11-05
complexity: 2
branch: feat/mass-delete-face-tags
---

# Add mass delete face tags from person details

## Why

On a person's detail photo grid, users need to remove many incorrect face tags at once. Today only single-tag remove (media viewer / match wizard) exists; cleaning a mis-tagged person is tedious.

## What Changes

### Features Modified

- `features/people/people-and-faces.feature` — scenarios for multi-select remove of face tags from person detail

### Implementation (apply)

- Person detail grid: multi-select + bulk "Remove tags"
- Reuse `DELETE /media/:id/people/:personId` per selected photo (no new bulk API)
- Confirm before remove; does not delete media or person records

## Prior Art

| Piece             | Reuse                                                                 |
| ----------------- | --------------------------------------------------------------------- |
| Single-tag delete | `DELETE /media/:id/people/:personId` → `removePersonFromMediaTag`     |
| Client helper     | `removeTagFromMedia` in `packages/pics/src/features/people/api.ts`    |
| Mutation          | `handleRemoveFromPhoto` in `use-people-mutations.ts` (extend to bulk) |
| Selection pattern | `useMediaSelection` / gallery bulk-actions confirm                    |

**Decision:** Build custom UI on person detail; adopt existing per-tag DELETE API (client loops). No new endpoint or schema.
