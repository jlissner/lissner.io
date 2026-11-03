import { galleryVisibleSql, queryAll, queryOne } from "./client.js";

type MediaSortBy = "uploaded" | "taken";

type MediaListRow = {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
  backedUpAt?: string | null;
};

type MediaPageRow = MediaListRow & {
  dateTaken?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  motionCompanionId?: string | null;
};

type MediaByIdRow = MediaPageRow & {
  ownerId?: number | null;
  hideFromGallery?: boolean | null;
};

type MediaFileIssueRow = {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
  issueCode: string;
  issueDetail: string | null;
  issueAt: string | null;
};

const galleryVisibleM = (): string =>
  galleryVisibleSql().replaceAll("hide_from_gallery", "m.hide_from_gallery");

const getMediaOrderBy = (sortBy: MediaSortBy, prefix = ""): string => {
  const p = prefix ? `${prefix}.` : "";
  const dateExpr =
    sortBy === "taken"
      ? `COALESCE(${p}date_taken, ${p}uploaded_at)`
      : `${p}uploaded_at`;
  return `${dateExpr} DESC, ${p}filename ASC`;
};

const PAGE_COLS = `id, filename, original_name as "originalName", mime_type as "mimeType", size, uploaded_at as "uploadedAt", date_taken as "dateTaken", latitude, longitude, backed_up_at as "backedUpAt",
              motion_companion_id as "motionCompanionId"`;

const PAGE_COLS_M = `m.id, m.filename, m.original_name as "originalName", m.mime_type as "mimeType", m.size, m.uploaded_at as "uploadedAt", m.date_taken as "dateTaken", m.latitude, m.longitude, m.backed_up_at as "backedUpAt",
              m.motion_companion_id as "motionCompanionId"`;

/** No-op: statements are no longer cached. Kept for existing callers. */
/** Case-insensitive lookup by original filename; used for motion pairing and upload checks. */
export const findMediaByOriginalNameCaseInsensitive = (
  originalName: string,
): Promise<{ id: string; originalName: string } | undefined> =>
  queryOne<{ id: string; originalName: string }>(
    `SELECT id, original_name as "originalName" FROM media WHERE LOWER(original_name) = LOWER(?)`,
    [originalName],
  );

/** For duplicate-name checks before upload; matches stored `original_name` case-insensitively. */
export const findExistingMediaByOriginalName = (
  originalName: string,
): Promise<
  { id: string; originalName: string; uploadedAt: string } | undefined
> =>
  queryOne<{ id: string; originalName: string; uploadedAt: string }>(
    `SELECT id, original_name as "originalName", uploaded_at as "uploadedAt" FROM media WHERE LOWER(original_name) = LOWER(?)`,
    [originalName],
  );

export const getAllMediaIds = async (): Promise<Set<string>> => {
  const rows = await queryAll<{ id: string }>("SELECT id FROM media");
  return new Set(rows.map((r) => r.id));
};

export const listMedia = (): Promise<MediaListRow[]> =>
  queryAll<MediaListRow>(
    `SELECT id, filename, original_name as "originalName", mime_type as "mimeType", size, uploaded_at as "uploadedAt", backed_up_at as "backedUpAt"
       FROM media ORDER BY uploaded_at DESC, filename ASC`,
  );

export const listMediaWithFileIssues = (): Promise<MediaFileIssueRow[]> =>
  queryAll<MediaFileIssueRow>(
    `SELECT id, original_name as "originalName", mime_type as "mimeType", size, uploaded_at as "uploadedAt",
              file_issue_code as "issueCode", file_issue_detail as "issueDetail", file_issue_at as "issueAt"
       FROM media
       WHERE file_issue_code IS NOT NULL AND TRIM(file_issue_code) != ''
       ORDER BY COALESCE(file_issue_at, uploaded_at) DESC, uploaded_at DESC`,
  );

