import { GALLERY_VISIBLE_SQL, getDb } from "./media-db.js";

const GALLERY_VISIBLE_M = "COALESCE(m.hide_from_gallery, 0) = 0";

export type MediaSortBy = "uploaded" | "taken";

function getMediaOrderBy(sortBy: MediaSortBy, prefix = ""): string {
  const p = prefix ? `${prefix}.` : "";
  const dateExpr =
    sortBy === "taken" ? `COALESCE(${p}date_taken, ${p}uploaded_at)` : `${p}uploaded_at`;
  return `${dateExpr} DESC, ${p}filename ASC`;
}

function buildReadStmts() {
  const db = getDb();
  return {
    findByOriginalInsensitive: db.prepare(
      `SELECT id, original_name as originalName FROM media WHERE original_name = ? COLLATE NOCASE`
    ),
    findExistingByOriginalInsensitive: db.prepare(
      `SELECT id, original_name as originalName, uploaded_at as uploadedAt FROM media WHERE original_name = ? COLLATE NOCASE`
    ),
    getAllMediaIds: db.prepare("SELECT id FROM media"),
    listMedia: db.prepare(
      `SELECT id, filename, original_name as originalName, mime_type as mimeType, size, uploaded_at as uploadedAt, backed_up_at as backedUpAt
       FROM media ORDER BY uploaded_at DESC, filename ASC`
    ),
    getMediaCount: db.prepare(`SELECT COUNT(*) as count FROM media WHERE ${GALLERY_VISIBLE_SQL}`),
    listPaginatedPersonUploaded: db.prepare(
      `SELECT m.id, m.filename, m.original_name as originalName, m.mime_type as mimeType, m.size, m.uploaded_at as uploadedAt, m.date_taken as dateTaken, m.latitude, m.longitude, m.backed_up_at as backedUpAt,
              m.motion_companion_id as motionCompanionId
       FROM media m
       JOIN image_people ip ON ip.media_id = m.id AND ip.person_id = ?
       WHERE ${GALLERY_VISIBLE_M}
       ORDER BY ${getMediaOrderBy("uploaded", "m")}
       LIMIT ? OFFSET ?`
    ),
    listPaginatedPersonTaken: db.prepare(
      `SELECT m.id, m.filename, m.original_name as originalName, m.mime_type as mimeType, m.size, m.uploaded_at as uploadedAt, m.date_taken as dateTaken, m.latitude, m.longitude, m.backed_up_at as backedUpAt,
              m.motion_companion_id as motionCompanionId
       FROM media m
       JOIN image_people ip ON ip.media_id = m.id AND ip.person_id = ?
       WHERE ${GALLERY_VISIBLE_M}
       ORDER BY ${getMediaOrderBy("taken", "m")}
       LIMIT ? OFFSET ?`
    ),
    listPaginatedPlainUploaded: db.prepare(
      `SELECT id, filename, original_name as originalName, mime_type as mimeType, size, uploaded_at as uploadedAt, date_taken as dateTaken, latitude, longitude, backed_up_at as backedUpAt,
              motion_companion_id as motionCompanionId
       FROM media WHERE ${GALLERY_VISIBLE_SQL} ORDER BY ${getMediaOrderBy("uploaded")} LIMIT ? OFFSET ?`
    ),
    listPaginatedPlainTaken: db.prepare(
      `SELECT id, filename, original_name as originalName, mime_type as mimeType, size, uploaded_at as uploadedAt, date_taken as dateTaken, latitude, longitude, backed_up_at as backedUpAt,
              motion_companion_id as motionCompanionId
       FROM media WHERE ${GALLERY_VISIBLE_SQL} ORDER BY ${getMediaOrderBy("taken")} LIMIT ? OFFSET ?`
    ),
    getMediaCountForPerson: db.prepare(
      `SELECT COUNT(DISTINCT ip.media_id) as count FROM image_people ip
       JOIN media m ON m.id = ip.media_id
       WHERE ip.person_id = ? AND COALESCE(m.hide_from_gallery, 0) = 0`
    ),
    getMediaById: db.prepare(
      `SELECT id, filename, original_name as originalName, mime_type as mimeType, size, uploaded_at as uploadedAt,
        date_taken as dateTaken, latitude, longitude, owner_id as ownerId, backed_up_at as backedUpAt,
        motion_companion_id as motionCompanionId, hide_from_gallery as hideFromGallery
       FROM media WHERE id = ?`
    ),
    getMediaOwnerId: db.prepare("SELECT owner_id FROM media WHERE id = ?"),
    getEmbeddings: db.prepare(
      `SELECT media_id as mediaId, embedding, indexed_at as indexedAt FROM embeddings`
    ),
    getIndexedMediaIds: db.prepare("SELECT media_id FROM embeddings"),
    distinctMonthsUploaded: db.prepare(
      `SELECT DISTINCT SUBSTR(uploaded_at, 1, 7) as month
       FROM media WHERE ${GALLERY_VISIBLE_SQL}
       ORDER BY month DESC`
    ),
    distinctMonthsTaken: db.prepare(
      `SELECT DISTINCT SUBSTR(COALESCE(date_taken, uploaded_at), 1, 7) as month
       FROM media WHERE ${GALLERY_VISIBLE_SQL}
       ORDER BY month DESC`
    ),
    distinctMonthsPersonUploaded: db.prepare(
      `SELECT DISTINCT SUBSTR(m.uploaded_at, 1, 7) as month
       FROM media m JOIN image_people ip ON ip.media_id = m.id
       WHERE ip.person_id = ? AND ${GALLERY_VISIBLE_M}
       ORDER BY month DESC`
    ),
    distinctMonthsPersonTaken: db.prepare(
      `SELECT DISTINCT SUBSTR(COALESCE(m.date_taken, m.uploaded_at), 1, 7) as month
       FROM media m JOIN image_people ip ON ip.media_id = m.id
       WHERE ip.person_id = ? AND ${GALLERY_VISIBLE_M}
       ORDER BY month DESC`
    ),
    countBeforeMonthUploaded: db.prepare(
      `SELECT COUNT(*) as cnt FROM media
       WHERE ${GALLERY_VISIBLE_SQL} AND uploaded_at >= ?`
    ),
    countBeforeMonthTaken: db.prepare(
      `SELECT COUNT(*) as cnt FROM media
       WHERE ${GALLERY_VISIBLE_SQL} AND COALESCE(date_taken, uploaded_at) >= ?`
    ),
    countBeforeMonthPersonUploaded: db.prepare(
      `SELECT COUNT(*) as cnt FROM media m
       JOIN image_people ip ON ip.media_id = m.id
       WHERE ip.person_id = ? AND ${GALLERY_VISIBLE_M} AND m.uploaded_at >= ?`
    ),
    countBeforeMonthPersonTaken: db.prepare(
      `SELECT COUNT(*) as cnt FROM media m
       JOIN image_people ip ON ip.media_id = m.id
       WHERE ip.person_id = ? AND ${GALLERY_VISIBLE_M} AND COALESCE(m.date_taken, m.uploaded_at) >= ?`
    ),
  };
}

