---
status: complete
branch: feat/admin-duplicates-ux
complexity: 3
---

# Change: Improve admin duplicate review + deletion UX

## Why

The current admin “Find Duplicates” workflow is slow and click-heavy: duplicates are listed as IDs only, you must open each pair to compare, and deletions are one-at-a-time with poor feedback. This makes cleanup tedious and error-prone.

## Prior Art

- UI: `ui/src/features/admin/components/admin-page.tsx` has “Duplicate Detection” and a single-pair “Duplicate Review” view with per-item delete.
- API: `GET /api/admin/duplicates` computes all duplicate pairs server-side; UI calls `DELETE /api/media/:id` for each deletion.
- UX pattern to borrow: `ui/src/features/media/components/upload-modal-confirm.tsx` already supports “quick” bulk actions for resolving duplicates during upload.

## Non-goals

- Changing how duplicates are detected (hash algorithm, distance threshold) — this change focuses on review and deletion UX.
- Automatic deletion without explicit user confirmation.
- Adding “undo delete” for media.

## Assumptions

- [ ] Admin-only bulk deletion is acceptable (no additional approval flows required).
- [ ] Deleting media via API must also remove S3 objects (current behavior) and is expected to be the dominant cost for large batches.

## Pre-Mortem

- Bulk delete is too risky (accidental mass deletions): mitigate with a single explicit confirmation that includes a count, and show per-item results with an undo-not-available warning.
- Batch delete is still slow because S3 deletes are slow: mitigate with concurrency-limited batch processing and clear progress + “stop” control.
- Duplicate listing itself is slow for large libraries: mitigate by paginating and/or deferring expensive compute, and always keeping the UI responsive.

## Feature Changes

- **ADDED** `.grimoire/changes/update-admin-duplicates-ux/features/admin/duplicates.feature` — bulk review + bulk delete behavior
