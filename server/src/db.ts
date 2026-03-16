import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, "../../../data/db/media.db");

const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS media (
    id TEXT PRIMARY KEY,
    filename TEXT NOT NULL,
    original_name TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size INTEGER NOT NULL,
    uploaded_at TEXT NOT NULL
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS embeddings (
    media_id TEXT PRIMARY KEY REFERENCES media(id),
    embedding TEXT NOT NULL,
    indexed_at TEXT NOT NULL
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS person_names (
    person_id INTEGER PRIMARY KEY,
    name TEXT NOT NULL
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS image_people (
    media_id TEXT NOT NULL,
    person_id INTEGER NOT NULL,
    PRIMARY KEY (media_id, person_id),
    FOREIGN KEY (media_id) REFERENCES media(id)
  )
`);

const imagePeopleCols = (db.prepare("PRAGMA table_info(image_people)").all() as Array<{ name: string }>).map((c) => c.name);
for (const col of ["x", "y", "width", "height", "confidence"]) {
  if (!imagePeopleCols.includes(col)) {
    db.exec(`ALTER TABLE image_people ADD COLUMN ${col} REAL`);
  }
}

const mediaCols = (db.prepare("PRAGMA table_info(media)").all() as Array<{ name: string }>).map((c) => c.name);
if (!mediaCols.includes("date_taken")) {
  db.exec("ALTER TABLE media ADD COLUMN date_taken TEXT");
}
if (!mediaCols.includes("latitude")) {
  db.exec("ALTER TABLE media ADD COLUMN latitude REAL");
}
if (!mediaCols.includes("longitude")) {
  db.exec("ALTER TABLE media ADD COLUMN longitude REAL");
}

export function insertMedia(
  id: string,
  filename: string,
  originalName: string,
  mimeType: string,
  size: number
) {
  db.prepare(
    `INSERT INTO media (id, filename, original_name, mime_type, size, uploaded_at)
     VALUES (?, ?, ?, ?, ?, datetime('now'))`
  ).run(id, filename, originalName, mimeType, size);
}

export function setMediaDateTaken(mediaId: string, dateTaken: string | null): void {
  db.prepare("UPDATE media SET date_taken = ? WHERE id = ?").run(dateTaken, mediaId);
}

export function setMediaLocation(
  mediaId: string,
  latitude: number | null,
  longitude: number | null
): void {
  db.prepare("UPDATE media SET latitude = ?, longitude = ? WHERE id = ?").run(
    latitude,
    longitude,
    mediaId
  );
}

export function listMedia() {
  return db
    .prepare(
      `SELECT id, filename, original_name as originalName, mime_type as mimeType, size, uploaded_at as uploadedAt
       FROM media ORDER BY uploaded_at DESC, filename ASC`
    )
    .all() as Array<{
    id: string;
    filename: string;
    originalName: string;
    mimeType: string;
    size: number;
    uploadedAt: string;
  }>;
}

export function getMediaCount(): number {
  const row = db.prepare("SELECT COUNT(*) as count FROM media").get() as {
    count: number;
  };
  return row.count;
}

export type MediaSortBy = "uploaded" | "taken";

function getMediaOrderBy(sortBy: MediaSortBy, prefix = ""): string {
  const p = prefix ? `${prefix}.` : "";
  const dateExpr = sortBy === "taken"
    ? `COALESCE(${p}date_taken, ${p}uploaded_at)`
    : `${p}uploaded_at`;
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
        `SELECT m.id, m.filename, m.original_name as originalName, m.mime_type as mimeType, m.size, m.uploaded_at as uploadedAt, m.date_taken as dateTaken, m.latitude, m.longitude
         FROM media m
         JOIN image_people ip ON ip.media_id = m.id AND ip.person_id = ?
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
    }>;
  }
  const orderBy = getMediaOrderBy(sortBy);
  return db
    .prepare(
      `SELECT id, filename, original_name as originalName, mime_type as mimeType, size, uploaded_at as uploadedAt, date_taken as dateTaken, latitude, longitude
       FROM media ORDER BY ${orderBy} LIMIT ? OFFSET ?`
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
  }>;
}

