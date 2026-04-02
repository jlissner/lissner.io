import { db, GALLERY_VISIBLE_SQL } from "./media-db.js";

/** Case-insensitive lookup by original filename; used for motion pairing and upload checks. */
export function findMediaByOriginalNameCaseInsensitive(originalName: string):
  | { id: string; originalName: string }
  | undefined {
  return db
    .prepare(
      `SELECT id, original_name as originalName FROM media WHERE original_name = ? COLLATE NOCASE`
    )
    .get(originalName) as { id: string; originalName: string } | undefined;
}

/** For duplicate-name checks before upload; matches stored `original_name` case-insensitively. */
export function findExistingMediaByOriginalName(originalName: string):
  | { id: string; originalName: string; uploadedAt: string }
  | undefined {
  return db
    .prepare(
      `SELECT id, original_name as originalName, uploaded_at as uploadedAt FROM media WHERE original_name = ? COLLATE NOCASE`
    )
    .get(originalName) as
    | { id: string; originalName: string; uploadedAt: string }
    | undefined;
}

export function getAllMediaIds(): Set<string> {
  const rows = db.prepare("SELECT id FROM media").all() as Array<{ id: string }>;
  return new Set(rows.map((r) => r.id));
}

export function listMedia() {
  return db
    .prepare(
      `SELECT id, filename, original_name as originalName, mime_type as mimeType, size, uploaded_at as uploadedAt, backed_up_at as backedUpAt
       FROM media ORDER BY uploaded_at DESC, filename ASC`
    )
    .all() as Array<{
    id: string;
    filename: string;
    originalName: string;
    mimeType: string;
    size: number;
    uploadedAt: string;
    backedUpAt?: string | null;
  }>;
}

export function getMediaCount(): number {
  const row = db
    .prepare(`SELECT COUNT(*) as count FROM media WHERE ${GALLERY_VISIBLE_SQL}`)
    .get() as {
      count: number;
    };
  return row.count;
}

export type MediaSortBy = "uploaded" | "taken";

function getMediaOrderBy(sortBy: MediaSortBy, prefix = ""): string {
  const p = prefix ? `${prefix}.` : "";
  const dateExpr =
    sortBy === "taken" ? `COALESCE(${p}date_taken, ${p}uploaded_at)` : `${p}uploaded_at`;
  return `${dateExpr} DESC, ${p}filename ASC`;
}

export function listMediaPaginated(
  limit: number,
  offset: number,
  personId?: number,
  sortBy: MediaSortBy = "uploaded"
) {
  if (personId != null) {
    const orderBy = getMediaOrderBy(sortBy, "m");
    return db
      .prepare(
        `SELECT m.id, m.filename, m.original_name as originalName, m.mime_type as mimeType, m.size, m.uploaded_at as uploadedAt, m.date_taken as dateTaken, m.latitude, m.longitude, m.backed_up_at as backedUpAt,
                m.motion_companion_id as motionCompanionId
         FROM media m
         JOIN image_people ip ON ip.media_id = m.id AND ip.person_id = ?
         WHERE ${GALLERY_VISIBLE_SQL.replace(/hide_from_gallery/g, "m.hide_from_gallery")}
         ORDER BY ${orderBy}
         LIMIT ? OFFSET ?`
      )
      .all(personId, limit, offset) as Array<{
      id: string;
      filename: string;
      originalName: string;
      mimeType: string;
      size: number;
      uploadedAt: string;
      dateTaken?: string | null;
      latitude?: number | null;
      longitude?: number | null;
      backedUpAt?: string | null;
      motionCompanionId?: string | null;
    }>;
  }
  const orderBy = getMediaOrderBy(sortBy);
  return db
    .prepare(
      `SELECT id, filename, original_name as originalName, mime_type as mimeType, size, uploaded_at as uploadedAt, date_taken as dateTaken, latitude, longitude, backed_up_at as backedUpAt,
              motion_companion_id as motionCompanionId
       FROM media WHERE ${GALLERY_VISIBLE_SQL} ORDER BY ${orderBy} LIMIT ? OFFSET ?`
    )
    .all(limit, offset) as Array<{
    id: string;
    filename: string;
    originalName: string;
    mimeType: string;
    size: number;
    uploadedAt: string;
    dateTaken?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    backedUpAt?: string | null;
    motionCompanionId?: string | null;
  }>;
}

export function getMediaCountForPerson(personId: number): number {
  const row = db
    .prepare(
      `SELECT COUNT(DISTINCT ip.media_id) as count FROM image_people ip
       JOIN media m ON m.id = ip.media_id
       WHERE ip.person_id = ? AND COALESCE(m.hide_from_gallery, 0) = 0`
    )
    .get(personId) as { count: number };
  return row.count;
}

export function getMediaById(id: string) {
  return db
    .prepare(
      `SELECT id, filename, original_name as originalName, mime_type as mimeType, size, uploaded_at as uploadedAt,
        date_taken as dateTaken, latitude, longitude, owner_id as ownerId, backed_up_at as backedUpAt,
        motion_companion_id as motionCompanionId, hide_from_gallery as hideFromGallery
       FROM media WHERE id = ?`
    )
    .get(id) as
    | {
        id: string;
        filename: string;
        originalName: string;
        mimeType: string;
        size: number;
        uploadedAt: string;
        dateTaken?: string | null;
        latitude?: number | null;
        longitude?: number | null;
        ownerId?: number | null;
        backedUpAt?: string | null;
        motionCompanionId?: string | null;
        hideFromGallery?: number | null;
      }
    | undefined;
}

export function getMediaOwnerId(mediaId: string): number | null {
  const row = db.prepare("SELECT owner_id FROM media WHERE id = ?").get(mediaId) as
    | { owner_id: number | null }
    | undefined;
  return row?.owner_id ?? null;
}

export function getEmbeddings() {
  return db
    .prepare(`SELECT media_id as mediaId, embedding, indexed_at as indexedAt FROM embeddings`)
    .all() as Array<{ mediaId: string; embedding: string; indexedAt: string }>;
}

export function getIndexedMediaIds(): Set<string> {
  const rows = db.prepare("SELECT media_id FROM embeddings").all() as Array<{
    media_id: string;
  }>;
  return new Set(rows.map((r) => r.media_id));
}

export function getMediaByIds(ids: string[]) {
  if (ids.length === 0) return [];
  const placeholders = ids.map(() => "?").join(",");
  return db
    .prepare(
      `SELECT id, filename, original_name as originalName, mime_type as mimeType, size, uploaded_at as uploadedAt, date_taken as dateTaken, backed_up_at as backedUpAt,
              motion_companion_id as motionCompanionId, hide_from_gallery as hideFromGallery
       FROM media WHERE id IN (${placeholders})`
    )
    .all(...ids) as Array<{
    id: string;
    filename: string;
    originalName: string;
    mimeType: string;
    size: number;
    uploadedAt: string;
    dateTaken?: string | null;
    backedUpAt?: string | null;
    motionCompanionId?: string | null;
    hideFromGallery?: number | null;
  }>;
}
