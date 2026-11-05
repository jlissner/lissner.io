---
status: implementing
date: 2026-11-05
complexity: 3
branch: feat/add-media-recycle-bin
---

# Add media recycle bin

## Why

Gallery deletes today destroy files and DB rows immediately. Users and admins need a recycle-bin flow: soft-delete on everyday delete, admin restore, and admin permanent purge.

## What Changes

### Features Added

- `features/admin/recycle-bin.feature` — admin lists soft-deleted media, restores, permanently deletes

### Features Modified

- `features/media/home-gallery.feature` — gallery delete moves media to recycle bin (hidden, recoverable)

### Data

- `media.deleted_at` timestamptz nullable (see `data.yml`)

## Assumptions

- Soft-deleted rows keep disk/S3 files and related rows until permanent delete (evidence: recycle-bin product requirement).
- Admin duplicates and file-issues remain hard-delete (user decision).
- No timed auto-empty in this change (non-goal).

## Pre-Mortem

- Soft-deleted items leak into search/gallery → mitigate with `notDeletedSql` on all live queries.
- File-issues still calls soft-delete API → switch that UI to permanent-delete endpoint.
- Admin cannot preview trash items → allow admin media file routes when `deleted_at` is set.

## Prior Art

| Piece                     | Reuse                                                                    |
| ------------------------- | ------------------------------------------------------------------------ |
| Hard delete orchestration | `deleteMediaItem` in media-write-service → split into soft vs permanent  |
| Admin tab shell           | `admin-page.tsx` + File issues tab pattern                               |
| Gallery visibility SQL    | `galleryVisibleSql` in `db/client.ts` — extend with `deleted_at IS NULL` |
| Bulk permanent delete     | `POST /admin/duplicates/bulk-delete` keeps hard path                     |

**Decision:** Build custom soft-delete column + admin recycle tab; no third-party trash package.
