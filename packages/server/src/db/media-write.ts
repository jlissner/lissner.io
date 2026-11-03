import { execute, withTransaction } from "./client.js";
import { linkMotionPairForMedia } from "./media-motion.js";

export async function insertMedia(
  id: string,
  filename: string,
  originalName: string,
  mimeType: string,
  size: number,
  ownerId: number,
): Promise<void> {
  await execute(
    `INSERT INTO media (id, filename, original_name, mime_type, size, uploaded_at, owner_id)
     VALUES (?, ?, ?, ?, ?, NOW(), ?)`,
    [id, filename, originalName, mimeType, size, ownerId],
  );
  await linkMotionPairForMedia(id);
}

export async function updateMediaMimeType(
  mediaId: string,
  mimeType: string,
): Promise<void> {
  await execute("UPDATE media SET mime_type = ? WHERE id = ?", [
    mimeType,
    mediaId,
  ]);
}

export async function setMediaDateTaken(
  mediaId: string,
  dateTaken: string | null,
): Promise<void> {
  await execute("UPDATE media SET date_taken = ? WHERE id = ?", [
    dateTaken,
    mediaId,
  ]);
}

export async function setMediaFileSize(
  mediaId: string,
  size: number,
): Promise<void> {
  await execute("UPDATE media SET size = ? WHERE id = ?", [size, mediaId]);
}

export async function markMediaBackedUp(mediaId: string): Promise<void> {
  await execute("UPDATE media SET backed_up_at = NOW() WHERE id = ?", [
    mediaId,
  ]);
}

/** When S3 no longer has the object, stop treating the row as restorable from backup. */
export async function clearMediaBackedUpAt(mediaId: string): Promise<void> {
  await execute("UPDATE media SET backed_up_at = NULL WHERE id = ?", [mediaId]);
}

export async function markMediaBackedUpByFilenames(
  filenames: string[],
): Promise<void> {
  if (filenames.length === 0) return;
  const placeholders = filenames.map(() => "?").join(", ");
  await execute(
    `UPDATE media SET backed_up_at = NOW() WHERE filename IN (${placeholders})`,
    filenames,
  );
}

export async function setMediaLocation(
  mediaId: string,
  latitude: number | null,
  longitude: number | null,
): Promise<void> {
  await execute("UPDATE media SET latitude = ?, longitude = ? WHERE id = ?", [
    latitude,
    longitude,
    mediaId,
  ]);
}

export async function upsertEmbedding(
  mediaId: string,
  embedding: number[],
): Promise<void> {
  await execute(
    `INSERT INTO embeddings (media_id, embedding, indexed_at) VALUES (?, ?, NOW())
     ON CONFLICT(media_id) DO UPDATE SET embedding = excluded.embedding, indexed_at = excluded.indexed_at`,
    [mediaId, JSON.stringify(embedding)],
  );
}

/** Clear all indexing data: embeddings, face tags, and people. Media files are kept. */
export async function clearAllIndexingData(): Promise<void> {
  await withTransaction(async () => {
    await execute("DELETE FROM embeddings");
    await execute("DELETE FROM image_people");
    await execute("DELETE FROM person_names");
  });
}

export async function deleteEmbeddingsForMedia(mediaId: string): Promise<void> {
  await execute("DELETE FROM embeddings WHERE media_id = ?", [mediaId]);
}

export async function deleteMedia(id: string): Promise<void> {
  await withTransaction(async () => {
    await execute("DELETE FROM image_people WHERE media_id = ?", [id]);
    await execute("DELETE FROM embeddings WHERE media_id = ?", [id]);
    await execute("DELETE FROM media WHERE id = ?", [id]);
  });
}

export async function setMediaPerceptualHash(
  mediaId: string,
  hash: Buffer,
): Promise<void> {
  await execute("UPDATE media SET perceptual_hash = ? WHERE id = ?", [
    hash,
    mediaId,
  ]);
}

export async function setMediaFileIssue(
  mediaId: string,
  code: string,
  detail: string | null,
): Promise<void> {
  await execute(
    "UPDATE media SET file_issue_code = ?, file_issue_detail = ?, file_issue_at = NOW() WHERE id = ?",
    [code, detail, mediaId],
  );
}

export async function clearMediaFileIssue(mediaId: string): Promise<void> {
  await execute(
    "UPDATE media SET file_issue_code = NULL, file_issue_detail = NULL, file_issue_at = NULL WHERE id = ?",
    [mediaId],
  );
}