export const getMediaCount = async (): Promise<number> => {
  const row = await queryOne<{ count: number | string }>(
    `SELECT COUNT(*) as count FROM media WHERE ${galleryVisibleSql()}`,
  );
  return Number(row?.count ?? 0);
};

/** Gallery-visible media IDs (same filter as paginated lists), stable browse order. */
export const listVisibleGalleryMediaIds = async (): Promise<string[]> => {
  const rows = await queryAll<{ id: string }>(
    `SELECT id FROM media WHERE ${galleryVisibleSql()} ORDER BY uploaded_at DESC, filename ASC`,
  );
  return rows.map((r) => r.id);
};

const listPaginatedForPerson = (
  personId: number,
  limit: number,
  offset: number,
  sortBy: MediaSortBy,
): Promise<MediaPageRow[]> =>
  queryAll<MediaPageRow>(
    `SELECT ${PAGE_COLS_M}
       FROM media m
       JOIN image_people ip ON ip.media_id = m.id AND ip.person_id = ?
       WHERE ${galleryVisibleM()}
       ORDER BY ${getMediaOrderBy(sortBy, "m")}
       LIMIT ? OFFSET ?`,
    [personId, limit, offset],
  );

const listPaginatedPlain = (
  limit: number,
  offset: number,
  sortBy: MediaSortBy,
): Promise<MediaPageRow[]> =>
  queryAll<MediaPageRow>(
    `SELECT ${PAGE_COLS}
       FROM media WHERE ${galleryVisibleSql()} ORDER BY ${getMediaOrderBy(sortBy)} LIMIT ? OFFSET ?`,
    [limit, offset],
  );

export const listMediaPaginated = (
  limit: number,
  offset: number,
  personId?: number,
  sortBy: MediaSortBy = "taken",
): Promise<MediaPageRow[]> =>
  personId != null
    ? listPaginatedForPerson(personId, limit, offset, sortBy)
    : listPaginatedPlain(limit, offset, sortBy);

export const getMediaCountForPerson = async (
  personId: number,
): Promise<number> => {
  const row = await queryOne<{ count: number | string }>(
    `SELECT COUNT(DISTINCT ip.media_id) as count FROM image_people ip
       JOIN media m ON m.id = ip.media_id
       WHERE ip.person_id = ? AND ${galleryVisibleM()}`,
    [personId],
  );
  return Number(row?.count ?? 0);
};

export const getMediaById = (id: string): Promise<MediaByIdRow | undefined> =>
  queryOne<MediaByIdRow>(
    `SELECT id, filename, original_name as "originalName", mime_type as "mimeType", size, uploaded_at as "uploadedAt",
        date_taken as "dateTaken", latitude, longitude, owner_id as "ownerId", backed_up_at as "backedUpAt",
        motion_companion_id as "motionCompanionId", hide_from_gallery as "hideFromGallery"
       FROM media WHERE id = ?`,
    [id],
  );

export const getMediaOwnerId = async (
  mediaId: string,
): Promise<number | null> => {
  const row = await queryOne<{ owner_id: number | null }>(
    "SELECT owner_id FROM media WHERE id = ?",
    [mediaId],
  );
  return row?.owner_id ?? null;
};

export const getEmbeddings = (): Promise<
  Array<{ mediaId: string; embedding: string; indexedAt: string }>
> =>
  queryAll<{ mediaId: string; embedding: string; indexedAt: string }>(
    `SELECT media_id as "mediaId", embedding, indexed_at as "indexedAt" FROM embeddings`,
  );

export const getIndexedMediaIds = async (): Promise<Set<string>> => {
  const rows = await queryAll<{ media_id: string }>(
    "SELECT media_id FROM embeddings",
  );
  return new Set(rows.map((r) => r.media_id));
};