const readState = { stmts: null as null | ReturnType<typeof buildReadStmts> };

export function resetMediaReadStatementCache(): void {
  readState.stmts = null;
}

function readStmts() {
  if (readState.stmts) return readState.stmts;
  const stmts = buildReadStmts();
  readState.stmts = stmts;
  return stmts;
}

/** Case-insensitive lookup by original filename; used for motion pairing and upload checks. */
export function findMediaByOriginalNameCaseInsensitive(
  originalName: string
): { id: string; originalName: string } | undefined {
  return readStmts().findByOriginalInsensitive.get(originalName) as
    | { id: string; originalName: string }
    | undefined;
}

/** For duplicate-name checks before upload; matches stored `original_name` case-insensitively. */
export function findExistingMediaByOriginalName(
  originalName: string
): { id: string; originalName: string; uploadedAt: string } | undefined {
  return readStmts().findExistingByOriginalInsensitive.get(originalName) as
    | { id: string; originalName: string; uploadedAt: string }
    | undefined;
}

export function getAllMediaIds(): Set<string> {
  const rows = readStmts().getAllMediaIds.all() as Array<{ id: string }>;
  return new Set(rows.map((r) => r.id));
}

export function listMedia() {
  return readStmts().listMedia.all() as Array<{
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
  const row = readStmts().getMediaCount.get() as { count: number };
  return row.count;
}

export function listMediaPaginated(
  limit: number,
  offset: number,
  personId?: number,
  sortBy: MediaSortBy = "uploaded"
) {
  if (personId != null) {
    const stmt =
      sortBy === "taken"
        ? readStmts().listPaginatedPersonTaken
        : readStmts().listPaginatedPersonUploaded;
    return stmt.all(personId, limit, offset) as Array<{
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
  const stmt =
    sortBy === "taken"
      ? readStmts().listPaginatedPlainTaken
      : readStmts().listPaginatedPlainUploaded;
  return stmt.all(limit, offset) as Array<{
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
  const row = readStmts().getMediaCountForPerson.get(personId) as { count: number };
  return row.count;
}

export function getMediaById(id: string) {
  return readStmts().getMediaById.get(id) as
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
  const row = readStmts().getMediaOwnerId.get(mediaId) as { owner_id: number | null } | undefined;
  return row?.owner_id ?? null;
}

export function getEmbeddings() {
  return readStmts().getEmbeddings.all() as Array<{
    mediaId: string;
    embedding: string;
    indexedAt: string;
  }>;
}

export function getIndexedMediaIds(): Set<string> {
  const rows = readStmts().getIndexedMediaIds.all() as Array<{ media_id: string }>;
  return new Set(rows.map((r) => r.media_id));
}

export function getMediaByIds(ids: string[]) {
  if (ids.length === 0) return [];
  const placeholders = ids.map(() => "?").join(",");
  return getDb()
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

export function getAllMediaWithHashes(): Array<{ id: string; perceptualHash: Buffer }> {
  return getDb()
    .prepare(
      "SELECT id, perceptual_hash as perceptualHash FROM media WHERE perceptual_hash IS NOT NULL"
    )
    .all() as Array<{ id: string; perceptualHash: Buffer }>;
}

export function getMediaPerceptualHash(mediaId: string): Buffer | null {
  const row = getDb()
    .prepare("SELECT perceptual_hash as perceptualHash FROM media WHERE id = ?")
    .get(mediaId) as { perceptualHash: Buffer | null } | undefined;
  return row?.perceptualHash ?? null;
}

export function getDistinctMonths(sortBy: MediaSortBy, personId?: number): string[] {
  const stmt = personId
    ? sortBy === "taken"
      ? readStmts().distinctMonthsPersonTaken
      : readStmts().distinctMonthsPersonUploaded
    : sortBy === "taken"
      ? readStmts().distinctMonthsTaken
      : readStmts().distinctMonthsUploaded;
  const rows = personId
    ? (stmt.all(personId) as Array<{ month: string }>)
    : (stmt.all() as Array<{ month: string }>);
  return rows.map((r) => r.month);
}

function nextMonthBoundary(monthKey: string): string {
  const [y, m] = monthKey.split("-").map(Number);
  const next = m === 12 ? new Date(y + 1, 0, 1) : new Date(y, m, 1);
  return next.toISOString();
}

export function getOffsetForMonth(
  sortBy: MediaSortBy,
  monthKey: string,
  personId?: number
): number {
  const boundary = nextMonthBoundary(monthKey);
  const stmt = personId
    ? sortBy === "taken"
      ? readStmts().countBeforeMonthPersonTaken
      : readStmts().countBeforeMonthPersonUploaded
    : sortBy === "taken"
      ? readStmts().countBeforeMonthTaken
      : readStmts().countBeforeMonthUploaded;
  const row = personId
    ? (stmt.get(personId, boundary) as { cnt: number })
    : (stmt.get(boundary) as { cnt: number });
  return row.cnt;
}