export function getMediaCountForPerson(personId: number): number {
  const row = db
    .prepare("SELECT COUNT(*) as count FROM image_people WHERE person_id = ?")
    .get(personId) as { count: number };
  return row.count;
}

export function getMediaById(id: string) {
  return db
    .prepare(
      `SELECT id, filename, original_name as originalName, mime_type as mimeType, size, uploaded_at as uploadedAt,
        date_taken as dateTaken, latitude, longitude
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
      }
    | undefined;
}

export function upsertEmbedding(mediaId: string, embedding: number[]) {
  db.prepare(
    `INSERT INTO embeddings (media_id, embedding, indexed_at) VALUES (?, ?, datetime('now'))
     ON CONFLICT(media_id) DO UPDATE SET embedding = excluded.embedding, indexed_at = excluded.indexed_at`
  ).run(mediaId, JSON.stringify(embedding));
}

export function getEmbeddings() {
  return db
    .prepare(
      `SELECT media_id as mediaId, embedding, indexed_at as indexedAt FROM embeddings`
    )
    .all() as Array<{ mediaId: string; embedding: string; indexedAt: string }>;
}

export function getIndexedMediaIds(): Set<string> {
  const rows = db.prepare("SELECT media_id FROM embeddings").all() as Array<{
    media_id: string;
  }>;
  return new Set(rows.map((r) => r.media_id));
}

/** Clear all indexing data: embeddings, face tags, and people. Media files are kept. */
export function clearAllIndexingData(): void {
  db.prepare("DELETE FROM embeddings").run();
  db.prepare("DELETE FROM image_people").run();
  db.prepare("DELETE FROM person_names").run();
}

export function setImagePeople(
  mediaId: string,
  entries: Array<{
    personId: number;
    box?: { x: number; y: number; width: number; height: number };
    confidence?: number;
  }>
) {
  db.prepare("DELETE FROM image_people WHERE media_id = ?").run(mediaId);
  const seen = new Set<number>();
  const insert = db.prepare(
    "INSERT INTO image_people (media_id, person_id, x, y, width, height, confidence) VALUES (?, ?, ?, ?, ?, ?, ?)"
  );
  for (const { personId, box, confidence } of entries) {
    if (seen.has(personId)) continue;
    seen.add(personId);
    insert.run(
      mediaId,
      personId,
      box?.x ?? null,
      box?.y ?? null,
      box?.width ?? null,
      box?.height ?? null,
      confidence ?? null
    );
  }
}

export function getPersonName(personId: number): string | null {
  const row = db
    .prepare("SELECT name FROM person_names WHERE person_id = ?")
    .get(personId) as { name: string } | undefined;
  return row?.name ?? null;
}

export function setPersonName(personId: number, name: string) {
  db.prepare(
    "INSERT INTO person_names (person_id, name) VALUES (?, ?) ON CONFLICT(person_id) DO UPDATE SET name = excluded.name"
  ).run(personId, name);
}

export function getPersonNames(): Map<number, string> {
  const rows = db
    .prepare("SELECT person_id, name FROM person_names")
    .all() as Array<{ person_id: number; name: string }>;
  return new Map(rows.map((r) => [r.person_id, r.name]));
}

export function getAllPersonIds(): number[] {
  const fromImagePeople = db
    .prepare("SELECT DISTINCT person_id FROM image_people")
    .all() as Array<{ person_id: number }>;
  const fromNames = db
    .prepare("SELECT person_id FROM person_names")
    .all() as Array<{ person_id: number }>;
  const ids = new Set([
    ...fromImagePeople.map((r) => r.person_id),
    ...fromNames.map((r) => r.person_id),
  ]);
  return [...ids].sort((a, b) => a - b);
}

export function mergePeople(keepId: number, mergeFromId: number): void {
  if (keepId === mergeFromId) return;
  const rows = db
    .prepare(
      "SELECT media_id, x, y, width, height FROM image_people WHERE person_id = ?"
    )
    .all(mergeFromId) as Array<{
    media_id: string;
    x: number | null;
    y: number | null;
    width: number | null;
    height: number | null;
  }>;
  const insert = db.prepare(
    "INSERT OR IGNORE INTO image_people (media_id, person_id, x, y, width, height, confidence) VALUES (?, ?, ?, ?, ?, ?, ?)"
  );
  for (const row of rows) {
    insert.run(row.media_id, keepId, row.x, row.y, row.width, row.height, 1);
  }
  db.prepare("DELETE FROM image_people WHERE person_id = ?").run(mergeFromId);
  db.prepare("DELETE FROM person_names WHERE person_id = ?").run(mergeFromId);
}

/** Delete a person entirely (all face tags and name). */
export function deletePerson(personId: number): void {
  db.prepare("DELETE FROM image_people WHERE person_id = ?").run(personId);
  db.prepare("DELETE FROM person_names WHERE person_id = ?").run(personId);
}

export function getImagePeople(mediaId: string): number[] {
  const rows = db
    .prepare("SELECT person_id FROM image_people WHERE media_id = ? ORDER BY person_id")
    .all(mediaId) as Array<{ person_id: number }>;
  return rows.map((r) => r.person_id);
}

export function removePersonFromMedia(mediaId: string, personId: number): boolean {
  const result = db
    .prepare("DELETE FROM image_people WHERE media_id = ? AND person_id = ?")
    .run(mediaId, personId);
  return result.changes > 0;
}

export function reassignPersonInMedia(
  mediaId: string,
  fromPersonId: number,
  toPersonId: number
): boolean {
  const row = db
    .prepare("SELECT x, y, width, height FROM image_people WHERE media_id = ? AND person_id = ?")
    .get(mediaId, fromPersonId) as { x: number | null; y: number | null; width: number | null; height: number | null } | undefined;
  if (!row) return false;
  db.prepare("DELETE FROM image_people WHERE media_id = ? AND person_id = ?").run(mediaId, fromPersonId);
  db.prepare(
    "INSERT OR REPLACE INTO image_people (media_id, person_id, x, y, width, height, confidence) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).run(mediaId, toPersonId, row.x, row.y, row.width, row.height, 1);
  return true;
}

export function createNewPersonForMedia(
  mediaId: string,
  fromPersonId: number
): number | null {
  const row = db
    .prepare("SELECT x, y, width, height FROM image_people WHERE media_id = ? AND person_id = ?")
    .get(mediaId, fromPersonId) as { x: number | null; y: number | null; width: number | null; height: number | null } | undefined;
  if (!row) return null;
  const maxRow = db.prepare(
    "SELECT MAX(person_id) as m FROM (SELECT person_id FROM image_people UNION SELECT person_id FROM person_names)"
  ).get() as { m: number | null };
  const newId = (maxRow?.m ?? 0) + 1;
  db.prepare("DELETE FROM image_people WHERE media_id = ? AND person_id = ?").run(mediaId, fromPersonId);
  db.prepare(
    "INSERT INTO image_people (media_id, person_id, x, y, width, height, confidence) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).run(mediaId, newId, row.x, row.y, row.width, row.height, 1);
  db.prepare("INSERT OR IGNORE INTO person_names (person_id, name) VALUES (?, ?)").run(newId, `Person ${newId}`);
  return newId;
}

export function confirmFace(mediaId: string, personId: number): void {
  db.prepare("UPDATE image_people SET confidence = 1 WHERE media_id = ? AND person_id = ?").run(
    mediaId,
    personId
  );
}

export function getTaggedFacesInMedia(mediaId: string): Array<{
  personId: number;
  x: number;
  y: number;
  width: number;
  height: number;
  confidence?: number | null;
}> {
  const rows = db
    .prepare(
      "SELECT person_id as personId, x, y, width, height, confidence FROM image_people WHERE media_id = ? AND x IS NOT NULL AND y IS NOT NULL AND width IS NOT NULL AND height IS NOT NULL"
    )
    .all(mediaId) as Array<{
    personId: number;
    x: number;
    y: number;
    width: number;
    height: number;
    confidence?: number | null;
  }>;
  return rows;
}

export function addPersonToMedia(
  mediaId: string,
  personId: number,
  box: { x: number; y: number; width: number; height: number },
  confidence?: number
): void {
  db.prepare(
    "INSERT INTO image_people (media_id, person_id, x, y, width, height, confidence) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).run(mediaId, personId, box.x, box.y, box.width, box.height, confidence ?? 1);
}

export function createNewPerson(): number {
  const maxRow = db.prepare(
    "SELECT MAX(person_id) as m FROM (SELECT person_id FROM image_people UNION SELECT person_id FROM person_names)"
  ).get() as { m: number | null };
  const newId = (maxRow?.m ?? 0) + 1;
  db.prepare("INSERT OR IGNORE INTO person_names (person_id, name) VALUES (?, ?)").run(newId, `Person ${newId}`);
  return newId;
}

/** Create a person with a name (no photo required). */
export function createPerson(name: string): number {
  const maxRow = db.prepare(
    "SELECT MAX(person_id) as m FROM (SELECT person_id FROM image_people UNION SELECT person_id FROM person_names)"
  ).get() as { m: number | null };
  const newId = (maxRow?.m ?? 0) + 1;
  db.prepare("INSERT INTO person_names (person_id, name) VALUES (?, ?)").run(newId, name.trim());
  return newId;
}

export function getFaceBox(
  mediaId: string,
  personId: number
): { x: number; y: number; width: number; height: number } | null {
  const row = db
    .prepare("SELECT x, y, width, height FROM image_people WHERE media_id = ? AND person_id = ?")
    .get(mediaId, personId) as { x: number; y: number; width: number; height: number } | undefined;
  if (!row || row.x == null || row.y == null || row.width == null || row.height == null) {
    return null;
  }
  return row;
}

export function getMediaForPerson(
  personId: number,
  limit: number
): Array<{ id: string; mimeType: string; x?: number; y?: number; width?: number; height?: number }> {
  return db
    .prepare(
      `SELECT m.id, m.mime_type as mimeType, ip.x, ip.y, ip.width, ip.height
       FROM image_people ip
       JOIN media m ON m.id = ip.media_id
       WHERE ip.person_id = ?
       ORDER BY m.uploaded_at DESC, m.filename ASC
       LIMIT ?`
    )
    .all(personId, limit) as Array<{
    id: string;
    mimeType: string;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
  }>;
}

/** Faces needing review: confidence < 0.75. Excludes manually confirmed (confidence 1) and auto-confident matches. */
export function getFacesNeedingReview(limit: number): Array<{
  mediaId: string;
  personId: number;
  confidence: number | null;
  isSingleFace: boolean;
}> {
  const rows = db
    .prepare(
      `SELECT ip.media_id as mediaId, ip.person_id as personId, ip.confidence,
        (SELECT COUNT(*) FROM image_people ip2 WHERE ip2.person_id = ip.person_id) as clusterSize
       FROM image_people ip
       WHERE ip.x IS NOT NULL AND ip.y IS NOT NULL AND ip.width IS NOT NULL AND ip.height IS NOT NULL
       AND (ip.confidence IS NULL OR ip.confidence < 0.75)
       ORDER BY COALESCE(ip.confidence, 0) ASC
       LIMIT ?`
    )
    .all(limit) as Array<{
    mediaId: string;
    personId: number;
    confidence: number | null;
    clusterSize: number;
  }>;
  return rows.map((r) => ({
    mediaId: r.mediaId,
    personId: r.personId,
    confidence: r.confidence,
    isSingleFace: r.clusterSize === 1,
  }));
}

export function deleteMedia(id: string) {
  db.prepare("DELETE FROM image_people WHERE media_id = ?").run(id);
  db.prepare("DELETE FROM embeddings WHERE media_id = ?").run(id);
  db.prepare("DELETE FROM media WHERE id = ?").run(id);
}

export function getMediaByIds(ids: string[]) {
  if (ids.length === 0) return [];
  const placeholders = ids.map(() => "?").join(",");
  return db
    .prepare(
      `SELECT id, filename, original_name as originalName, mime_type as mimeType, size, uploaded_at as uploadedAt, date_taken as dateTaken
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
  }>;
}