export const getMediaByIds = async (
  ids: string[],
): Promise<Array<Omit<MediaByIdRow, "latitude" | "longitude" | "ownerId">>> =>
  ids.length === 0
    ? []
    : queryAll(
        `SELECT id, filename, original_name as "originalName", mime_type as "mimeType", size, uploaded_at as "uploadedAt", date_taken as "dateTaken", backed_up_at as "backedUpAt",
              motion_companion_id as "motionCompanionId", hide_from_gallery as "hideFromGallery"
       FROM media WHERE id IN (${ids.map(() => "?").join(",")})`,
        ids,
      );

export const getAllMediaWithHashes = (): Promise<
  Array<{ id: string; perceptualHash: Buffer }>
> =>
  queryAll<{ id: string; perceptualHash: Buffer }>(
    'SELECT id, perceptual_hash as "perceptualHash" FROM media WHERE perceptual_hash IS NOT NULL',
  );

export const getMediaPerceptualHash = async (
  mediaId: string,
): Promise<Buffer | null> => {
  const row = await queryOne<{ perceptualHash: Buffer | null }>(
    'SELECT perceptual_hash as "perceptualHash" FROM media WHERE id = ?',
    [mediaId],
  );
  return row?.perceptualHash ?? null;
};

/** YYYY-MM from a date expr. CAST so Postgres timestamptz accepts SUBSTR. */
export const sqlYearMonth = (dateExpr: string): string =>
  `SUBSTR(CAST(${dateExpr} AS TEXT), 1, 7)`;

const distinctMonthsSql = (sortBy: MediaSortBy, forPerson: boolean): string => {
  const col = (c: string): string => (forPerson ? `m.${c}` : c);
  const monthExpr =
    sortBy === "taken"
      ? `COALESCE(${col("date_taken")}, ${col("uploaded_at")})`
      : col("uploaded_at");
  const month = sqlYearMonth(monthExpr);
  return forPerson
    ? `SELECT DISTINCT ${month} as month
       FROM media m JOIN image_people ip ON ip.media_id = m.id
       WHERE ip.person_id = ? AND ${galleryVisibleM()}
       ORDER BY month DESC`
    : `SELECT DISTINCT ${month} as month
       FROM media WHERE ${galleryVisibleSql()}
       ORDER BY month DESC`;
};

export const getDistinctMonths = async (
  sortBy: MediaSortBy,
  personId?: number,
): Promise<string[]> => {
  const rows = await queryAll<{ month: string }>(
    distinctMonthsSql(sortBy, Boolean(personId)),
    personId ? [personId] : [],
  );
  return rows.map((r) => r.month);
};

const nextMonthBoundary = (monthKey: string): string => {
  const [y, m] = monthKey.split("-").map(Number);
  const next = m === 12 ? new Date(y + 1, 0, 1) : new Date(y, m, 1);
  return next.toISOString();
};

const countBeforeMonthSql = (
  sortBy: MediaSortBy,
  forPerson: boolean,
): string => {
  const p = forPerson ? "m." : "";
  const dateExpr =
    sortBy === "taken"
      ? `COALESCE(${p}date_taken, ${p}uploaded_at)`
      : `${p}uploaded_at`;
  return forPerson
    ? `SELECT COUNT(*) as cnt FROM media m
       JOIN image_people ip ON ip.media_id = m.id
       WHERE ip.person_id = ? AND ${galleryVisibleM()} AND ${dateExpr} >= ?`
    : `SELECT COUNT(*) as cnt FROM media
       WHERE ${galleryVisibleSql()} AND ${dateExpr} >= ?`;
};

export const getOffsetForMonth = async (
  sortBy: MediaSortBy,
  monthKey: string,
  personId?: number,
): Promise<number> => {
  const boundary = nextMonthBoundary(monthKey);
  const row = await queryOne<{ cnt: number | string }>(
    countBeforeMonthSql(sortBy, Boolean(personId)),
    personId ? [personId, boundary] : [boundary],
  );
  return Number(row?.cnt ?? 0);
};
