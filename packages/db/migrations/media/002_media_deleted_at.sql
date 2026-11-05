-- Soft-delete / recycle bin for media rows.
ALTER TABLE media
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_media_deleted_at
  ON media (deleted_at)
  WHERE deleted_at IS NOT NULL;
