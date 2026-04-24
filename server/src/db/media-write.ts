import { getDb } from "./media-db.js";
import { linkMotionPairForMedia } from "./media-motion.js";

function buildWriteStmts() {
  const db = getDb();
  return {
    insertMedia: db.prepare(
      `INSERT INTO media (id, filename, original_name, mime_type, size, uploaded_at, owner_id)
       VALUES (?, ?, ?, ?, ?, datetime('now'), ?)`,
    ),
    updateMimeType: db.prepare("UPDATE media SET mime_type = ? WHERE id = ?"),
    insertFromBackup: db.prepare(
      `INSERT OR IGNORE INTO media (id, filename, original_name, mime_type, size, uploaded_at, date_taken, latitude, longitude, owner_id, backed_up_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
    ),
    setDateTaken: db.prepare("UPDATE media SET date_taken = ? WHERE id = ?"),
    markBackedUp: db.prepare(
      "UPDATE media SET backed_up_at = datetime('now') WHERE id = ?",
    ),
    clearBackedUpAt: db.prepare(
      "UPDATE media SET backed_up_at = NULL WHERE id = ?",
    ),
    setLocation: db.prepare(
      "UPDATE media SET latitude = ?, longitude = ? WHERE id = ?",
    ),
    upsertEmbedding: db.prepare(
      `INSERT INTO embeddings (media_id, embedding, indexed_at) VALUES (?, ?, datetime('now'))
       ON CONFLICT(media_id) DO UPDATE SET embedding = excluded.embedding, indexed_at = excluded.indexed_at`,
    ),
    deleteEmbeddingsAll: db.prepare("DELETE FROM embeddings"),
    deleteImagePeopleAll: db.prepare("DELETE FROM image_people"),
    deletePersonNamesAll: db.prepare("DELETE FROM person_names"),
    deleteImagePeopleForMedia: db.prepare(
      "DELETE FROM image_people WHERE media_id = ?",
    ),
    deleteEmbeddingsForMedia: db.prepare(
      "DELETE FROM embeddings WHERE media_id = ?",
    ),
    deleteMediaRow: db.prepare("DELETE FROM media WHERE id = ?"),
  };
}

const writeState = { stmts: null as null | ReturnType<typeof buildWriteStmts> };

export function resetMediaWriteStatementCache(): void {
  writeState.stmts = null;
}

function writeStmts() {
  if (writeState.stmts) return writeState.stmts;
  const stmts = buildWriteStmts();
  writeState.stmts = stmts;
  return stmts;
}

export function insertMedia(
  id: string,
  filename: string,
  originalName: string,
  mimeType: string,
  size: number,
  ownerId: number,
) {
  writeStmts().insertMedia.run(
    id,
    filename,
    originalName,
    mimeType,
    size,
    ownerId,
  );
  linkMotionPairForMedia(id);
}

export function updateMediaMimeType(mediaId: string, mimeType: string): void {
  writeStmts().updateMimeType.run(mimeType, mediaId);
}

/** Insert media row from backup (for S3 sync merge). Uses INSERT OR IGNORE. ownerId required. */
export function insertMediaFromBackup(
  row: {
    id: string;
    filename: string;
    originalName: string;
    mimeType: string;
    size: number;
    uploadedAt: string;
    dateTaken?: string | null;
    latitude?: number | null;
    longitude?: number | null;
  },
  ownerId: number,
): boolean {
  const result = writeStmts().insertFromBackup.run(
    row.id,
    row.filename,
    row.originalName,
    row.mimeType,
    row.size,
    row.uploadedAt,
    row.dateTaken ?? null,
    row.latitude ?? null,
    row.longitude ?? null,
    ownerId,
  );
  if (result.changes > 0) {
    linkMotionPairForMedia(row.id);
    return true;
  }
  return false;
}

export function setMediaDateTaken(
  mediaId: string,
  dateTaken: string | null,
): void {
  writeStmts().setDateTaken.run(dateTaken, mediaId);
}

export function markMediaBackedUp(mediaId: string): void {
  writeStmts().markBackedUp.run(mediaId);
}

/** When S3 no longer has the object, stop treating the row as restorable from backup. */
export function clearMediaBackedUpAt(mediaId: string): void {
  writeStmts().clearBackedUpAt.run(mediaId);
}

export function markMediaBackedUpByFilenames(filenames: string[]): void {
  if (filenames.length === 0) return;
  const placeholders = filenames.map(() => "?").join(", ");
  getDb()
    .prepare(
      `UPDATE media SET backed_up_at = datetime('now') WHERE filename IN (${placeholders})`,
    )
    .run(...filenames);
}

export function setMediaLocation(
  mediaId: string,
  latitude: number | null,
  longitude: number | null,
): void {
  writeStmts().setLocation.run(latitude, longitude, mediaId);
}

export function upsertEmbedding(mediaId: string, embedding: number[]) {
  writeStmts().upsertEmbedding.run(mediaId, JSON.stringify(embedding));
}

/** Clear all indexing data: embeddings, face tags, and people. Media files are kept. */
export function clearAllIndexingData(): void {
  writeStmts().deleteEmbeddingsAll.run();
  writeStmts().deleteImagePeopleAll.run();
  writeStmts().deletePersonNamesAll.run();
}

export function deleteMedia(id: string) {
  writeStmts().deleteImagePeopleForMedia.run(id);
  writeStmts().deleteEmbeddingsForMedia.run(id);
  writeStmts().deleteMediaRow.run(id);
}

export function setMediaPerceptualHash(mediaId: string, hash: Buffer): void {
  getDb()
    .prepare("UPDATE media SET perceptual_hash = ? WHERE id = ?")
    .run(hash, mediaId);
}
